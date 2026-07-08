# NextPost

A lightweight social media planning application for small marketing teams — replaces the
spreadsheet used to organise and schedule upcoming social media posts.

NextPost manages **planning only**: it does not publish to social media platforms.

> **Status: in development.** This README will be completed in the documentation phase.

## Stack

- **Backend:** FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL · Pydantic v2
- **Frontend:** React · TypeScript · Vite · TanStack Query · Tailwind CSS
- **Infrastructure:** Docker Compose

## Quick start (development)

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend alembic upgrade head
```

- API: http://localhost:8001 — interactive docs at http://localhost:8001/docs
  (host ports are offset — 8001 for the API, 5433 for PostgreSQL — so NextPost can run
  alongside other local stacks)
- Database schema: see [docs/database-schema.md](docs/database-schema.md)
