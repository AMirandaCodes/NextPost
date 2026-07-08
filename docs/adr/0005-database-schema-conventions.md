# ADR 0005 — Database schema conventions

**Date:** 2026-07-08 · **Status:** Accepted

## Context

Several small schema-level choices recur across every table and are easiest to record
once. Full column-level detail lives in `docs/database-schema.md`.

## Decision

- **Integer identity primary keys** rather than UUIDs. Simpler and index-friendly; ID
  enumeration is not a risk because every query is scoped to the authenticated user and
  foreign IDs return 404.
- **Enums stored as `VARCHAR` + named CHECK constraint** (`native_enum=False,
  create_constraint=True`), not native PostgreSQL enum types. Adding a value later is a
  constraint swap in a migration instead of `ALTER TYPE` with its transactional quirks.
  `values_callable` is always passed so SQLAlchemy binds enum *values*, not member names.
- **All timestamps are `timestamptz`**, UTC in the database, maintained by
  `server_default=now()`; the frontend localises for display.
- **A deterministic naming convention** on `MetaData` names every PK/FK/UQ/CK/index, so
  future migrations can drop or alter constraints by predictable name.
- **Ownership is the security boundary**: every post and tag has a `user_id` FK with
  `ON DELETE CASCADE`, and all queries filter on it.

## Consequences

- Migrations stay boring and reversible — the properties you want migrations to have.
- Native enum performance/storage benefits are given up; negligible at this scale.
