# ADR 0013 — Continuous integration scope

**Date:** 2026-07-09 · **Status:** Accepted

## Context

Every phase shipped with tests and lint, run locally via Docker/make. CI makes those
checks non-optional and visible. GitHub Actions is the natural choice for a GitHub-hosted
portfolio project. The question is scope: CI platforms invite feature creep (image
publishing, deploy pipelines, coverage services, security scanners, dependency bots).

## Decision

One workflow (`ci.yml`), triggered on every push and pull request, with **two independent
jobs** so a failure identifies its side immediately:

- **backend** — Python 3.12, `pip install .[dev]` (cached on `pyproject.toml`), Ruff, then
  pytest against a `postgres:16-alpine` **service container**. The suite runs unmodified:
  `TEST_DATABASE_URL` points at the service, the scheduler is disabled by the test
  conftest, SMTP is stubbed by the tests themselves.
- **frontend** — Node 22, `npm ci` (cached on the lockfile), ESLint (zero warnings),
  `tsc --noEmit`, Vitest, and a production build so bundling errors fail CI too.

Deliberately excluded: Docker image publishing, deployment automation, Dependabot, CodeQL,
coverage upload services, release automation. None serve this project's goals; each adds
configuration to maintain and noise to review.

## Consequences

- The same commands run locally (`make check`) and in CI — no CI-only behaviour to debug.
- CI installs the backend from scratch on a bare runner, which independently verifies the
  project's dependency declarations (validated by reproducing the exact topology in a
  clean container before the workflow was committed).
- Adding future jobs (e.g. an image-build check) means appending a job, not restructuring.
- No deploy step: deployment remains an explicit, documented human action (ADR 0012).
