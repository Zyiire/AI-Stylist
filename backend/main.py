"""
Fashion Visual Search — FastAPI backend entry point.

Startup sequence:
  1. Validate env config
  2. Ensure Qdrant collection exists (creates it with HNSW config if not)
  3. Warm up CLIP model (loads weights into memory once)
  4. Start APScheduler for periodic catalog refresh jobs
"""
import asyncio
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings
from limiter import limiter
from routers import search
from services import clip_service, qdrant_service

PIPELINE_DIR = Path(__file__).parent.parent / "pipeline"

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
    qdrant_service.ensure_source_index()

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
    Nightly job: refresh Pinterest and eBay fashion content in Qdrant.
    Runs the ingest scripts as subprocesses so pipeline deps (torch, etc.)
    don't need to be installed in the backend environment.
    """
    logger.info("[SCHEDULER] Catalog refresh job started")

    python = Path(PIPELINE_DIR / ".." / ".venv" / "bin" / "python")
    if not python.exists():
        python = Path("python")  # fall back to PATH

    scripts = [
        (PIPELINE_DIR / "ingest_pinterest.py", ["--limit", "100"]),
        (PIPELINE_DIR / "ingest_ebay.py",      ["--limit", "100"]),
    ]

    for script, extra_args in scripts:
        if not script.exists():
            logger.warning("[SCHEDULER] Script not found, skipping: %s", script)
            continue
        cmd = [str(python), str(script)] + extra_args
        logger.info("[SCHEDULER] Running: %s", " ".join(cmd))
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(PIPELINE_DIR),
            )
            stdout, _ = await proc.communicate()
            if proc.returncode == 0:
                logger.info("[SCHEDULER] %s completed successfully.", script.name)
            else:
                logger.error("[SCHEDULER] %s exited with code %d:\n%s",
                             script.name, proc.returncode, stdout.decode(errors="replace"))
        except Exception as exc:
            logger.exception("[SCHEDULER] Failed to run %s: %s", script.name, exc)

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

# ── Rate limiting ─────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Middleware ────────────────────────────────────────────────────────────────

_origins = [o.strip() for o in settings.allowed_origins.split(",")]

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
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
