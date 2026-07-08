# ADR 0006 — List endpoint conventions: pagination, sorting, search

**Date:** 2026-07-08 · **Status:** Accepted

## Context

The posts list needs pagination, sorting, filtering and text search, and the same patterns
will apply to any future list endpoint. Three sub-decisions were needed: pagination style
(offset vs cursor), how to accept a sort field safely, and the search implementation
(`ILIKE` vs PostgreSQL full-text search).

## Decision

1. **Offset pagination with a fixed envelope** on every paginated endpoint:
   `{"items": [...], "page": 1, "page_size": 20, "total": 154}` (`page_size` capped at 100).
2. **Sortable fields are whitelisted.** `sort_by` is a `Literal` of allowed names, mapped to
   columns in `post_service.SORTABLE_COLUMNS`. Raw query input is never interpolated into
   `ORDER BY`. Sorting is stable: `id` is always the tiebreaker, and NULLs sort last.
3. **Search is `ILIKE` on title and content**, with `%`/`_`/`\` escaped in the user's term
   so searches match literally.

## Consequences

- Offset pagination lets the UI show numbered pages and jump anywhere; it degrades at very
  large offsets, which is irrelevant at this dataset size. Cursor pagination would be the
  upgrade path if it ever mattered.
- The whitelist closes off SQL injection via `ORDER BY` and gives a self-documenting,
  typo-proof API (invalid values are a 422 with the allowed options listed).
- `ILIKE` has no ranking or stemming and cannot use a plain B-tree index — acceptable for a
  planning tool where a user searches at most a few thousand of their own posts. Full-text
  search (tsvector columns, triggers or generated columns, ranking) would add real
  complexity for no visible gain here; `pg_trgm` is the first upgrade if search ever slows.
