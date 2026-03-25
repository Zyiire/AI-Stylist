"""
Catalog ingestion pipeline.

Sources:
  hf     — HuggingFace fashion datasets (default)
  pexels — Pexels photo API (curated fashion queries)

Usage:
  python ingest.py                                          # default HF dataset, all items
  python ingest.py --limit 500                             # default HF dataset, 500 items
  python ingest.py --dataset DBQ/Fashion.Product.Image.Dataset --limit 500
  python ingest.py --dataset keremberke/fashion-product-image-classification --limit 500
  python ingest.py --source pexels --limit 200             # Pexels fashion photos
  python ingest.py --source pexels --skip-cloudinary       # use Pexels URLs directly

Requirements:
  Copy .env from project root into pipeline/ or set env vars directly.
  For Pexels: set PEXELS_API_KEY in .env
"""
from __future__ import annotations

import argparse
import hashlib
import io
import logging
import os
import sys
import time
from pathlib import Path

import imagehash
import open_clip
import torch
from PIL import Image
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from tqdm import tqdm

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Config ────────────────────────────────────────────────────────────────────
QDRANT_URL        = os.environ["QDRANT_URL"]
QDRANT_API_KEY    = os.environ["QDRANT_API_KEY"]
COLLECTION_NAME   = os.getenv("QDRANT_COLLECTION", "AI-Fashion")
CLIP_MODEL        = os.getenv("CLIP_MODEL", "ViT-B-32")
CLIP_PRETRAINED   = os.getenv("CLIP_PRETRAINED", "openai")
EMBEDDING_DIM     = 512
BATCH_SIZE        = 64
PHASH_THRESHOLD   = 8

CLOUDINARY_CLOUD  = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

PEXELS_API_KEY    = os.getenv("PEXELS_API_KEY", "")

# ── Available HuggingFace datasets ────────────────────────────────────────────
# Each entry maps dataset field names → our standard schema fields.
HF_DATASETS: dict[str, dict] = {
    "ashraq/fashion-product-images-small": {
        "name":     "productDisplayName",
        "brand":    "brand",
        "category": "subCategory",
        "gender":   "gender",
        "color":    "baseColour",
        "price":    "price",
        "link":     "link",
        "split":    "train",
    },
    "DBQ/Fashion.Product.Image.Dataset": {
        "name":     "name",
        "brand":    "brand",
        "category": "Category",
        "gender":   "gender",
        "color":    "colour",
        "price":    "price",
        "link":     "url",
        "split":    "train",
    },
    "keremberke/fashion-product-image-classification": {
        "name":     "label",
        "brand":    None,
        "category": "label",
        "gender":   None,
        "color":    None,
        "price":    None,
        "link":     None,
        "split":    "train",
    },
}
DEFAULT_HF_DATASET = "ashraq/fashion-product-images-small"

# Pexels search queries — combined results build a diverse fashion catalog
PEXELS_QUERIES = [
    "fashion outfit",
    "street style clothing",
    "women dress fashion",
    "men fashion style",
    "luxury fashion",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)


# ── Shared helpers ────────────────────────────────────────────────────────────

def load_clip(device: str):
    logger.info("Loading CLIP %s (%s) on %s…", CLIP_MODEL, CLIP_PRETRAINED, device)
    model, _, preprocess = open_clip.create_model_and_transforms(
        CLIP_MODEL, pretrained=CLIP_PRETRAINED
    )
    model.eval().to(device)
    return model, preprocess


def embed_batch(model, preprocess, images: list[Image.Image], device: str) -> list[list[float]]:
    tensors = torch.stack([preprocess(img) for img in images]).to(device)
    with torch.no_grad():
        vectors = model.encode_image(tensors)
        vectors = vectors / vectors.norm(dim=-1, keepdim=True)
    return vectors.cpu().tolist()


def perceptual_hash(image: Image.Image) -> str:
    return str(imagehash.phash(image))


def is_duplicate(phash: str, seen: dict[str, int], threshold: int = PHASH_THRESHOLD) -> bool:
    h = imagehash.hex_to_hash(phash)
    for existing_hash in seen:
        if h - imagehash.hex_to_hash(existing_hash) <= threshold:
            return True
    return False


def upload_to_cloudinary(image: Image.Image, product_id: int, folder: str = "fashion") -> str:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD,
        api_key=CLOUDINARY_KEY,
        api_secret=CLOUDINARY_SECRET,
    )
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    result = cloudinary.uploader.upload(
        buf,
        public_id=f"{folder}/{product_id}",
        overwrite=False,
        resource_type="image",
    )
    return result["secure_url"]


def ensure_collection(client: QdrantClient) -> None:
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME in existing:
        logger.info("Collection '%s' exists — will upsert into it.", COLLECTION_NAME)
        return
    logger.info("Creating collection '%s'…", COLLECTION_NAME)
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=qmodels.VectorParams(size=EMBEDDING_DIM, distance=qmodels.Distance.COSINE),
        hnsw_config=qmodels.HnswConfigDiff(m=16, ef_construct=200, full_scan_threshold=10_000),
        optimizers_config=qmodels.OptimizersConfigDiff(indexing_threshold=20_000),
    )
    for field, schema in [
        ("category", qmodels.PayloadSchemaType.KEYWORD),
        ("gender",   qmodels.PayloadSchemaType.KEYWORD),
        ("color",    qmodels.PayloadSchemaType.KEYWORD),
        ("source",   qmodels.PayloadSchemaType.KEYWORD),
        ("price",    qmodels.PayloadSchemaType.FLOAT),
    ]:
        client.create_payload_index(COLLECTION_NAME, field, field_schema=schema)
    logger.info("Collection created.")


def upsert_batch(client: QdrantClient, batch: list[dict]) -> None:
    points = [
        qmodels.PointStruct(
            id=item["product_id"],
            vector=item["vector"],
            payload={k: v for k, v in item.items() if k != "vector"},
        )
        for item in batch
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)


def _flush_batch(model, preprocess, device, client, batch: list[dict]) -> None:
    images = [item.pop("_image") for item in batch]
    vectors = embed_batch(model, preprocess, images, device)
    for item, vec in zip(batch, vectors):
        item["vector"] = vec
    upsert_batch(client, batch)


# ── HuggingFace pipeline ──────────────────────────────────────────────────────

def run_hf(dataset_name: str, limit: int | None, skip_cloudinary: bool) -> None:
    from datasets import load_dataset

    if dataset_name not in HF_DATASETS:
        logger.warning(
            "Unknown dataset '%s'. Available:\n  %s",
            dataset_name,
            "\n  ".join(HF_DATASETS),
        )
        logger.warning("Proceeding anyway with default field mapping.")

    field_map = HF_DATASETS.get(dataset_name, HF_DATASETS[DEFAULT_HF_DATASET])
    split = field_map.get("split", "train")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = load_clip(device)

    logger.info("Loading HuggingFace dataset '%s' (split=%s)…", dataset_name, split)
    ds = load_dataset(dataset_name, split=split)
    if limit:
        ds = ds.select(range(min(limit, len(ds))))
    logger.info("Dataset loaded: %d items", len(ds))

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    ensure_collection(client)

    seen_hashes: dict[str, int] = {}
    batch_buffer: list[dict] = []
    skipped_dupes = 0
    ingested = 0

    pbar = tqdm(total=len(ds), desc=f"Ingesting {dataset_name}", unit="item")

    for idx, row in enumerate(ds):
        try:
            image: Image.Image = row["image"].convert("RGB")
        except Exception:
            pbar.update(1)
            continue

        phash = perceptual_hash(image)
        if is_duplicate(phash, seen_hashes):
            skipped_dupes += 1
            pbar.update(1)
            continue

        product_id = abs(hash(f"hf_{dataset_name}_{idx}")) % (2 ** 53)
        seen_hashes[phash] = product_id

        if skip_cloudinary or not CLOUDINARY_CLOUD:
            image_url = f"https://placeholder.fashion/product/{product_id}.jpg"
        else:
            try:
                image_url = upload_to_cloudinary(image, product_id, folder="fashion")
            except Exception as e:
                logger.warning("Cloudinary upload failed for %d: %s", product_id, e)
                image_url = f"https://placeholder.fashion/product/{product_id}.jpg"

        def _get(field_key: str | None, fallback="") -> str:
            if field_key is None:
                return fallback
            return str(row.get(field_key, "") or fallback)

        item = {
            "product_id":  product_id,
            "name":        _get(field_map["name"], f"Product {product_id}"),
            "brand":       _get(field_map["brand"]),
            "category":    _get(field_map["category"], "Fashion"),
            "gender":      _get(field_map["gender"], "Unisex"),
            "color":       _get(field_map["color"]),
            "price":       float(row.get(field_map["price"] or "", 0) or 0) if field_map.get("price") else 0.0,
            "image_url":   image_url,
            "product_url": _get(field_map["link"]),
            "phash":       phash,
            "source":      "hf",
        }

        item["_image"] = image
        batch_buffer.append(item)

        if len(batch_buffer) >= BATCH_SIZE:
            _flush_batch(model, preprocess, device, client, batch_buffer)
            ingested += len(batch_buffer)
            batch_buffer = []

        pbar.update(1)

    if batch_buffer:
        _flush_batch(model, preprocess, device, client, batch_buffer)
        ingested += len(batch_buffer)

    pbar.close()
    _log_summary(client, ingested, skipped_dupes)


# ── Pexels pipeline ───────────────────────────────────────────────────────────

def _fetch_pexels_photos(query: str, limit: int) -> list[dict]:
    """Fetch up to `limit` photos from Pexels for a given query."""
    import httpx

    if not PEXELS_API_KEY:
        raise RuntimeError("PEXELS_API_KEY is not set in .env")

    photos = []
    page = 1
    per_page = min(80, limit)
    headers = {"Authorization": PEXELS_API_KEY}

    while len(photos) < limit:
        resp = httpx.get(
            "https://api.pexels.com/v1/search",
            headers=headers,
            params={"query": query, "per_page": per_page, "page": page, "orientation": "portrait"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("photos", [])
        if not batch:
            break
        photos.extend(batch)
        if not data.get("next_page"):
            break
        page += 1
        time.sleep(0.3)  # stay well under rate limit

    return photos[:limit]


def run_pexels(limit: int | None, skip_cloudinary: bool) -> None:
    import httpx

    if not PEXELS_API_KEY:
        logger.error("PEXELS_API_KEY is not set. Add it to your .env and try again.")
        sys.exit(1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = load_clip(device)

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    ensure_collection(client)

    per_query = (limit // len(PEXELS_QUERIES) + 1) if limit else 80
    seen_hashes: dict[str, int] = {}
    batch_buffer: list[dict] = []
    skipped_dupes = 0
    ingested = 0

    for query in PEXELS_QUERIES:
        logger.info("Fetching Pexels photos for query: '%s'", query)
        try:
            photos = _fetch_pexels_photos(query, per_query)
        except Exception as e:
            logger.warning("Pexels fetch failed for '%s': %s", query, e)
            continue

        pbar = tqdm(photos, desc=f"  '{query}'", unit="photo")

        for photo in pbar:
            img_url = photo["src"]["large2x"]

            # Download image
            try:
                resp = httpx.get(img_url, timeout=20, follow_redirects=True)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content)).convert("RGB")
            except Exception as e:
                logger.warning("Failed to download photo %s: %s", photo["id"], e)
                continue

            phash = perceptual_hash(image)
            if is_duplicate(phash, seen_hashes):
                skipped_dupes += 1
                continue

            product_id = photo["id"]
            seen_hashes[phash] = product_id

            if skip_cloudinary or not CLOUDINARY_CLOUD:
                final_url = img_url
            else:
                try:
                    final_url = upload_to_cloudinary(image, product_id, folder="pexels")
                except Exception as e:
                    logger.warning("Cloudinary upload failed for %d: %s", product_id, e)
                    final_url = img_url

            alt = photo.get("alt", "") or f"Fashion photo by {photo['photographer']}"
            item = {
                "product_id":  product_id,
                "name":        alt[:120],
                "brand":       photo["photographer"],
                "category":    "Fashion",
                "gender":      "Unisex",
                "color":       "",
                "price":       0.0,
                "image_url":   final_url,
                "product_url": photo["url"],
                "phash":       phash,
                "source":      "pexels",
            }

            item["_image"] = image
            batch_buffer.append(item)

            if len(batch_buffer) >= BATCH_SIZE:
                _flush_batch(model, preprocess, device, client, batch_buffer)
                ingested += len(batch_buffer)
                batch_buffer = []

        pbar.close()

        if limit and ingested >= limit:
            break

    if batch_buffer:
        _flush_batch(model, preprocess, device, client, batch_buffer)
        ingested += len(batch_buffer)

    _log_summary(client, ingested, skipped_dupes)


# ── Shared summary ────────────────────────────────────────────────────────────

def _log_summary(client: QdrantClient, ingested: int, skipped_dupes: int) -> None:
    try:
        info = client.get_collection(COLLECTION_NAME)
        total = info.vectors_count
    except Exception:
        total = "unknown"
    logger.info("=" * 60)
    logger.info("Ingestion complete.")
    logger.info("  Ingested        : %d", ingested)
    logger.info("  Skipped (dupes) : %d", skipped_dupes)
    logger.info("  Qdrant total    : %s", total)
    logger.info("=" * 60)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fashion catalog ingestion pipeline")
    parser.add_argument(
        "--source", choices=["hf", "pexels"], default="hf",
        help="Data source: 'hf' (HuggingFace dataset) or 'pexels' (Pexels API). Default: hf",
    )
    parser.add_argument(
        "--dataset", default=DEFAULT_HF_DATASET,
        help=(
            f"HuggingFace dataset name (only used with --source hf). "
            f"Default: {DEFAULT_HF_DATASET}. "
            f"Available: {', '.join(HF_DATASETS)}"
        ),
    )
    parser.add_argument("--limit", type=int, default=None,
                        help="Max items to ingest (default: all)")
    parser.add_argument("--skip-cloudinary", action="store_true",
                        help="Skip Cloudinary upload — use source URLs directly")
    args = parser.parse_args()

    start = time.perf_counter()

    if args.source == "pexels":
        run_pexels(limit=args.limit, skip_cloudinary=args.skip_cloudinary)
    else:
        run_hf(
            dataset_name=args.dataset,
            limit=args.limit,
            skip_cloudinary=args.skip_cloudinary,
        )

    logger.info("Total time: %.1fs", time.perf_counter() - start)
