# ADR 0010 — Reminder delivery semantics and email sending

**Date:** 2026-07-09 · **Status:** Accepted (implements ADR 0004)

## Context

The APScheduler job (ADR 0004) sends an email when a scheduled post is due within the next
24 hours. Failure handling forces a choice: mark a post as reminded *before* sending
(at-most-once — a failed send is silently lost) or only *after* a successful send
(at-least-once — a crash in the narrow window between send and commit could duplicate).
A second choice is how to send email at all: an email library or the standard library.

## Decision

1. **At-least-once delivery.** `reminder_sent_at` is stamped and committed per post, only
   after `send_reminder` returns. A failed send logs `reminders.failed`, rolls back, and
   leaves the post eligible for automatic retry on the next run. One bad email never
   blocks the rest of the batch.
2. **Selection window**: `status = scheduled AND reminder_sent_at IS NULL AND
   now ≤ scheduled_at ≤ now + REMINDER_LEAD_HOURS`. Posts already past their date get no
   reminder — there is nothing left to remind about.
3. **stdlib `smtplib` + `EmailMessage`** with multipart plain-text + HTML bodies built in
   `email_service`. User-supplied values are HTML-escaped before templating. All SMTP
   settings come from environment variables; dev uses Mailpit (`localhost:8025` inbox).
4. **Isolation**: `reminder_service` (query + orchestration) and `email_service`
   (build + send) know nothing about HTTP or APScheduler; `scheduler.py` only wires a
   session-per-run job; FastAPI's lifespan only starts/stops the scheduler. The job also
   runs once at startup, so a restarted app catches up immediately.

## Consequences

- Duplicates are possible only if the process dies between SMTP acceptance and the commit
  — rare, and a duplicate reminder is harmless; a silently lost one is not.
- A permanently failing address is retried every run until the post's date passes.
  Acceptable at this scale; a retry cap/backoff column would be the upgrade.
- No queue, no broker: delivery concurrency is one email at a time, in-process, which is
  the same single-instance boundary accepted in ADR 0004.
- Tests disable the scheduler via `SCHEDULER_ENABLED=false` and exercise the service layer
  directly with a stubbed sender — no SMTP server needed in CI.
