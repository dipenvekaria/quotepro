# AI Architecture

**Landed in Phase 2.** See [ADR 0003](adr/0003-adk-multi-agent-postgres-sessions.md) for rationale.

## Overview

Multi-agent system on Google ADK 1.20 + Gemini 2.0 Flash/Pro. A `RouterAgent` classifies user intent and delegates to specialists. Hybrid RAG (BM25 + pgvector cosine + Reciprocal Rank Fusion) grounds every generation. Sessions durable in Postgres (`adk_sessions_v2`). Streaming chat via SSE consumed by Vercel AI SDK on the frontend.

## Agent Registry

Declared in [python-backend/config/agents.yaml](../../python-backend/config/agents.yaml). Each entry: name, description, prompt file, model, temperature, tools, output schema.

Agents shipped in Phase 2:

| Name                 | Role                                                      | Model                              | Tools                                                             | Output Schema     |
| -------------------- | --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- | ----------------- |
| `router`             | Top-level intent classifier                               | gemini-2.0-flash                   | —                                                                 | RouterDecision    |
| `quote_builder`      | New quote from job description                            | gemini-2.0-flash                   | retrieve_catalog_items, retrieve_similar_quotes, get_tax_rate, recalculate_discount | QuoteOutput       |
| `quote_updater`      | Incremental edits on an existing quote                    | gemini-2.0-flash                   | retrieve_catalog_items, recalculate_discount                       | QuoteOutput       |
| `job_namer`          | 3–5 word job name from a description                      | gemini-2.0-flash                   | —                                                                 | raw text          |
| `upsell_suggester`   | Data-driven upsell recommendations                        | gemini-2.0-flash                   | retrieve_catalog_items, retrieve_similar_quotes                    | list[Upsell]      |
| `quote_optimizer`    | Win-probability + optional pricing adjustment             | gemini-2.0-flash-thinking-exp-1219 | retrieve_similar_quotes                                            | QuoteOptimization |
| `invoice_drafter`    | Draft an invoice from a completed job                     | gemini-2.0-flash                   | —                                                                 | InvoiceDraft      |
| `schedule_assistant` | Suggest scheduling windows                                | gemini-2.0-flash                   | —                                                                 | list[ScheduleWindow] |

Adding an agent = drop a `<name>_v1.md` prompt in [prompts/](../../python-backend/src/quotepro/prompts/) + register the tool callable in `agents/registry.py::_default_tool_registry()` (if new) + append a YAML entry.

## Prompt Versioning

Prompts live under [python-backend/src/quotepro/prompts/](../../python-backend/src/quotepro/prompts/) versioned by filename suffix (`quote_builder_v1.md`). Runtime picks the file declared in `agents.yaml`. Per-company overrides via the `ai_prompts` table (populated by `/settings/prompts` in Phase 4).

## RAG Pipeline

Single Postgres RPC in [baseline migration](../../supabase/migrations/00000000000000_baseline.sql#L…):

```sql
match_documents(
  query_embedding vector(768),
  query_text text,
  match_company_id uuid,
  match_entity_type text,    -- 'catalog_item' | 'work_item'
  match_count int,
  vector_threshold float,
  rrf_k int
) -> (id, entity_type, entity_id, content, metadata,
       vector_score, bm25_score, rrf_score)
```

Steps:
1. Embed query with Gemini `text-embedding-004` → 768d vector.
2. Vector cosine search (HNSW index) → top-N candidates.
3. BM25 keyword search (tsvector + GIN) → top-N candidates.
4. Reciprocal Rank Fusion merge (`k=60`).
5. Optional cross-encoder rerank on top-20 → top-5 (deferred to Phase 4).
6. Hydrate with entity metadata via `similar_catalog_items()` / `similar_quotes()`.

Frontend helpers on top of the RPC:
- `RagService.similar_catalog_items(company_id, query)` — joins `catalog_items` for `base_price`, `unit`.
- `RagService.similar_quotes(company_id, query)` — joins `quote_details_view` for line items.

## Cost Accounting

Every AI call flows through `services.ai_client.log_conversation(...)` which persists `agent_name`, `model`, `tokens_input`, `tokens_output`, `cost_usd`, `latency_ms`, `entity_type/id` to `ai_conversations`. Cost estimated from a static pricing table (Gemini rates as of 2025-11) — update quarterly.

Aggregates for the `/analytics/ai` dashboard come from `ai_cost_view`.

## Streaming Chat Contract

`POST /api/ai/chat` returns SSE events consumed by the Vercel AI SDK `useChat({ api: '/api/ai/chat' })` hook on the frontend.

Event types:

| Event         | Data                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `session`     | `{ "session_id": "..." }`                                            |
| `token`       | Text chunk (Phase 4 upgrades this to real per-token streaming)       |
| `tool_call`   | `{ "name": "...", "args": {...} }` (Phase 4)                          |
| `tool_result` | `{ "name": "...", "result": ... }` (Phase 4)                           |
| `agent_switch`| `{ "from": "router", "to": "quote_builder" }` (Phase 4)               |
| `done`        | `{ "ok": true }`                                                      |
| `error`       | `{ "message": "..." }`                                                |

Phase 2 ships event-per-chunk stub; Phase 4 wires the real ADK event → SSE mapping.

## Guardrails

- **Input**: Zod validation at the Next.js edge + Pydantic at the FastAPI boundary.
- **Output**: Pydantic `output_schema` on every `LlmAgent` — invalid JSON raises `AgentError`.
- **Content filter**: Gemini safety settings applied at model init.
- **Prompt injection**: Anti-hallucination rules embedded in every quote-builder / quote-updater prompt.
- **Company scoping**: `contextvars.ContextVar` set once by auth middleware — tools cannot access another tenant's data.

## Sessions

`PostgresSessionService` (`services/sessions.py`) subclasses ADK's `BaseSessionService` and persists sessions to `adk_sessions_v2`:
- `create_session` — upsert.
- `get_session` — fetch by PK.
- `append_event` — `SELECT … FOR UPDATE` + update, race-safe at low QPS.

Composite PK `(app_name, user_id, session_id)` matches ADK semantics. Sessions survive server restarts and horizontal scaling.

## Adding a New Agent (checklist)

1. Draft the prompt: `python-backend/src/quotepro/prompts/<name>_v1.md`.
2. If new tools needed, add them under `src/quotepro/tools/` and register in `agents/registry.py::_default_tool_registry()`.
3. If a new output schema, add a Pydantic model in `db/schemas.py` and register in `SCHEMA_REGISTRY`.
4. Append the agent entry in `config/agents.yaml`.
5. Add a factory in `agents/<name>.py` if you want a direct import path.
6. Golden-file test with a mocked Gemini response.
7. Consider whether the router should delegate to it (add classification example to `router_v1.md`).

## References

- [config/agents.yaml](../../python-backend/config/agents.yaml)
- [services/orchestrator.py](../../python-backend/src/quotepro/services/orchestrator.py)
- [services/sessions.py](../../python-backend/src/quotepro/services/sessions.py)
- [services/rag.py](../../python-backend/src/quotepro/services/rag.py)
- [ADR 0003](adr/0003-adk-multi-agent-postgres-sessions.md)
