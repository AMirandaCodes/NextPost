# ADR 0014 — Portfolio deployment on Render and Demo Mode

**Date:** 2026-07-14 · **Status:** Accepted

## Context

NextPost should be publicly reachable for recruiters at zero cost. Render's free tier
imposes real constraints: free web services sleep after ~15 minutes idle (~1 minute cold
start), free tier offers **no persistent disks**, and **one free PostgreSQL per account**
(already used by another project) which additionally expires after 30 days. A public demo
also shouldn't greet visitors with a login form, and visitor changes shouldn't rot the
demo data.

## Decision

1. **Backend: Render Docker web service** building the existing `backend/Dockerfile`
   (its final stage is the `production` target, so no Render-specific image exists).
   Migrations run in the start command — `alembic upgrade head && uvicorn … --port $PORT` —
   because failures there are visible in deploy logs, unlike inside the app lifespan.
2. **Frontend: Render Static Site**, not the nginx container. Free static hosting is
   CDN-backed and never sleeps; two rewrite rules (`/api/*` → backend, `/*` →
   `/index.html`) replicate the nginx behaviour, keeping the single-origin/no-CORS design.
   The nginx image remains the self-hosting path (`docker-compose.prod.yml`).
3. **Database: Neon free Postgres** (external). Sidesteps the one-free-DB-per-account
   limit and the 30-day expiry; connecting is only a `DATABASE_URL` (with
   `postgresql+psycopg://…?sslmode=require`).
4. **No persistent disk — by design.** Demo Mode regenerates *all* state on schedule, so
   the ephemeral filesystem holds nothing worth keeping. Demo images are generated with
   Pillow at seed time rather than stored as binary assets.
5. **Demo Mode** (`DEMO_MODE=true`):
   - `POST /auth/demo` issues a session for a shared demo account (404 when disabled, so
     the endpoint doesn't exist outside demo deployments).
   - Demo-mode frontend builds (`VITE_DEMO_MODE=true`) call it automatically behind a
     splash screen whose copy doubles as honest cold-start messaging.
   - Visitors have **full write access** — creating, editing, uploading and deleting all
     work — because an APScheduler job resets the account to its seed hourly and at every
     startup. "Cannot permanently modify" is implemented as *resets*, not as read-only
     restrictions, which demos far better.
   - The only exception: the demo account's own email/password are locked (403) — they
     are infrastructure that the auto-login depends on.
   - Seeded `scheduled_at` dates are relative to "now", so the dashboard and calendar
     always look current without maintenance.
6. **Reminders disabled** (`REMINDERS_ENABLED=false`, a new flag separate from
   `SCHEDULER_ENABLED`, which must stay on for the reset job). Free SMTP providers would
   add credentials and failure modes to send emails nobody reads; the feature remains
   fully intact, tested, and demonstrated in development via Mailpit.

## Consequences

- Total hosting cost: £0. Trade-off: ~1-minute cold start after idle, mitigated by the
  splash screen's expectation-setting.
- Concurrent visitors share the sandbox and may see each other's changes for up to an
  hour — acceptable at portfolio traffic, and the banner says so.
- A visitor could post objectionable content visible to others until the next reset;
  the hourly cadence bounds the exposure.
- The Render deployment diverges from `docker-compose.prod.yml` (static site vs nginx,
  external DB) — documented here and in the README so the difference reads as a
  platform adaptation, not drift.
