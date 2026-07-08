# NextPost

A lightweight social media planning application for small marketing teams — replaces the
spreadsheet used to organise and schedule upcoming social media posts.

NextPost manages **planning only**: it does not publish to social media platforms.

> **Status: in development.** Backend API is functional; frontend arrives in a later phase.

## Stack

- **Backend:** FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL · Pydantic v2
- **Frontend:** React · TypeScript · Vite · TanStack Query · Tailwind CSS
- **Infrastructure:** Docker Compose

## Features so far

- **JWT authentication** — register, login, profile, password change. Single 12-hour access
  token ([ADR 0003](docs/adr/0003-single-jwt-access-token.md)), bcrypt hashing, timing-safe
  login.
- **Posts CRUD** — title, content, platform (Facebook, Instagram, X, LinkedIn, TikTok,
  Other), draft/scheduled/published status, scheduling date, per-user tags.
- **List browsing** — pagination, platform/status/tag filters, date-range filter,
  case-insensitive text search, whitelisted sorting
  ([ADR 0006](docs/adr/0006-list-endpoint-conventions.md)).
- **Dashboard** — summary counts (draft/scheduled/published, this week) and the next five
  upcoming posts. Deliberately not analytics.
- **Structured JSON logging** — request logs plus auth and post lifecycle events.

## Quick start (development)

```bash
cp .env.example .env    # then set a real SECRET_KEY (see comment in the file)
docker compose up --build
docker compose exec backend alembic upgrade head
```

- API: http://localhost:8001 — interactive docs at http://localhost:8001/docs
  (host ports are offset — 8001 for the API, 5433 for PostgreSQL — so NextPost can run
  alongside other local stacks)

## API overview

All endpoints are under `/api/v1` and require `Authorization: Bearer <token>` except
`/auth/*` and `/health`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Get an access token (JSON body) |
| GET / PATCH | `/users/me` | Read / update profile |
| PUT | `/users/me/password` | Change password |
| POST | `/posts` | Create a post (tags auto-created) |
| GET | `/posts` | List with `page`, `page_size`, `platform`, `status`, `tag`, `search`, `scheduled_from/to`, `sort_by`, `sort_order` |
| GET / PATCH / DELETE | `/posts/{id}` | Read / partial-update / delete (hard delete) |
| GET | `/tags` | The user's tag vocabulary |
| GET | `/dashboard` | Summary counts + next 5 scheduled posts |

Paginated responses share one envelope:

```json
{ "items": [], "page": 1, "page_size": 20, "total": 154 }
```

## Running tests & lint

```bash
docker compose run --rm backend pytest          # unit + API tests (uses a separate test DB)
docker compose run --rm backend ruff check .    # lint (CI will run both on every push)
```

## Documentation

- [Database schema & ERD](docs/database-schema.md)
- [Architecture Decision Records](docs/adr/) — the reasoning behind every significant choice
