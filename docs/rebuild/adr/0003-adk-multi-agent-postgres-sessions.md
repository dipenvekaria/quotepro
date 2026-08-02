# ADR 0003: Google ADK + Multi-Agent Router + Postgres Sessions

**Status**: Accepted
**Date**: 2026-08-02
**Deciders**: @dipenvekaria
**Supersedes**: Pre-rebuild AdkQuoteService with InMemorySessionService.

## Context

The pre-rebuild backend had:

1. Two AI generation stacks hitting the same endpoint — legacy `QuoteGeneratorService` (Groq→Gemini) and newer `AdkQuoteService` (Google ADK). Only ADK is actually used, but both remain in the codebase.
2. `InMemorySessionService` for ADK — session state is lost on every server restart. Not viable in a multi-instance deployment.
3. Company scoping via a `contextvars.ContextVar` set per-tool call — brittle and easy to forget.
4. Three separate indexer scripts (`quote_indexer.py`, `catalog_indexer.py`, `auto_indexer.py`) with overlapping logic and a polling-based worker that doesn't scale.

## Decision

Phase 2 lands a consolidated backend:

### 1. Google ADK is the single AI framework

Legacy Groq path is deleted (in Phase 2 cutover). ADK's `LlmAgent` + tools + optional `output_schema` pattern is used everywhere. Prompts live in `src/quotepro/prompts/*.md`, versioned by filename suffix.

### 2. Multi-agent registry driven by `config/agents.yaml`

Agents are declarative: name, description, prompt file, model, temperature, tools, output schema. `AgentRegistry.build(name)` returns a configured `LlmAgent`. Central `_default_tool_registry()` maps tool names → callables.

Ships with seven agents:
- `router` — top-level intent classifier
- `quote_builder` — new quote generation
- `quote_updater` — incremental edits with discount recalc
- `job_namer` — 3–5 word job names
- `upsell_suggester` — data-driven add-ons
- `quote_optimizer` — win probability + pricing
- `invoice_drafter` — draft invoice from job
- `schedule_assistant` — scheduling suggestions

Adding an agent = drop a prompt file + register a tool (if new) + add a YAML entry.

### 3. `PostgresSessionService` for durable ADK sessions

Sessions persist in `public.adk_sessions_v2` (composite PK: `app_name, user_id, session_id`). Read-modify-write with `FOR UPDATE` for append_event correctness. Session state survives server restarts and works across horizontally-scaled backends.

### 4. Unified `Indexer` service + arq worker

Three legacy indexer scripts are collapsed into `services/indexer.py`. Postgres triggers already emit `NOTIFY 'work_item_indexed'` / `NOTIFY 'catalog_item_indexed'` (see baseline migration). The arq worker (`workers/indexer_worker.py`) opens a persistent asyncpg LISTEN connection, receives notifications, and enqueues `index_entity` jobs into Redis. Standard arq worker processes drain the queue.

Bulk backfill via `POST /api/index/backfill` (owner/office only).

### 5. Hybrid RAG service

`services/rag.py` is a thin wrapper around the `match_documents` Postgres RPC (vector cosine + BM25 tsvector + Reciprocal Rank Fusion, `k=60`). Two convenience methods hydrate results:

- `similar_catalog_items()` — joins with `catalog_items` for `base_price` + `unit`.
- `similar_quotes()` — joins with `quote_details_view` for line items.

### 6. Company context via auth middleware

The `require_auth` FastAPI dependency verifies the Supabase JWT, loads `(company_id, role)` from `public.users`, and binds them to both the request state AND the structlog `contextvars`. Tool functions read the company id from a single ContextVar — no more per-endpoint `set_company_id()` calls.

### 7. Structured JSON logging + OTel + Sentry

`structlog` with automatic context propagation (`request_id`, `user_id`, `company_id`). OpenTelemetry auto-instrumentation for FastAPI, httpx, asyncpg. Sentry via `sentry-sdk[fastapi]`. All three no-op cleanly when unconfigured.

### 8. FastAPI app factory + `next-safe-action`-style contract

`create_app(settings) -> FastAPI` is idempotent. Uvicorn runs `--factory` mode. Rate limiting via slowapi keyed on `auth.user_id` (fallback: IP). Error hierarchy rooted at `QuoteProError` renders as `{ error: { code, message, details? } }`.

## Alternatives considered

- **Vertex AI Session Service** — managed, but adds a GCP-only dependency and non-trivial cost. Deferred as an option once we're already on GCP.
- **Own sessions via `contextvars` + Redis** — less code but no durability across worker restarts.
- **Celery** for the indexer — heavier ops footprint. arq is one-file, Redis-only, native asyncio.
- **Direct call to Gemini API without ADK** — loses tool-calling ergonomics + output_schema enforcement.

## Consequences

**Positive**
- Single AI stack; every deletion of legacy code compounds.
- ADK sessions survive redeploys.
- Adding an agent is a config change + one prompt file, not a code change.
- Rate limiting and cost tracking are opt-in via feature flags — tests can disable both.
- Hybrid RAG lets us tune vector/BM25 balance via `rrf_k` without redeploying.

**Negative**
- ADK API surface can change between versions — mitigated by pinning `google-adk==1.20.0` and testing upgrades in an isolated branch.
- The arq worker adds a Redis dependency. Local dev via docker-compose.

**Neutral**
- The new `src/quotepro/` package co-exists with the legacy flat modules during migration. Legacy is deleted in Phase 2 cutover once Phase 3 (frontend) points at the new endpoints.

## Related work

- ADR 0004 (future) — Streaming AI chat via SSE + Vercel AI SDK.
- ADR 0005 (future) — Prompt versioning + per-company overrides.
- Phase 4 — flesh out router → specialist delegation.
- Phase 6 — wire real handlers into `api/webhooks.py` (Stripe payment succeeded → invoice update, etc.).
