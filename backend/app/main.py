import logging
import time

from fastapi import FastAPI, Request, Response

from app.api.router import api_router
from app.core.logging import setup_logging

setup_logging()
request_logger = logging.getLogger("app.request")

app = FastAPI(
    title="NextPost API",
    description="Social media planning API — organise and schedule upcoming posts.",
    version="0.1.0",
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
