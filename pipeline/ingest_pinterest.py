"""
Pinterest pin ingestion pipeline.

Searches Pinterest for fashion style queries and ingests the pin images
into the same Qdrant collection used by the main fashion search app.

Authentication:
  Requires a Pinterest access token. Get one from:
    https://developers.pinterest.com → My Apps → your app → Generate Access Token
  Then add to your .env:
    PINTEREST_ACCESS_TOKEN=your_token_here

  For a long-lived token, also set PINTEREST_REFRESH_TOKEN and PINTEREST_APP_ID /
  PINTEREST_APP_SECRET so the script can auto-refresh.

Usage:
  python ingest_pinterest.py                           # all style queries
  python ingest_pinterest.py --query "black tie" --limit 100
  python ingest_pinterest.py --query "streetwear" --limit 50 --dry-run
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

import httpx
import imagehash
import open_clip
import torch
from PIL import Image
from dotenv import load_dotenv, set_key
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
BATCH_SIZE        = 32
PHASH_THRESHOLD   = 8

PINTEREST_ACCESS_TOKEN  = os.getenv("PINTEREST_ACCESS_TOKEN", "")
PINTEREST_REFRESH_TOKEN = os.getenv("PINTEREST_REFRESH_TOKEN", "")
PINTEREST_APP_ID        = os.getenv("PINTEREST_APP_ID", "")
PINTEREST_APP_SECRET    = os.getenv("PINTEREST_APP_SECRET", "")

PINTEREST_API_BASE = "https://api.pinterest.com/v5"

# Fashion style queries to ingest — covers the most common search intents
DEFAULT_QUERIES = [
    "black tie outfit",
    "cocktail dress",
    "smart casual outfit",
    "streetwear style",
    "minimalist fashion",
    "vintage fashion outfit",
    "boho chic outfit",
    "resort wear",
    "workwear outfit",
    "date night outfit",
    "casual summer outfit",
    "athleisure style",
    "avant garde fashion",
    "quiet luxury outfit",
    "90s fashion style",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)

ENV_PATH = Path(__file__).parent.parent / ".env"


# ── Pinterest API ─────────────────────────────────────────────────────────────

def get_access_token() -> str:
    """Return a valid access token, refreshing if possible."""
    token = PINTEREST_ACCESS_TOKEN
    if token:
        return token

    if PINTEREST_REFRESH_TOKEN and PINTEREST_APP_ID and PINTEREST_APP_SECRET:
        logger.info("Refreshing Pinterest access token…")
        refreshed = _refresh_token()
        if refreshed:
            return refreshed

    logger.error(
        "No Pinterest access token found.\n"
        "  1. Go to https://developers.pinterest.com → My Apps → your app\n"
        "  2. Generate an Access Token with 'pins:read' and 'boards:read' scopes\n"
        "  3. Add to your .env:  PINTEREST_ACCESS_TOKEN=your_token_here"
    )
    sys.exit(1)


def _refresh_token() -> str | None:
    try:
        resp = httpx.post(
            f"{PINTEREST_API_BASE}/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": PINTEREST_REFRESH_TOKEN,
                "scope": "pins:read boards:read",
            },
            auth=(PINTEREST_APP_ID, PINTEREST_APP_SECRET),
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        new_token = data["access_token"]
        new_refresh = data.get("refresh_token", PINTEREST_REFRESH_TOKEN)
        # Persist updated tokens
        set_key(str(ENV_PATH), "PINTEREST_ACCESS_TOKEN", new_token)
        set_key(str(ENV_PATH), "PINTEREST_REFRESH_TOKEN", new_refresh)
        logger.info("Pinterest token refreshed and saved.")
        return new_token
    except Exception as e:
        logger.warning("Token refresh failed: %s", e)
        return None


def search_pins(query: str, access_token: str, limit: int) -> list[dict]:
    """Fetch up to `limit` pins for a given query using cursor pagination."""
    headers = {"Authorization": f"Bearer {access_token}"}
    pins: list[dict] = []
    bookmark: str | None = None
    page_size = min(25, limit)

    while len(pins) < limit:
        params: dict = {"query": query, "page_size": page_size}
        if bookmark:
            params["bookmark"] = bookmark

        try:
            resp = httpx.get(
                f"{PINTEREST_API_BASE}/search/pins",
                headers=headers,
                params=params,
                timeout=20,
            )
            if resp.status_code == 401:
                logger.error("Pinterest token is invalid or expired. Re-authenticate.")
                break
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning("Pinterest API error for query '%s': %s", query, e)
            break

        items = data.get("items", [])
        if not items:
            break

        pins.extend(items)
        bookmark = data.get("bookmark")
        if not bookmark:
            break

        time.sleep(0.5)  # respect rate limits

    return pins[:limit]


def extract_image_url(pin: dict) -> str | None:
    """Extract the best available image URL from a pin."""
    media = pin.get("media", {})
    images = media.get("images", {})
    # Prefer originals, fall back to 1200x
    for key in ("originals", "1200x", "600x", "150x150"):
        img = images.get(key)
        if img and img.get("url"):
            return img["url"]
    return None


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
    """Add 'source' payload index if not already present."""
    try:
        client.create_payload_index(
            COLLECTION_NAME, "source", field_schema=qmodels.PayloadSchemaType.KEYWORD
        )
    except Exception:
        pass  # index likely already exists


def stable_id(source: str, item_id: str) -> int:
    """Generate a stable 53-bit integer ID from source + item identifier."""
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

    access_token = get_access_token()
    client = get_qdrant_client()
    ensure_source_index(client)

    seen_hashes: dict[str, str] = {}  # phash → pin_id
    total_ingested = 0
    total_skipped = 0

    for query in queries:
        logger.info("Searching Pinterest: '%s' (limit %d)…", query, limit_per_query)
        pins = search_pins(query, access_token, limit=limit_per_query)
        logger.info("  Found %d pins", len(pins))

        batch_buffer: list[dict] = []

        for pin in tqdm(pins, desc=f"  {query}", unit="pin"):
            pin_id = pin.get("id", "")
            image_url = extract_image_url(pin)
            if not image_url:
                continue

            image = download_image(image_url)
            if image is None:
                continue

            phash = perceptual_hash(image)
            if is_duplicate(phash, seen_hashes):
                total_skipped += 1
                continue
            seen_hashes[phash] = pin_id

            if dry_run:
                logger.info("    [DRY RUN] Would ingest pin %s: %s", pin_id, pin.get("title", ""))
                continue

            product_id = stable_id("pinterest", pin_id)
            # Derive a style tag from the query (e.g. "black tie outfit" → "black tie")
            style_tag = query.replace(" outfit", "").replace(" style", "").strip()

            item: dict = {
                "product_id":  product_id,
                "name":        pin.get("title") or style_tag.title(),
                "brand":       "",
                "category":    "Outfit",
                "gender":      "Unisex",
                "color":       "",
                "price":       0.0,
                "image_url":   image_url,
                "product_url": pin.get("link") or f"https://www.pinterest.com/pin/{pin_id}/",
                "phash":       phash,
                "source":      "pinterest",
                "style_tag":   style_tag,
                "_image":      image,
            }
            batch_buffer.append(item)

            if len(batch_buffer) >= BATCH_SIZE:
                flush_batch(model, preprocess, device, client, batch_buffer)
                total_ingested += len(batch_buffer)
                batch_buffer = []

        # Flush remainder for this query
        if batch_buffer:
            flush_batch(model, preprocess, device, client, batch_buffer)
            total_ingested += len(batch_buffer)
            batch_buffer = []

    if not dry_run:
        info = client.get_collection(COLLECTION_NAME)
        logger.info("=" * 60)
        logger.info("Pinterest ingestion complete.")
        logger.info("  Ingested       : %d", total_ingested)
        logger.info("  Skipped (dupes): %d", total_skipped)
        logger.info("  Qdrant total   : %d", info.vectors_count)
        logger.info("=" * 60)
    else:
        logger.info("[DRY RUN] No data written.")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pinterest pin ingestion pipeline")
    parser.add_argument(
        "--query", type=str, default=None,
        help="Single style query (default: run all predefined queries)"
    )
    parser.add_argument(
        "--limit", type=int, default=100,
        help="Max pins to fetch per query (default: 100)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch and log pins without writing to Qdrant"
    )
    args = parser.parse_args()

    queries = [args.query] if args.query else DEFAULT_QUERIES
    start = time.perf_counter()
    run(queries=queries, limit_per_query=args.limit, dry_run=args.dry_run)
    logger.info("Total time: %.1fs", time.perf_counter() - start)
