# ADR 0004 — APScheduler in-process instead of Celery + Redis

**Date:** 2026-07-08 · **Status:** Accepted (implementation lands in the email-reminder phase)

## Context

The only background work in NextPost is a reminder email sent one day before a post's
scheduled publication. Celery would add a broker (Redis), a worker container, and a beat
scheduler container — three pieces of infrastructure to run what is essentially one
periodic query. The specification explicitly says to introduce Redis/Celery only if
background processing genuinely benefits from them.

## Decision

Run APScheduler inside the FastAPI process. A periodic job selects posts scheduled within
the next day where `reminder_sent_at IS NULL`, sends the email, and stamps
`reminder_sent_at` — making the job idempotent across restarts.

## Consequences

- Docker stack stays at four services (frontend, backend, db, mailpit) instead of seven.
- The scheduler lives and dies with the single backend instance; running multiple backend
  replicas would need a lock or a move to Celery. That is the documented scaling boundary.
- Long-running or high-volume jobs would not fit this model — none exist in this product.
- Migration path if requirements grow: the job function is plain Python taking a session,
  so it can be re-registered as a Celery task without rewriting its logic.
