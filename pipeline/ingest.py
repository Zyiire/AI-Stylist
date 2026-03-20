"""
Catalog ingestion pipeline.

Steps:
  1. Load the fashion dataset from Hugging Face
  2. Upload each image to Cloudinary (persistent CDN URLs)
  3. Generate a perceptual hash → skip near-duplicate images
  4. Encode each image with CLIP (ViT-B/32)
  5. Upsert vectors + metadata into Qdrant in batches

Usage:
  python ingest.py                      # ingest full dataset
  python ingest.py --limit 1000         # quick smoke test (1k items)
  python ingest.py --limit 5000 --skip-cloudinary  # local URLs, faster

Requirements:
  Copy .env from project root into pipeline/ or set env vars directly.
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
COLLECTION_NAME   = os.getenv("QDRANT_COLLECTION", "fashion_products")
CLIP_MODEL        = os.getenv("CLIP_MODEL", "ViT-B-32")
CLIP_PRETRAINED   = os.getenv("CLIP_PRETRAINED", "openai")
EMBEDDING_DIM     = 512
BATCH_SIZE        = 64          # upsert batch size
PHASH_THRESHOLD   = 8           # Hamming distance; images closer than this are dupes
HF_DATASET        = "ashraq/fashion-product-images-small"

CLOUDINARY_CLOUD  = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

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
    """Return True if this hash is too close to an already-seen hash."""
    h = imagehash.hex_to_hash(phash)
    for existing_hash in seen:
        if h - imagehash.hex_to_hash(existing_hash) <= threshold:
            return True
    return False


def upload_to_cloudinary(image: Image.Image, product_id: int) -> str:
    """Upload PIL image to Cloudinary, return secure URL."""
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
        public_id=f"fashion/{product_id}",
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


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run(limit: int | None, skip_cloudinary: bool) -> None:
    from datasets import load_dataset

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = load_clip(device)

    logger.info("Loading dataset '%s'…", HF_DATASET)
    ds = load_dataset(HF_DATASET, split="train")
    if limit:
        ds = ds.select(range(min(limit, len(ds))))
    logger.info("Dataset loaded: %d items", len(ds))

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    ensure_collection(client)

    seen_hashes: dict[str, int] = {}   # phash → product_id
    batch_buffer: list[dict] = []
    skipped_dupes = 0
    ingested = 0

    pbar = tqdm(total=len(ds), desc="Ingesting", unit="item")

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

        product_id = idx + 1
        seen_hashes[phash] = product_id

        # Upload to Cloudinary (or use a placeholder for local testing)
        if skip_cloudinary or not CLOUDINARY_CLOUD:
            image_url = f"https://placeholder.fashion/product/{product_id}.jpg"
        else:
            try:
                image_url = upload_to_cloudinary(image, product_id)
            except Exception as e:
                logger.warning("Cloudinary upload failed for %d: %s", product_id, e)
                image_url = f"https://placeholder.fashion/product/{product_id}.jpg"

        # Build metadata from dataset columns (adapt field names to your dataset)
        item = {
            "product_id":  product_id,
            "name":        row.get("productDisplayName", row.get("name", f"Product {product_id}")),
            "brand":       row.get("brand", ""),
            "category":    row.get("subCategory", row.get("category", "Unknown")),
            "gender":      row.get("gender", "Unisex"),
            "color":       row.get("baseColour", row.get("color", "")),
            "price":       float(row.get("price", 0) or 0),
            "image_url":   image_url,
            "product_url": row.get("link", ""),
            "phash":       phash,
        }

        # Accumulate into batch for embedding
        item["_image"] = image
        batch_buffer.append(item)

        if len(batch_buffer) >= BATCH_SIZE:
            _flush_batch(model, preprocess, device, client, batch_buffer)
            ingested += len(batch_buffer)
            batch_buffer = []

        pbar.update(1)

    # Flush remainder
    if batch_buffer:
        _flush_batch(model, preprocess, device, client, batch_buffer)
        ingested += len(batch_buffer)

    pbar.close()

    info = client.get_collection(COLLECTION_NAME)
    logger.info("=" * 60)
    logger.info("Ingestion complete.")
    logger.info("  Ingested : %d", ingested)
    logger.info("  Skipped (dupes): %d", skipped_dupes)
    logger.info("  Qdrant vectors : %d", info.vectors_count)
    logger.info("=" * 60)


def _flush_batch(model, preprocess, device, client, batch: list[dict]) -> None:
    images = [item.pop("_image") for item in batch]
    vectors = embed_batch(model, preprocess, images, device)
    for item, vec in zip(batch, vectors):
        item["vector"] = vec
    upsert_batch(client, batch)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fashion catalog ingestion pipeline")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max items to ingest (default: all)")
    parser.add_argument("--skip-cloudinary", action="store_true",
                        help="Skip Cloudinary upload (use placeholder URLs)")
    args = parser.parse_args()

    start = time.perf_counter()
    run(limit=args.limit, skip_cloudinary=args.skip_cloudinary)
    logger.info("Total time: %.1fs", time.perf_counter() - start)
