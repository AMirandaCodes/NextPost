# ADR 0012 — Production containerisation

**Date:** 2026-07-09 · **Status:** Accepted

## Context

Development runs source-mounted containers with hot reload. Production needs the opposite:
immutable images, small attack surface, persistent state that survives container
recreation, and a single entry point.

## Decision

1. **One backend Dockerfile, multiple targets.** `dev` (test/lint tooling, source
   bind-mounted by the dev compose) and `production` (a `builder` stage installs runtime
   dependencies into a virtualenv that is copied into a slim final image — no compilers,
   no pytest/ruff). Both composes build from the same file, so dev and prod can't drift
   apart silently.
2. **Non-root everywhere.** The backend runs as `appuser`; the frontend uses
   `nginx-unprivileged` (listens on 8080 as the `nginx` user).
3. **nginx is the only published port.** It serves the built SPA (content-hashed assets
   cached for a year, SPA fallback to index.html) and proxies `/api/` to the backend.
   Neither the backend nor PostgreSQL exposes a host port in production.
4. **State lives in two named volumes**: `pgdata` (database) and `uploads` (post images,
   mounted at `/app/uploads`). Both survive `down`, restarts and rebuilds; only an
   explicit `down -v` destroys them. The prod project is named `nextpost-prod` so its
   volumes and network never collide with the dev stack's.
5. **Health and dependencies.** Image-level HEALTHCHECKs on backend (hits `/health`) and
   frontend; the backend waits for `pg_isready` via `depends_on: service_healthy`.
6. **Exactly one uvicorn worker.** A second worker would run a second APScheduler and
   duplicate reminder emails — the ADR 0004 single-instance boundary enforced in the CMD.
7. **Migrations are an explicit step** (`alembic upgrade head` via `compose run`, wrapped
   in `make prod-up`), not hidden in app startup — failures are visible, and the app never
   boots against a half-migrated schema.
8. **Log rotation** (json-file, 10 MB × 3) on every prod service; required secrets use
   `${VAR:?}` interpolation so a missing `SECRET_KEY` or `POSTGRES_PASSWORD` fails the
   deploy loudly instead of booting insecurely.

## Consequences

- Verified end-to-end: register → create post → upload image through nginx, then full
  container destruction and recreation with the account and image intact.
- Single-host deployment by design; scaling beyond one backend instance requires
  extracting the scheduler (ADR 0004) and moving uploads to object storage (ADR 0009).
- TLS is out of scope: in any real deployment a reverse proxy / load balancer
  (Caddy, Traefik, a PaaS) would terminate HTTPS in front of nginx.
