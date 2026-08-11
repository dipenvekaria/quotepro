# ADR 0001: Record Architecture Decisions

**Status**: Accepted
**Date**: 2026-08-02
**Deciders**: @dipenvekaria

## Context

Non-obvious architectural decisions taken during the QuotePro 2.0 rebuild need to be captured so future engineers understand the "why" behind the code, not just the "what".

## Decision

We will record every non-obvious architectural decision as an Architecture Decision Record (ADR) in `docs/rebuild/adr/`.

Format:

- Filename: `NNNN-kebab-case-title.md`
- Frontmatter: `Status`, `Date`, `Deciders`
- Body: Context / Decision / Consequences

Statuses: `Proposed`, `Accepted`, `Superseded by NNNN`, `Deprecated`.

## Consequences

- Positive: onboarding accelerated; decisions traceable.
- Negative: minor overhead per non-obvious decision.
- Neutral: ADRs are living documents — superseding an old one is normal.

## Related ADRs to add during rebuild

- 0002 — Phased in-place refactor (not greenfield rewrite).
- 0003 — Google ADK as the AI framework.
- 0004 — Unified `work_items` schema.
- 0005 — Hybrid RAG (BM25 + pgvector cosine + RRF).
- 0006 — Postgres-backed ADK sessions (not InMemory or VertexAI).
- 0007 — Server Actions for CRUD + FastAPI for AI (hybrid gateway).
- 0008 — Vercel + Railway + Supabase deployment topology.
- 0009 — Stripe Connect Express for customer→contractor payments.
- 0010 — pnpm + uv + biome + ruff toolchain.
