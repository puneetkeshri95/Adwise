"""FastAPI app entrypoint."""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.database import init_db
from app.core.config import settings
from app.api.routes import auth, dashboard, tracking, sync, meta, reporting, webhooks, chat, metrics
from app.api.routes.tracking import limiter
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler did not start: {e}")
    yield
    stop_scheduler()


app = FastAPI(
    title="Namyah Attribution API",
    description="Production Meta Ads + website attribution backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(meta.router, prefix="/api")
app.include_router(reporting.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")


@app.get("/")
async def root():
    return {"app": "Namyah Attribution API", "status": "running", "docs": "/docs"}


@app.get("/test-pixel")
async def test_pixel_page():
    test_file = Path(__file__).resolve().parents[2] / "test-pixel.html"
    return FileResponse(test_file, media_type="text/html")
