# ADR 0007 — Frontend state management and forms

**Date:** 2026-07-08 · **Status:** Accepted

## Context

React apps commonly drift into duplicated state: API data copied into Context or a global
store, then manually kept in sync. NextPost's frontend needs server data (posts, tags,
profile), a small amount of auth state, and five forms — one of which (the post form) has
cross-field validation and will gain an image field in a later phase.

## Decision

1. **TanStack Query owns all server state.** Every API response lives in the query cache,
   keyed centrally (`postKeys`). Mutations invalidate rather than hand-patch lists. No
   Redux/Zustand; no API data in Context or component state.
2. **React Context is auth-only**: the token plus `login`/`register`/`logout`. The current
   user is *not* in Context — it's a query (`["me"]`) like any other server data. Logout
   clears the whole query cache so no data leaks across sessions.
3. **React Hook Form for all forms.** Declarative per-field rules, cross-field validation
   (a scheduled post requires a date), and `setError` to map FastAPI 422 responses onto the
   offending fields. Uncontrolled inputs avoid re-render-per-keystroke.
4. **Single access token** (ADR 0003) kept in `localStorage`; an Axios interceptor attaches
   it and a response interceptor handles expiry by returning to the login page.

## Consequences

- One source of truth per piece of data; refetching, caching and staleness are the
  library's job, not hand-rolled `useEffect` code.
- React Hook Form is an extra dependency and a layer of indirection versus `useState`, but
  across five forms it removes far more code than it adds, and server-error mapping would
  otherwise be bespoke per form.
- `localStorage` tokens are readable by JS (XSS exposure) — accepted for an internal tool
  and noted in ADR 0003; an httpOnly-cookie session would be the hardened alternative.
- List filters are deliberately component state, not URL state — simpler, at the cost of
  non-shareable filtered views. URL params are the upgrade if sharing ever matters.
