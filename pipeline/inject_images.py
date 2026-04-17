"""
Manual image injection pipeline.

Injects images into the fashion catalog (Cloudinary + Qdrant) without needing
Pinterest or eBay API access. Use this as the primary way to add new content.

Sources:
  --dir   — directory of local image files (JPEG/PNG/WEBP)
  --csv   — CSV file with columns: url,name,brand,category,gender,color,price,product_url
            'url' can be a local file path or an https:// URL

Usage:
  python inject_images.py --dir /path/to/images/
  python inject_images.py --csv /path/to/items.csv
  python inject_images.py --csv /path/to/items.csv --skip-cloudinary

CSV example row:
  https://example.com/shirt.jpg,Blue Linen Shirt,Zara,Tops,Unisex,Blue,49.99,https://zara.com/shirt
"""
from __future__ import annotations

import argparse
import csv
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

QDRANT_URL        = os.environ["QDRANT_URL"]
QDRANT_API_KEY    = os.environ["QDRANT_API_KEY"]
COLLECTION_NAME   = os.getenv("QDRANT_COLLECTION", "AI-Fashion")
CLIP_MODEL        = os.getenv("CLIP_MODEL", "ViT-B-32")
CLIP_PRETRAINED   = os.getenv("CLIP_PRETRAINED", "openai")
EMBEDDING_DIM     = 512
BATCH_SIZE        = 32
PHASH_THRESHOLD   = 8

CLOUDINARY_CLOUD  = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)


def _load_clip(device: str):
    logger.info("Loading CLIP %s (%s) on %s…", CLIP_MODEL, CLIP_PRETRAINED, device)
    model, _, preprocess = open_clip.create_model_and_transforms(
        CLIP_MODEL, pretrained=CLIP_PRETRAINED
    )
    model.eval().to(device)
    return model, preprocess


def _embed_batch(model, preprocess, images: list[Image.Image], device: str) -> list[list[float]]:
    tensors = torch.stack([preprocess(img) for img in images]).to(device)
    with torch.no_grad():
        vectors = model.encode_image(tensors)
        vectors = vectors / vectors.norm(dim=-1, keepdim=True)
    return vectors.cpu().tolist()


def _phash(image: Image.Image) -> str:
    return str(imagehash.phash(image))


def _is_duplicate(phash: str, seen: dict[str, int]) -> bool:
    h = imagehash.hex_to_hash(phash)
    for existing in seen:
        if h - imagehash.hex_to_hash(existing) <= PHASH_THRESHOLD:
            return True
    return False


def _upload_to_cloudinary(image: Image.Image, product_id: int) -> str:
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
        public_id=f"manual/{product_id}",
        overwrite=False,
        resource_type="image",
    )
    return result["secure_url"]


def _ensure_collection(client: QdrantClient) -> None:
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME in existing:
        return
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=qmodels.VectorParams(size=EMBEDDING_DIM, distance=qmodels.Distance.COSINE),
        hnsw_config=qmodels.HnswConfigDiff(m=16, ef_construct=200, full_scan_threshold=10_000),
        optimizers_config=qmodels.OptimizersConfigDiff(indexing_threshold=20_000),
    )


def _upsert_batch(client: QdrantClient, batch: list[dict]) -> None:
    points = [
        qmodels.PointStruct(
            id=item["product_id"],
            vector=item["vector"],
            payload={k: v for k, v in item.items() if k != "vector"},
        )
        for item in batch
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)


def _flush(model, preprocess, device, client, batch: list[dict]) -> None:
    images = [item.pop("_image") for item in batch]
    vectors = _embed_batch(model, preprocess, images, device)
    for item, vec in zip(batch, vectors):
        item["vector"] = vec
    _upsert_batch(client, batch)


def _load_image_from_source(source: str) -> Image.Image:
    """Load a PIL image from a local path or https:// URL."""
    if source.startswith("http://") or source.startswith("https://"):
        import httpx
        resp = httpx.get(source, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGB")
    return Image.open(source).convert("RGB")


def _make_product_id(source: str) -> int:
    return int(hashlib.md5(source.encode()).hexdigest()[:12], 16) % (2 ** 53)


def run_dir(directory: str, skip_cloudinary: bool) -> None:
    """Inject all supported images from a local directory."""
    image_paths = [
        p for p in Path(directory).iterdir()
        if p.suffix.lower() in SUPPORTED_EXTS
    ]
    if not image_paths:
        logger.error("No supported image files found in %s", directory)
        sys.exit(1)

    logger.info("Found %d images in %s", len(image_paths), directory)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = _load_clip(device)
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    _ensure_collection(client)

    seen: dict[str, int] = {}
    batch: list[dict] = []
    ingested = skipped = 0

    for path in tqdm(image_paths, desc="Injecting", unit="img"):
        try:
            image = Image.open(path).convert("RGB")
        except Exception as e:
            logger.warning("Could not open %s: %s", path.name, e)
            continue

        ph = _phash(image)
        if _is_duplicate(ph, seen):
            skipped += 1
            continue

        product_id = _make_product_id(str(path))
        seen[ph] = product_id

        if skip_cloudinary or not CLOUDINARY_CLOUD:
            image_url = f"https://placeholder.fashion/manual/{product_id}.jpg"
        else:
            try:
                image_url = _upload_to_cloudinary(image, product_id)
            except Exception as e:
                logger.warning("Cloudinary upload failed for %s: %s", path.name, e)
                image_url = f"https://placeholder.fashion/manual/{product_id}.jpg"

        stem = path.stem.replace("_", " ").replace("-", " ").title()
        batch.append({
            "product_id":  product_id,
            "name":        stem,
            "brand":       "",
            "category":    "Fashion",
            "gender":      "Unisex",
            "color":       "",
            "price":       0.0,
            "image_url":   image_url,
            "product_url": "",
            "phash":       ph,
            "source":      "manual",
            "_image":      image,
        })

        if len(batch) >= BATCH_SIZE:
            _flush(model, preprocess, device, client, batch)
            ingested += len(batch)
            batch = []

    if batch:
        _flush(model, preprocess, device, client, batch)
        ingested += len(batch)

    _log_summary(client, ingested, skipped)


def run_csv(csv_path: str, skip_cloudinary: bool) -> None:
    """Inject images from a CSV file. Columns: url,name,brand,category,gender,color,price,product_url"""
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if not rows:
        logger.error("CSV file is empty: %s", csv_path)
        sys.exit(1)

    if "url" not in rows[0]:
        logger.error("CSV must have a 'url' column. Found: %s", list(rows[0].keys()))
        sys.exit(1)

    logger.info("Loaded %d rows from %s", len(rows), csv_path)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = _load_clip(device)
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    _ensure_collection(client)

    seen: dict[str, int] = {}
    batch: list[dict] = []
    ingested = skipped = errors = 0

    for row in tqdm(rows, desc="Injecting", unit="item"):
        url = row.get("url", "").strip()
        if not url:
            continue

        try:
            image = _load_image_from_source(url)
        except Exception as e:
            logger.warning("Could not load image from %s: %s", url, e)
            errors += 1
            continue

        ph = _phash(image)
        if _is_duplicate(ph, seen):
            skipped += 1
            continue

        product_id = _make_product_id(url)
        seen[ph] = product_id

        if skip_cloudinary or not CLOUDINARY_CLOUD:
            image_url = url if url.startswith("http") else f"https://placeholder.fashion/manual/{product_id}.jpg"
        else:
            try:
                image_url = _upload_to_cloudinary(image, product_id)
            except Exception as e:
                logger.warning("Cloudinary upload failed for %s: %s", url, e)
                image_url = url if url.startswith("http") else f"https://placeholder.fashion/manual/{product_id}.jpg"

        def _g(key: str, fallback="") -> str:
            return str(row.get(key, "") or fallback).strip()

        batch.append({
            "product_id":  product_id,
            "name":        _g("name", f"Item {product_id}"),
            "brand":       _g("brand"),
            "category":    _g("category", "Fashion"),
            "gender":      _g("gender", "Unisex"),
            "color":       _g("color"),
            "price":       float(_g("price", "0") or 0),
            "image_url":   image_url,
            "product_url": _g("product_url"),
            "phash":       ph,
            "source":      "manual",
            "_image":      image,
        })

        if len(batch) >= BATCH_SIZE:
            _flush(model, preprocess, device, client, batch)
            ingested += len(batch)
            batch = []

        time.sleep(0.05)  # gentle rate limiting for URL sources

    if batch:
        _flush(model, preprocess, device, client, batch)
        ingested += len(batch)

    if errors:
        logger.warning("Failed to load %d image(s) — check URLs or file paths", errors)
    _log_summary(client, ingested, skipped)


def _log_summary(client: QdrantClient, ingested: int, skipped: int) -> None:
    try:
        total = client.get_collection(COLLECTION_NAME).vectors_count
    except Exception:
        total = "unknown"
    logger.info("=" * 60)
    logger.info("Injection complete.")
    logger.info("  Injected        : %d", ingested)
    logger.info("  Skipped (dupes) : %d", skipped)
    logger.info("  Qdrant total    : %s", total)
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manually inject images into the fashion catalog")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dir", metavar="DIRECTORY", help="Directory of local image files")
    group.add_argument("--csv", metavar="CSV_FILE", help="CSV file with image URLs and metadata")
    parser.add_argument(
        "--skip-cloudinary", action="store_true",
        help="Skip Cloudinary upload — use source URLs directly (CSV) or placeholder URLs (dir)",
    )
    args = parser.parse_args()

    start = time.perf_counter()

    if args.dir:
        run_dir(args.dir, skip_cloudinary=args.skip_cloudinary)
    else:
        run_csv(args.csv, skip_cloudinary=args.skip_cloudinary)

    logger.info("Total time: %.1fs", time.perf_counter() - start)
