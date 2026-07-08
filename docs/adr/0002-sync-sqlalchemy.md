# ADR 0002 — Synchronous SQLAlchemy instead of async

**Date:** 2026-07-08 · **Status:** Accepted

## Context

FastAPI supports both sync and async database access. Async SQLAlchemy (asyncpg) brings
event-loop pitfalls (connections bound to the loop that created them), greenlet plumbing,
and more complex test fixtures. NextPost is a small internal planning tool; its endpoints
are short CRUD queries with no high-concurrency I/O requirement.

## Decision

Use synchronous SQLAlchemy 2.0 with the `psycopg` driver. Endpoints are plain `def`
functions, which FastAPI runs in a threadpool.

## Consequences

- Simpler code, simpler tests (no async fixtures or event-loop management).
- Modern 2.0-style API is used throughout (`select()`, typed `Mapped[]` models), so the
  code style is current even though execution is synchronous.
- If the app ever needed thousands of concurrent long-lived requests, endpoints would be
  bounded by the threadpool — an acceptable and documented limit for this workload.
