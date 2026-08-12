# ADR 0009: Run the AI In-Process, Delete the Python Backend

**Status**: Accepted
**Date**: 2026-08-11
**Deciders**: @dipenvekaria

**Supersedes** [0008](0008-single-python-backend.md) — the one surviving Python
backend is now gone too.
**Amends** [0005](0005-hosting-vercel-railway-supabase.md) — Railway is dropped;
Vercel + Supabase Cloud stand.

## Context

`ai_backend.py` was ~450 lines: three routes, a Gemini call, two Supabase reads.
It never deployed. Two sessions went into Railway — root directory, `$PORT`
binding, a vulnerability scanner blocking the build on a transitive `next`
advisory that had nothing to do with Python — and production still had no AI.

The service also cost more than its size suggests:

- a second runtime, a second deploy, a second set of environment variables
- a shared secret (`RIVET_BACKEND_SECRET`) that had to match byte-for-byte on
  both sides, plus CORS configuration, to protect a call that only ever came
  from our own server
- two processes to start before a new engineer could generate one quote
- `company_id` arriving in a request body, which the server action already had
  from the session

Vercel does run Python, but its documented route for a Python API alongside a
Next.js frontend is [Services](https://vercel.com/docs/services) — one service
per root directory. Next.js lives at the repo root, so adopting it meant moving
the app into `frontend/`, moving `prompts/` inside the backend root (a service
build context cannot see `../prompts`), splitting build config per service, and
depending on a permission-gated feature. More moving parts than the thing it
was hosting.

## Decision

**Call Gemini directly from the Next.js server actions.** `src/lib/ai/`
replaces `python-backend/`, which is deleted.

| Before | After |
| --- | --- |
| `POST /api/ai/generate-quote` over HTTP | `generateQuote()` in `src/lib/ai/quote.ts` |
| `POST /api/ai/explain-quote` over HTTP | `explainQuote()` in `src/lib/ai/explain.ts` |
| `google-genai` (Python) | `@google/genai` (TypeScript) |
| `RIVET_BACKEND_SECRET`, `BACKEND_INTERNAL_URL`, `ALLOWED_ORIGINS`, CORS | — |
| Supabase service-role client for reads | `query()`, tenant-scoped like everything else |

Unchanged on purpose: Gemini only, the `GEMINI_MODELS` fallback chain, the mock
keyword generator, `mode` reporting `gemini:<model>` or `mock`, and prompts as
markdown in `prompts/`.

## Consequences

**The trust boundary disappears rather than being secured.** Three of the four
items on the rivet-ai skill's security to-do list — verify the JWT, derive
`company_id` from it, restrict CORS — are now structurally satisfied: the code
runs inside the authenticated server action with the session in scope. Rate
limiting is the one that remains.

**Prices are no longer set by the model.** The port added a reconciliation step:
every returned line item is matched back to a catalog row and priced from the
database. An item matching nothing is dropped and logged. This was not a
faithful port — the Python trusted `unit_price` as returned — but it closes a
path where a hallucinated number reaches a customer as a binding quote. The
first live test returned `unit_price: 2450.0000000000005`, which reconciliation
discarded in favour of the catalog's 2450. Duplicate items are collapsed for the
same reason: the model emitted `Standard Labor` twice, which would have billed
six hours instead of three.

**One process for local dev.** `npm run dev` is now the whole stack. The
`dev:api` script is gone.

**The AI shares the function's limits.** Quote generation now runs inside a
Vercel Function — 300s default on Fluid Compute, well clear of a Flash call. If
the AI ever needs a long-running process, background work, or a websocket, that
is the point to revisit this, not before.

**RAG gets further away.** The hybrid retrieval work in the deleted
`src/quotepro/` tree was Python. `document_embeddings` and `match_documents()`
still exist, and pgvector retrieval is reachable from TypeScript, but no code
survives to lift.

**`gemini-2.5-flash` is retired.** Live testing during the port returned 404
"no longer available to new users", so the default chain now leads with
`gemini-flash-latest`. The old order cost a wasted round-trip on every quote.
