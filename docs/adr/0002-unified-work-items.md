# ADR 0002: Unified `work_items` Schema

**Status**: Accepted
**Date**: 2026-08-02
**Deciders**: @dipenvekaria
**Supersedes**: Pre-rebuild `quotes` + `leads` + `jobs` triplet.

## Context

Pre-rebuild had two competing data models running side-by-side:

1. **Normalized model** (`quotes/leads/jobs` as separate tables, migration 021).
2. **Unified model** (`work_items` single table, migration 20251205).

Application code queried both inconsistently, forcing `@ts-nocheck` in the quote editor and the leads/quotes queue pages. RLS policies had to be maintained on both, and the "convert lead to quote" transition required copying rows between tables.

## Decision

Adopt **`work_items` as the single canonical table** for the entire pre-invoice lifecycle: leads → quotes → jobs → archived.

- `status` (enum `work_item_status`) encodes the full lifecycle: `lead`, `quote_draft`, `quote_sent`, `quote_viewed`, `quote_accepted`, `quote_rejected`, `quote_expired`, `job_scheduled`, `job_in_progress`, `job_completed`, `job_cancelled`, `archived`.
- `kind` is a **GENERATED STORED** column derived from `status` (values: `lead`, `quote`, `job`, `archived`, `unknown`) — used for indexes and pipeline board filters.
- `quote_items` and `quote_options` FK directly to `work_items.id` (not to a "quote_id").
- `invoices` reference `work_items` via a nullable `work_item_id` (invoice may outlive the work item semantically).

## Consequences

**Positive**
- One RLS policy set per operation instead of three.
- "Convert lead to quote" is a single `UPDATE status = 'quote_draft'` — no row copy, IDs preserved for stable URLs and audit trail continuity.
- Server actions and queries become uniform: `useWorkItem(id)` regardless of stage.
- Analytics rollups (`analytics_daily_view`) are one COUNT/GROUP BY.

**Negative**
- The table is wide (25+ columns). Some columns are only meaningful in certain stages (`scheduled_start` only for jobs, `sent_at` only for quotes). Mitigated by the `kind` generated column + views for stage-specific projections.
- Migration path for existing data would be more complex — not applicable since we wipe the DB (no prod users).

**Neutral**
- Postgres handles the ~30-column table just fine with proper indexing.

## Related decisions

- ADR 0004 (future) — public token strategy for `/q/[token]` and `/i/[token]`.
- ADR 0005 (future) — hybrid RAG on `document_embeddings` (single embeddings table across entity types).
