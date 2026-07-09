# NextPost

A lightweight social media planning application for small marketing teams — replaces the
spreadsheet used to organise and schedule upcoming social media posts.

NextPost manages **planning only**: it does not publish to social media platforms.

> **Status: in development.** All application features are functional (auth, posts,
> images, dashboard, calendar, email reminders); remaining phases cover test hardening,
> production Docker and documentation.

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
- **Email reminders** — an in-process APScheduler job
  ([ADR 0004](docs/adr/0004-apscheduler-for-background-jobs.md)) emails you when a
  scheduled post is due within 24 hours. Idempotent via `reminder_sent_at`; failed sends
  retry automatically ([ADR 0010](docs/adr/0010-reminder-delivery-semantics.md)).
  Dev emails land in Mailpit at http://localhost:8025.
- **Structured JSON logging** — request logs plus auth, post lifecycle and reminder-job
  events (per-send results and run summaries).
- **React frontend** — login/register, posts table with live filters and sortable columns,
  create/edit forms (React Hook Form) with tag chips, profile management, delete
  confirmation, and loading/empty/error states on every data page
  ([ADR 0007](docs/adr/0007-frontend-state-and-forms.md)).
- **Post images** — one image per post with preview, replace and remove; validated by
  extension allow-list, 5 MB cap and Pillow content verification; UUID filenames; served
  with correct MIME types behind authentication
  ([ADR 0009](docs/adr/0009-image-storage-and-serving.md)).
- **Dashboard** — summary cards and upcoming posts as the home page.
- **Calendar** — custom month view built on `date-fns`
  ([ADR 0008](docs/adr/0008-custom-month-calendar.md)): navigate months, click a day for
  its posts, click a post to edit. All dates shown in the viewer's local timezone.

## Quick start (development)

```bash
cp .env.example .env    # then set a real SECRET_KEY (see comment in the file)
docker compose up -d --build
docker compose run --rm backend alembic upgrade head
```

With `make` installed, that's `make dev-build` and `make migrate`. The Makefile is a thin
convenience wrapper — every target's full command is documented here, so `make` is never
required.

- App: http://localhost:5174
- API: http://localhost:8001 — interactive docs at http://localhost:8001/docs
- Mail inbox (Mailpit): http://localhost:8025

Host ports are offset (5174 app, 8001 API, 5433 PostgreSQL) so NextPost can run alongside
other local stacks. The Vite dev server proxies `/api/*` to the backend, so the browser
only ever talks to one origin.

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
| PUT / GET / DELETE | `/posts/{id}/image` | Upload or replace / serve / remove the post's image |
| GET | `/tags` | The user's tag vocabulary |
| GET | `/dashboard` | Summary counts + next 5 scheduled posts |

Paginated responses share one envelope:

```json
{ "items": [], "page": 1, "page_size": 20, "total": 154 }
```

## Running tests & lint

```bash
# Backend (~120 tests against a real PostgreSQL test database)
docker compose run --rm backend pytest
docker compose run --rm backend pytest --cov=app --cov-report=term-missing   # coverage
docker compose run --rm backend ruff check .    # lint

# Frontend (component tests + full user-workflow tests)
docker compose run --rm frontend npm test
docker compose run --rm frontend npx vitest run --coverage                   # coverage
docker compose run --rm frontend npm run lint       # ESLint (zero warnings)
docker compose run --rm frontend npm run type-check # tsc --noEmit
```

Or, with make: `make test`, `make lint`, or `make check` for everything at once.

The testing approach — real DB for backend tests, API-module mocking + workflow tests for
the frontend, coverage as a gap-finder rather than a target — is documented in
[ADR 0011](docs/adr/0011-testing-strategy.md). CI (GitHub Actions) will run all of the
above on every push in a later phase.

## Production deployment

```bash
cp .env.example .env   # set SECRET_KEY, a strong POSTGRES_PASSWORD and real SMTP settings
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

Or `make prod-up` (which runs the migrations for you). The app is served on
`HTTP_PORT` (default 80).

The production stack ([ADR 0012](docs/adr/0012-production-containerisation.md)) differs
from development deliberately:

| | Development | Production |
|---|---|---|
| Frontend | Vite dev server, hot reload | Static build served by unprivileged nginx |
| Backend | `--reload`, source bind mount | Slim multi-stage image, non-root, no mounts |
| Ports | app 5174, API 8001, DB 5433, mail 8025 | only nginx (`HTTP_PORT`) is published |
| Email | Mailpit inbox | Real SMTP via environment variables |

**Persistent storage:** two named volumes hold all state — `pgdata` (PostgreSQL) and
`uploads` (post images at `/app/uploads`). Containers can be stopped, recreated or
rebuilt without losing data; only `docker compose -f docker-compose.prod.yml down -v`
deletes the volumes. Back up by dumping the database (`pg_dump`) and archiving the
uploads volume.

**Scaling note:** the backend intentionally runs a single uvicorn worker — the reminder
scheduler lives in-process, and a second worker would send duplicate emails (ADR 0004).
TLS termination is expected to happen in front of nginx (reverse proxy or PaaS).

## Documentation

- [Database schema & ERD](docs/database-schema.md)
- [Architecture Decision Records](docs/adr/) — the reasoning behind every significant choice
