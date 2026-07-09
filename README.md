# NextPost

A lightweight social media planning application for small marketing teams — replaces the
spreadsheet used to organise and schedule upcoming social media posts.

NextPost manages **planning only**: it does not publish to social media platforms.

> **Status: in development.** Backend API and the core frontend (auth, posts, profile) are
> functional; dashboard and calendar views arrive in the next phase.

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
- **React frontend** — login/register, posts table with live filters and sortable columns,
  create/edit forms (React Hook Form) with tag chips, profile management, delete
  confirmation, and loading/empty/error states on every data page
  ([ADR 0007](docs/adr/0007-frontend-state-and-forms.md)).

## Quick start (development)

```bash
cp .env.example .env    # then set a real SECRET_KEY (see comment in the file)
docker compose up --build
docker compose exec backend alembic upgrade head
```

- App: http://localhost:5174
- API: http://localhost:8001 — interactive docs at http://localhost:8001/docs

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
| GET | `/tags` | The user's tag vocabulary |
| GET | `/dashboard` | Summary counts + next 5 scheduled posts |

Paginated responses share one envelope:

```json
{ "items": [], "page": 1, "page_size": 20, "total": 154 }
```

## Running tests & lint

```bash
# Backend
docker compose run --rm backend pytest          # unit + API tests (uses a separate test DB)
docker compose run --rm backend ruff check .    # lint

# Frontend
docker compose run --rm frontend npm test           # Vitest + React Testing Library
docker compose run --rm frontend npm run lint       # ESLint (zero warnings)
docker compose run --rm frontend npm run type-check # tsc --noEmit
```

CI (GitHub Actions) will run all of the above on every push in a later phase.

## Documentation

- [Database schema & ERD](docs/database-schema.md)
- [Architecture Decision Records](docs/adr/) — the reasoning behind every significant choice
