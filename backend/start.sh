#!/bin/sh
# Production entrypoint for platforms that need migrations at boot (Render).
# Self-hosted compose keeps migrations as an explicit deploy step instead.
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
