import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.scheduler import create_scheduler

setup_logging()
request_logger = logging.getLogger("app.request")
scheduler_logger = logging.getLogger("app.scheduler")


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler = None
    if settings.SCHEDULER_ENABLED:
        scheduler = create_scheduler()
        scheduler.start()
        scheduler_logger.info("reminder scheduler started", extra={"event": "scheduler.started"})
    yield
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        scheduler_logger.info("reminder scheduler stopped", extra={"event": "scheduler.stopped"})

tags_metadata = [
    {"name": "auth", "description": "Register and log in. Login returns a Bearer token."},
    {"name": "users", "description": "Profile and password management for the authenticated user."},
    {
        "name": "posts",
        "description": "Create, browse, update and delete posts. "
        "Lists support pagination, filtering, search and whitelisted sorting.",
    },
    {"name": "tags", "description": "The authenticated user's tag vocabulary."},
    {"name": "dashboard", "description": "Lightweight summary counts and upcoming posts."},
    {"name": "health", "description": "Liveness probe."},
]

app = FastAPI(
    title="NextPost API",
    description=(
        "Social media planning API — organise and schedule upcoming posts.\n\n"
        "All endpoints except `/auth/*` and `/health` require a Bearer token from "
        "`POST /api/v1/auth/login`. NextPost manages planning only; it does not "
        "publish to social media platforms."
    ),
    version="0.8.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)


@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    start = time.perf_counter()
    response = await call_next(request)
    request_logger.info(
        "request handled",
        extra={
            "event": "http.request",
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round((time.perf_counter() - start) * 1000, 1),
        },
    )
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
