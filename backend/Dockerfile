# Multi-stage build. Targets:
#   dev        — used by docker-compose.yml; includes test/lint tooling, source bind-mounted
#   production — used by docker-compose.prod.yml; slim, non-root, healthchecked

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app


FROM base AS dev
COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN pip install --no-cache-dir .[dev]
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# Builds a virtualenv with runtime dependencies only (no pytest/ruff).
FROM base AS builder
COPY pyproject.toml ./
COPY app ./app
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir .


FROM base AS production
RUN useradd --create-home --uid 1000 appuser
ENV PATH="/opt/venv/bin:$PATH"
COPY --from=builder /opt/venv /opt/venv
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
# The uploads volume mounts here; created pre-USER so it belongs to appuser.
RUN mkdir -p /app/uploads && chown appuser:appuser /app/uploads
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health', timeout=3).status == 200 else 1)"]
# Exactly one worker: a second would run a second APScheduler and duplicate
# reminder emails (see ADR 0004).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
