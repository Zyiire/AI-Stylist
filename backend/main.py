"""
Fashion Visual Search — FastAPI backend entry point.

Startup sequence:
  1. Validate env config
  2. Ensure Qdrant collection exists (creates it with HNSW config if not)
  3. Warm up CLIP model (loads weights into memory once)
  4. Start APScheduler for periodic catalog refresh jobs
"""
import logging
import time
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from config import settings
from routers import search
from services import clip_service, qdrant_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ──────────────────────────────────────────────────────────────
    logger.info("Starting Fashion Visual Search API…")

    logger.info("Ensuring Qdrant collection exists…")
    qdrant_service.ensure_collection()

    logger.info("Warming up CLIP model…")
    _start = time.perf_counter()
    clip_service._load_model()          # force load; cached via lru_cache
    logger.info("CLIP warm-up took %.2fs", time.perf_counter() - _start)

    # Schedule nightly catalog refresh (price/stock sync)
    scheduler.add_job(
        _catalog_refresh_job,
        trigger="cron",
        hour=3,
        minute=0,
        id="catalog_refresh",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — nightly catalog refresh at 03:00 UTC")

    yield

    # ── shutdown ─────────────────────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    logger.info("Scheduler shut down.")


async def _catalog_refresh_job():
    """
    Nightly job: re-fetch price and stock data from the catalog source
    and update Qdrant payloads in place (no re-embedding needed).
    """
    logger.info("[SCHEDULER] Catalog refresh job started")
    # TODO: implement your catalog sync logic here
    # e.g. fetch updated prices from your data source and call
    # qdrant_service.get_client().set_payload(...)
    logger.info("[SCHEDULER] Catalog refresh job completed")


app = FastAPI(
    title="Fashion Visual Search",
    description=(
        "Upload a clothing photo and find visually similar items in milliseconds. "
        "Powered by CLIP embeddings and HNSW vector search."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(search.router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "Fashion Visual Search API",
        "docs": "/docs",
        "health": "/search/health",
    }
