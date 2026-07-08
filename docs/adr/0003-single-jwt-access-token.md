# ADR 0003 — Single JWT access token, no refresh tokens

**Date:** 2026-07-08 · **Status:** Accepted

## Context

The original specification called for JWT authentication. A common implementation uses a
short-lived access token plus a long-lived refresh token, which requires refresh endpoints,
frontend interceptor logic for transparent renewal, and decisions about refresh-token
storage and rotation. NextPost is an internal planning tool: the threat model is modest and
the project's goal is to showcase clean engineering, not OAuth-style token choreography.

## Decision

Issue a single stateless JWT access token valid for 12 hours (`HS256`, signed with
`SECRET_KEY`). No refresh tokens, no server-side session state, no token blacklist.
Logout is client-side: the frontend discards the token. Login accepts JSON (consistent
with the rest of the API) rather than an OAuth2 password form.

## Consequences

- Backend and frontend are both significantly simpler (no refresh endpoint, no renewal
  interceptor, no rotation logic).
- Users re-authenticate roughly once per working day — acceptable for an internal tool.
- A stolen token remains valid until expiry and cannot be revoked server-side. Mitigations
  would be a denylist table or shorter expiry; documented, deliberately not implemented.
- Password changes do not invalidate existing tokens (stateless trade-off, same mitigation
  path as above).
- Swagger UI's Authorize dialog takes a pasted Bearer token rather than offering a
  username/password form, because login is JSON, not OAuth2 form-encoded.
