# ADR 0001 — Record architecture decisions

**Date:** 2026-07-08 · **Status:** Accepted

## Context

NextPost is a portfolio project whose value lies as much in *why* things were built as in
what was built. Decisions made early (auth model, background jobs, ORM style) shape the
codebase, and the reasoning behind them is easy to lose.

## Decision

Record every significant architectural decision as a short Architecture Decision Record in
`docs/adr`, numbered sequentially, using this format: Context, Decision, Consequences.
ADRs are written in the same change that implements the decision. Superseded ADRs are not
deleted; their status changes to "Superseded by NNNN".

## Consequences

- The reasoning behind trade-offs stays reviewable in the repository next to the code.
- Small overhead per decision; kept deliberately brief to make writing them sustainable.
