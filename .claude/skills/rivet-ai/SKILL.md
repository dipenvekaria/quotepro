---
name: rivet-ai
description: Use when changing anything about Rivet's AI — quote generation quality, prompts, Gemini models, the FastAPI backend, or adding a new AI capability. Enforces the Google-only model policy and the grounding rules that keep generated prices trustworthy.
---

# Rivet AI

## Model policy — not negotiable

**Google Gemini only.** No GPT, Claude, Llama, Mistral, Cohere, Grok, DeepSeek, or Qwen in
product code. This is a standing decision from the product owner, not a default to optimise
away. If a task seems to need another provider, raise it — don't switch.

Preference order, newest first: `gemini-2.5-flash` → `gemini-flash-latest` →
`gemini-2.5-flash-lite` → `gemini-flash-lite-latest` → `gemini-2.0-flash`. The chain is
configured via the `GEMINI_MODELS` env var, not hardcoded.

SDK: unified `google-genai` (`from google import genai`). Not the deprecated
`google-generativeai`. The same client targets AI Studio (API key) or Vertex AI (ADC), toggled
by `GOOGLE_GENAI_USE_VERTEXAI`.

Settings, every call:

- **Temperature ≤ 0.2.** Money and JSON must be deterministic. Default to 0.
- **`response_mime_type: "application/json"`** whenever output is parsed.
- **Response schema** where the SDK supports one.

## Where it lives

`python-backend/ai_backend.py` — 340 lines, the only Python file that runs. One endpoint:
`POST /api/ai/generate-quote`, plus `GET /health`.

Everything else under `python-backend/` is dead: `src/quotepro/` (a complete unwired ADK
multi-agent backend), `app/`, `api/`, `services/`, and the loose root `.py` files. Do not edit
them and do not copy patterns from them without checking `docs/CODEBASE_MAP.md` first.

Prompts live in `prompts/` as markdown. Behaviour changes go there, not into string literals in
Python.

## Grounding is the whole game

The system prompt says: use ONLY items from the provided catalog, never invent one.

That constraint is load-bearing. A hallucinated line item is a price the contractor is
contractually on the hook for after the customer accepts. Quote quality is a function of catalog
quality, not model cleverness — which is why catalog import and onboarding matter more to
output quality than any prompt tweak.

The flow:

1. Fetch active `catalog_items` for the company (capped at 200, first 80 into the prompt).
2. Build the prompt: job description, customer, address, catalog.
3. Call Gemini with JSON mime type and a schema.
4. Parse, coerce each line item, drop anything without a name.
5. Return `{ line_items, tax_rate, reasoning, mode, sources }`.

`mode` tells the caller what produced the result — `gemini:<model>` or `mock`. Keep it accurate;
the UI and production alerting both read it.

## Two fallbacks, both intentional

**Model chain.** `GEMINI_MODELS` is tried in order until one succeeds. A quota limit on the
newest flash model degrades to the next rather than failing the request.

**Mock generator.** If every model fails, a keyword matcher over the catalog returns plausible
line items and `mode` becomes `mock`. This keeps the whole UI exercisable offline and means a
Gemini outage doesn't take quoting down.

Don't remove either. Do make sure production alerts when `mode == "mock"` — silently shipping
keyword-matched quotes to real customers is worse than an error.

## Changing prompts

1. Edit the markdown in `prompts/`.
2. Test against several real job descriptions, not one. HVAC replacement, a small plumbing
   repair, a multi-option roofing quote.
3. Check it still returns valid JSON under the schema.
4. Check it still refuses to invent items — give it a description with no catalog match and
   confirm it degrades gracefully rather than fabricating.
5. Note the before/after in the PR. Prompt changes are behaviour changes.

The `ai_prompts` table exists for versioning prompts per company. It's barely used; if you build
on it, say so in an ADR.

## Adding an endpoint

Keep the existing shape:

```python
class ThingRequest(BaseModel):
    company_id: str
    # ...

class ThingResponse(BaseModel):
    # ...
    mode: str

@app.post("/api/ai/thing", response_model=ThingResponse)
def thing(req: ThingRequest) -> ThingResponse:
    ...
```

Pydantic models for request and response, always. Validate the response on the frontend with Zod
in the server action that calls it — `generateQuoteItems` in
`src/app/app/(shell)/quotes/new/actions.ts` is the pattern. That is how contract drift surfaces
immediately instead of three screens later.

(`src/lib/ai/client.ts` and `src/types/api.ts` used to be cited here. Both were dead — imported
only by the unwired `src/features/ai/**`, and `types/api.ts` mirrored the *dead* Python backend's
schemas. Deleted 2026-08-09.)

## Security — read before deploying

As of 2026-08-09 the service requires a shared secret (`X-Rivet-Key`, matching
`RIVET_BACKEND_SECRET` on both sides) on every `/api/*` request, CORS defaults to empty, and
`company_id` comes from the session inside a server action rather than from the caller.

That is an internal-prototype measure, not the end state. One server action is still the only
thing between a request and any tenant's pricing.

Any work in this file should move it toward:

1. Verify the Supabase JWT on every request.
2. Derive `company_id` from the token — never trust the body.
3. CORS restricted to the production origin.
4. Per-user rate limiting.

## The unwired backend

`python-backend/src/quotepro/` is a complete, tested FastAPI application: ADK multi-agent
routing, hybrid RAG (BM25 + pgvector + reciprocal rank fusion), Postgres-backed sessions, an arq
indexer worker, rate limiting, OpenTelemetry. It was built during the rebuild and never
connected.

The schema for it already exists — `document_embeddings` with a tsvector column, and the
`match_documents()` RPC. Adding RAG grounding to `ai_backend.py` is therefore mostly wiring, and
it's the single highest-value AI improvement available: retrieving *similar past quotes* rather
than dumping the raw catalog would improve both accuracy and the contractor's sense that the
tool understands their business.

Adopting the whole thing is a bigger call — Redis, a worker process, real ops burden. That
decision is open in `docs/CLEANUP_PLAN.md` Phase 2 and should be recorded as an ADR either way.

## Cost

Gemini Flash is cheap, but quote generation is the core loop and it runs on every job. Keep the
catalog slice bounded (currently 80 items), don't resend unchanged context, and use
`ai_cost_view` to watch per-company spend. If a company's catalog outgrows the prompt window,
that's the moment RAG stops being optional.
