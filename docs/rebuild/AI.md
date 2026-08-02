# AI Architecture

> **Populated in Phase 4.** Placeholder for Phase 0.

## Overview

Multi-agent system on Google ADK 1.20 + Gemini 2.0 Flash/Pro. Router agent delegates to specialized sub-agents. Hybrid RAG (BM25 + pgvector cosine + RRF) grounds all generations. Sessions durable in Postgres (`adk_sessions_v2`). Streaming chat via SSE consumed by Vercel AI SDK on the frontend.

## Agent Registry

Declared in `python-backend/config/agents.yaml`. Each agent has: name, description, prompt file, model, temperature, output schema, tools.

Planned agents:

- `router` — top-level orchestrator
- `quote_builder` — new quote generation
- `quote_updater` — incremental edits with discount recalc
- `job_namer` — 3–5 word job names
- `upsell_suggester` — data-driven upsell recommendations
- `quote_optimizer` — win probability + price sensitivity
- `invoice_drafter` — draft invoice from completed job
- `schedule_assistant` — schedule jobs based on tech availability

## Prompt Versioning

Prompts live under `python-backend/src/quotepro/prompts/` versioned by filename suffix (`quote_builder_v1.md`). Per-company overrides via the `ai_prompts` table.

## RAG Pipeline

1. Query → embedding (Gemini `text-embedding-004`, 768d).
2. Parallel BM25 (`ts_rank_cd`) + cosine (`<=>`) search.
3. Reciprocal Rank Fusion merge.
4. Optional cross-encoder rerank top-20 → top-5.
5. Inject into prompt.

## Cost Accounting

Every AI call logs to `ai_conversations` with model, tokens_in, tokens_out, cost_usd, latency_ms, entity_id. View `ai_cost_view` aggregates daily $ per company. Frontend `/analytics/ai` shows charts + top-spending features.

## Adding a New Agent

_TBD — checklist for adding an agent to `agents.yaml`, wiring tools, writing tests._

## Streaming Chat Contract

`POST /api/ai/chat` returns SSE with event types: `token`, `tool_call`, `tool_result`, `agent_switch`, `done`. Frontend consumes via `useChat({ api: '/api/ai/chat' })`.

## Guardrails

- Input: Zod at Next boundary + Pydantic at FastAPI boundary.
- Output: Pydantic `output_schema` on every `LlmAgent`.
- Content filter via Gemini safety settings.
- Prompt-injection: strip suspicious tokens, reject overrides.
