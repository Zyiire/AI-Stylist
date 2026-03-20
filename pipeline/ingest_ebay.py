"""
eBay fashion listing ingestion pipeline.

Uses the eBay Browse API (free, no user OAuth required) to search for
clothing listings and ingest them into the Qdrant fashion_products collection.

eBay is used as a Depop-equivalent since Depop has no official public API.
Both are secondhand/resale fashion marketplaces with similar inventory.

Setup:
  1. Create a free account at https://developer.ebay.com
  2. Create an app → get App ID (Client ID) and Cert ID (Client Secret)
  3. Add to your .env:
       EBAY_APP_ID=your_app_id
       EBAY_CERT_ID=your_cert_id

Usage:
  python ingest_ebay.py                                  # all default queries
  python ingest_ebay.py --query "black tie formal" --limit 200
  python ingest_ebay.py --query "streetwear" --limit 100 --dry-run
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import logging
import os
import time
from pathlib import Path

import httpx
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
QDRANT_URL      = os.environ["QDRANT_URL"]
QDRANT_API_KEY  = os.environ["QDRANT_API_KEY"]
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "fashion_products")
CLIP_MODEL      = os.getenv("CLIP_MODEL", "ViT-B-32")
CLIP_PRETRAINED = os.getenv("CLIP_PRETRAINED", "openai")
EMBEDDING_DIM   = 512
BATCH_SIZE      = 32
PHASH_THRESHOLD = 8

EBAY_APP_ID  = os.getenv("EBAY_APP_ID", "")
EBAY_CERT_ID = os.getenv("EBAY_CERT_ID", "")

EBAY_TOKEN_URL  = "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
EBAY_SCOPE      = "https://api.ebay.com/oauth/api_scope"

# eBay category ID for Clothing, Shoes & Accessories
EBAY_FASHION_CATEGORY = "11450"

# Default search queries — mirrors the Pinterest queries for consistent coverage
DEFAULT_QUERIES = [
    "black tie formal dress",
    "cocktail dress",
    "smart casual blazer",
    "streetwear jacket",
    "minimalist fashion top",
    "vintage dress",
    "boho dress",
    "resort wear",
    "work blazer women",
    "date night dress",
    "casual summer dress",
    "athleisure set",
    "avant garde coat",
    "quiet luxury sweater",
    "90s fashion denim",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)


# ── eBay OAuth (client credentials — no user login needed) ───────────────────

_ebay_token_cache: dict = {}


def get_ebay_token() -> str:
    """Get (or refresh) an eBay app-level OAuth token."""
    if not EBAY_APP_ID or not EBAY_CERT_ID:
        logger.error(
            "eBay credentials not configured.\n"
            "  1. Create a free developer account at https://developer.ebay.com\n"
            "  2. Create an app and get your App ID and Cert ID\n"
            "  3. Add to your .env:\n"
            "       EBAY_APP_ID=your_app_id\n"
            "       EBAY_CERT_ID=your_cert_id"
        )
        raise SystemExit(1)

    # Return cached token if still valid (expires in 7200s, refresh with 60s margin)
    cached = _ebay_token_cache
    if cached.get("token") and time.time() < cached.get("expires_at", 0) - 60:
        return cached["token"]

    credentials = base64.b64encode(f"{EBAY_APP_ID}:{EBAY_CERT_ID}".encode()).decode()
    resp = httpx.post(
        EBAY_TOKEN_URL,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials", "scope": EBAY_SCOPE},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    token = data["access_token"]
    _ebay_token_cache["token"] = token
    _ebay_token_cache["expires_at"] = time.time() + data.get("expires_in", 7200)
    logger.info("eBay access token acquired (expires in %ds).", data.get("expires_in", 7200))
    return token


def search_ebay(query: str, limit: int) -> list[dict]:
    """Search eBay Browse API and return up to `limit` item summaries."""
    items: list[dict] = []
    offset = 0
    page_size = min(50, limit)  # eBay max page size is 200, but 50 is fast

    while len(items) < limit:
        token = get_ebay_token()
        try:
            resp = httpx.get(
                EBAY_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
                    "X-EBAY-C-ENDUSERCTX": "contextualLocation=country%3DUS",
                },
                params={
                    "q": query,
                    "category_ids": EBAY_FASHION_CATEGORY,
                    "limit": page_size,
                    "offset": offset,
                    "filter": "conditionIds:{1000|1500|2000|2500|3000}",  # new + used conditions
                    "fieldgroups": "MATCHING_ITEMS",
                },
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning("eBay API error for query '%s': %s", query, e)
            break

        summaries = data.get("itemSummaries", [])
        if not summaries:
            break

        items.extend(summaries)
        total = data.get("total", 0)
        offset += len(summaries)

        if offset >= total:
            break

        time.sleep(0.3)  # polite delay

    return items[:limit]


# ── CLIP helpers ──────────────────────────────────────────────────────────────

def load_clip(device: str):
    logger.info("Loading CLIP %s on %s…", CLIP_MODEL, device)
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


def is_duplicate(phash: str, seen: dict[str, str], threshold: int = PHASH_THRESHOLD) -> bool:
    h = imagehash.hex_to_hash(phash)
    for existing in seen:
        if h - imagehash.hex_to_hash(existing) <= threshold:
            return True
    return False


def download_image(url: str) -> Image.Image | None:
    try:
        resp = httpx.get(url, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception as e:
        logger.debug("Failed to download %s: %s", url, e)
        return None


# ── Qdrant helpers ────────────────────────────────────────────────────────────

def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)


def ensure_source_index(client: QdrantClient) -> None:
    try:
        client.create_payload_index(
            COLLECTION_NAME, "source", field_schema=qmodels.PayloadSchemaType.KEYWORD
        )
    except Exception:
        pass  # index likely already exists


def stable_id(source: str, item_id: str) -> int:
    key = f"{source}:{item_id}"
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**53)


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


def flush_batch(model, preprocess, device: str, client: QdrantClient, batch: list[dict]) -> None:
    images = [item.pop("_image") for item in batch]
    vectors = embed_batch(model, preprocess, images, device)
    for item, vec in zip(batch, vectors):
        item["vector"] = vec
    upsert_batch(client, batch)


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run(queries: list[str], limit_per_query: int, dry_run: bool) -> None:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = load_clip(device)

    client = get_qdrant_client()
    ensure_source_index(client)

    seen_hashes: dict[str, str] = {}
    total_ingested = 0
    total_skipped = 0

    for query in queries:
        logger.info("Searching eBay: '%s' (limit %d)…", query, limit_per_query)
        items = search_ebay(query, limit=limit_per_query)
        logger.info("  Found %d listings", len(items))

        batch_buffer: list[dict] = []

        for item in tqdm(items, desc=f"  {query}", unit="item"):
            item_id = item.get("itemId", "")
            image_info = item.get("image", {})
            image_url = image_info.get("imageUrl", "")
            if not image_url:
                continue

            image = download_image(image_url)
            if image is None:
                continue

            phash = perceptual_hash(image)
            if is_duplicate(phash, seen_hashes):
                total_skipped += 1
                continue
            seen_hashes[phash] = item_id

            if dry_run:
                logger.info("    [DRY RUN] Would ingest: %s — $%s",
                            item.get("title", ""), item.get("price", {}).get("value", "?"))
                continue

            # Parse price
            price_info = item.get("price", {})
            try:
                price = float(price_info.get("value", 0))
            except (ValueError, TypeError):
                price = 0.0

            # Parse category
            categories = item.get("categories", [])
            category = categories[0].get("categoryName", "Clothing") if categories else "Clothing"

            # Parse seller (brand equivalent)
            seller = item.get("seller", {}).get("username", "")

            product_id = stable_id("ebay", item_id)
            record: dict = {
                "product_id":  product_id,
                "name":        item.get("title", f"eBay item {item_id}"),
                "brand":       seller,
                "category":    category,
                "gender":      "Unisex",
                "color":       "",
                "price":       price,
                "image_url":   image_url,
                "product_url": item.get("itemWebUrl", f"https://www.ebay.com/itm/{item_id}"),
                "phash":       phash,
                "source":      "ebay",
                "style_tag":   query,
                "_image":      image,
            }
            batch_buffer.append(record)

            if len(batch_buffer) >= BATCH_SIZE:
                flush_batch(model, preprocess, device, client, batch_buffer)
                total_ingested += len(batch_buffer)
                batch_buffer = []

        if batch_buffer:
            flush_batch(model, preprocess, device, client, batch_buffer)
            total_ingested += len(batch_buffer)
            batch_buffer = []

    if not dry_run:
        info = client.get_collection(COLLECTION_NAME)
        logger.info("=" * 60)
        logger.info("eBay ingestion complete.")
        logger.info("  Ingested       : %d", total_ingested)
        logger.info("  Skipped (dupes): %d", total_skipped)
        logger.info("  Qdrant total   : %d", info.vectors_count)
        logger.info("=" * 60)
    else:
        logger.info("[DRY RUN] No data written.")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="eBay fashion listing ingestion pipeline")
    parser.add_argument(
        "--query", type=str, default=None,
        help="Single search query (default: run all predefined queries)"
    )
    parser.add_argument(
        "--limit", type=int, default=100,
        help="Max listings to fetch per query (default: 100)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch and log listings without writing to Qdrant"
    )
    args = parser.parse_args()

    queries = [args.query] if args.query else DEFAULT_QUERIES
    start = time.perf_counter()
    run(queries=queries, limit_per_query=args.limit, dry_run=args.dry_run)
    logger.info("Total time: %.1fs", time.perf_counter() - start)
