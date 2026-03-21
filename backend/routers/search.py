"""
Search router — the core API surface.

Endpoints:
  POST /search/image   – visual search from uploaded photo
  POST /search/text    – text-to-image search ("blue floral dress")
  POST /search/feedback – record click-through for future re-ranking
  GET  /product/{id}   – fetch a single product by ID
  GET  /health         – liveness check
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field

from limiter import limiter
from services import clip_service, qdrant_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])

# Simple in-memory feedback store (swap for Redis or Postgres in prod)
_feedback_log: list[dict] = []


# ── Request / Response models ─────────────────────────────────────────────────

class SearchFilters(BaseModel):
    category: list[str] | None = None
    gender: list[str] | None = None
    color: list[str] | None = None
    price_min: float | None = None
    price_max: float | None = None
    source: list[str] | None = Field(
        default=None,
        description="Filter by data source: 'pinterest', 'ebay', or 'hf' (HuggingFace dataset)"
    )


class ProductResult(BaseModel):
    product_id: int
    name: str
    brand: str | None = None
    category: str | None = None
    color: str | None = None
    price: float | None = None
    image_url: str
    product_url: str | None = None
    score: float = Field(description="Cosine similarity to query (0–1)")


class SearchResponse(BaseModel):
    results: list[ProductResult]
    total: int
    latency_ms: float


class TextSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    top_k: int = Field(default=24, ge=1, le=100)
    filters: SearchFilters | None = None


class FeedbackRequest(BaseModel):
    query_id: str
    clicked_product_id: int
    rank: int = Field(description="Position of clicked result (0-indexed)")


class FeedResponse(BaseModel):
    items: list[ProductResult]
    total: int
    next_offset: int | None = None


class UploadResponse(BaseModel):
    product_id: int
    image_url: str
    message: str


# ── Helpers (defined before endpoints so static analysis resolves them) ────────

def _validate_image_upload(file: UploadFile) -> None:
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Use JPEG, PNG, or WEBP.",
        )


def _upload_to_cloudinary(image_bytes: bytes, product_id: int) -> str:
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
            api_key=os.getenv("CLOUDINARY_API_KEY", ""),
            api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
        )
        result = cloudinary.uploader.upload(
            image_bytes,
            public_id=f"community/{product_id}",
            overwrite=False,
            resource_type="image",
        )
        return result["secure_url"]
    except Exception:
        return f"https://placeholder.fashion/community/{product_id}.jpg"


def _build_filters(
    category: list[str] | None,
    gender: str | None,
    color: list[str] | None,
    price_min: float | None,
    price_max: float | None,
    source: list[str] | None = None,
) -> dict:
    filters = {}
    if category:
        filters["category"] = category
    if gender:
        filters["gender"] = gender
    if color:
        filters["color"] = color
    if source:
        filters["source"] = source
    if price_min is not None or price_max is not None:
        price_range = {}
        if price_min is not None:
            price_range["gte"] = price_min
        if price_max is not None:
            price_range["lte"] = price_max
        filters["price"] = price_range
    return filters


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/image", response_model=SearchResponse)
@limiter.limit("20/minute")
async def search_by_image(
    request: Request,
    file: Annotated[UploadFile, File(description="Clothing image to search with")],
    top_k: int = Query(default=24, ge=1, le=100),
    category: list[str] | None = Query(default=None),
    gender: str | None = Query(default=None),
    color: str | None = Query(default=None),
    price_min: float | None = Query(default=None),
    price_max: float | None = Query(default=None),
):
    """
    Upload a clothing photo and return visually similar products from the catalog.

    Accepts JPEG, PNG, WEBP. Max 10MB.
    """
    _validate_image_upload(file)
    start = time.perf_counter()

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be under 10MB.")

    try:
        vector = clip_service.embed_image_bytes(image_bytes)
    except Exception as exc:
        logger.exception("CLIP embedding failed")
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")

    filters = _build_filters(category, gender, color, price_min, price_max)
    hits = qdrant_service.search(vector, top_k=top_k, filters=filters or None)

    latency_ms = (time.perf_counter() - start) * 1000
    logger.info("Image search completed in %.1fms, %d results", latency_ms, len(hits))

    return SearchResponse(
        results=[ProductResult(**h) for h in hits],
        total=len(hits),
        latency_ms=round(latency_ms, 1),
    )


@router.post("/text", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search_by_text(request: Request, body: TextSearchRequest):
    """
    Search the catalog using a text description.
    Example: "oversized beige linen blazer" or "red floral midi dress".
    """
    start = time.perf_counter()

    try:
        vector = clip_service.embed_text(body.query)
    except Exception as exc:
        logger.exception("Text embedding failed")
        raise HTTPException(status_code=422, detail=f"Could not encode query: {exc}")

    filters = _build_filters(
        body.filters.category if body.filters else None,
        body.filters.gender if body.filters else None,
        body.filters.color if body.filters else None,
        body.filters.price_min if body.filters else None,
        body.filters.price_max if body.filters else None,
        body.filters.source if body.filters else None,
    ) if body.filters else None

    hits = qdrant_service.search(vector, top_k=body.top_k, filters=filters or None)

    latency_ms = (time.perf_counter() - start) * 1000
    return SearchResponse(
        results=[ProductResult(**h) for h in hits],
        total=len(hits),
        latency_ms=round(latency_ms, 1),
    )


@router.post("/feedback", status_code=204)
async def record_feedback(body: FeedbackRequest):
    """
    Record a user click-through for offline re-ranking and personalisation.
    In production this feeds a feedback loop (e.g. BPR or LambdaRank model).
    """
    _feedback_log.append(body.model_dump())
    # TODO: flush to persistent store (Postgres / Redis stream)
    return None


@router.get("/product/{product_id}", response_model=ProductResult)
async def get_product(product_id: int):
    product = qdrant_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return ProductResult(**product)


@router.get("/feed", response_model=FeedResponse)
@limiter.limit("60/minute")
async def get_feed(
    request: Request,
    limit: int = Query(default=24, ge=1, le=100),
    offset: int | None = Query(default=None),
):
    """Return a paginated listing of catalog items for the community feed."""
    items, next_offset = qdrant_service.scroll_products(limit=limit, offset_id=offset)
    return FeedResponse(
        items=[ProductResult(**{**item, "score": 0.0}) for item in items],
        total=len(items),
        next_offset=next_offset,
    )


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_item(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    is_private: bool = Form(False),
    user_id: str = Form(""),
):
    """
    Publish a community fashion item. Embeds the image with CLIP and stores
    it in Qdrant so it appears in future searches.
    """
    _validate_image_upload(file)
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be under 10 MB.")

    product_id = int(hashlib.md5(image_bytes).hexdigest()[:12], 16) % (2 ** 53)
    image_url = _upload_to_cloudinary(image_bytes, product_id)

    try:
        vector = clip_service.embed_image_bytes(image_bytes)
    except Exception as exc:
        logger.exception("CLIP embedding failed during upload")
        raise HTTPException(status_code=422, detail=f"Embedding failed: {exc}")

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    qdrant_service.upsert_products([{
        "product_id":  product_id,
        "vector":      vector,
        "name":        title,
        "description": description,
        "tags":        tag_list,
        "is_private":  is_private,
        "user_id":     user_id,
        "image_url":   image_url,
        "product_url": "",
        "brand":       "",
        "category":    "Community",
        "color":       "",
        "gender":      "Unisex",
        "price":       0.0,
        "source":      "community",
    }])

    logger.info("Community upload stored: product_id=%d title=%r", product_id, title)
    return UploadResponse(product_id=product_id, image_url=image_url, message="Published successfully.")

