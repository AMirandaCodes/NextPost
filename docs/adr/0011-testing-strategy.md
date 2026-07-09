# ADR 0011 — Testing strategy

**Date:** 2026-07-09 · **Status:** Accepted

## Context

By the test-hardening phase the suite had grown organically (tests ship with each
feature). This ADR records the deliberate shape of the overall strategy, including what we
chose *not* to test and why.

## Decision

**Backend — real database, no mocked persistence.** API and service tests run against a
real PostgreSQL (`nextpost_test`), each test wrapped in a rolled-back outer transaction
(`join_transaction_mode="create_savepoint"`), so `commit()` in production code works
normally yet tests stay isolated and fast (~120 tests in ~30s). Only true externals are
stubbed: SMTP (a fake `smtplib.SMTP`) and the scheduler (disabled via `SCHEDULER_ENABLED`
before app import). Uploads write to a per-test temp directory.

**Frontend — mock at the API-module boundary, nothing deeper.** Component tests mock
`src/api/*` functions (the seam where the network starts) and exercise real components,
hooks, TanStack Query caching and react-hook-form validation. Two **workflow tests** mount
the full route tree (`AppRoutes`) against an in-memory fake backend and walk complete user
journeys: login → create → edit → delete, and the guarded-route redirect round-trip.

**Coverage is a gap-finder, not a target.** `pytest --cov` / `vitest --coverage` reports
identified untested behaviour (scheduler wiring, SMTP config paths, image edge cases,
pagination boundaries); lines like `__repr__` helpers are knowingly left uncovered.

**No browser E2E suite (Playwright/Cypress).** The workflow tests cover routing, forms and
state integration; the backend API tests cover the contract; what E2E would add — real
browser rendering against the real stack — costs more in flake and CI time than it returns
for a single-developer portfolio project. This is the first thing to revisit if the
project grew real users.

## Consequences

- A schema or query bug fails backend tests honestly (no mocked ORM to hide behind), and a
  route/cache/form regression fails the workflow tests — as proven when the workflow test
  exposed a real bug in the post-login redirect race.
- The API-module seam means frontend tests survive refactors of components and hooks, but
  a mismatch between the mocked API shape and the real backend contract would go unnoticed
  — mitigated by keeping `src/api/*` as thin, typed one-liners around Axios.
- Contract drift between frontend types and backend schemas is accepted as a manual
  concern at this scale (OpenAPI client generation would be the upgrade).
