---
name: rivet-ai
description: Use when changing anything about Rivet's AI — quote generation quality, prompts, Gemini models, grounding, or adding a new AI capability. Enforces the Google-only model policy and the grounding rules that keep generated prices trustworthy.
---

# Rivet AI

## Model policy — not negotiable

**Google Gemini only.** No GPT, Claude, Llama, Mistral, Cohere, Grok, DeepSeek, or Qwen in
product code. This is a standing decision from the product owner, not a default to optimise
away. If a task seems to need another provider, raise it — don't switch.

Chain: `gemini-flash-latest` → `gemini-flash-lite-latest`, configured via `GEMINI_MODELS`, not
hardcoded.

**Do not pin a dated Gemini model here.** The chain used to also carry `gemini-2.5-flash`,
`gemini-2.5-flash-lite` and `gemini-2.0-flash`; all three now return 404 "no longer available",
and each dead entry was a wasted round-trip on the way to one that works. The floating aliases
do not expire.

Every call sets `thinkingLevel: MINIMAL` and `maxOutputTokens`. Both are load-bearing:
`gemini-flash-latest` is a thinking model, and unconstrained it took **70-230 seconds** per
quote and once emitted 63KB of JSON before failing to parse. With them, the same quotes come
back in **1.5-2 seconds**. `thinkingBudget: 0` is rejected outright with 400 INVALID_ARGUMENT —
MINIMAL is as low as these models go. The response schema also caps `line_items` at 12; without
a ceiling the model walked the whole catalog into the reply.

SDK: `@google/genai` (TypeScript). Pin `< 3.0.0`; version 3 requires Node 22+ and drops APIs.

Settings, every call:

- **Temperature ≤ 0.2.** Money and JSON must be deterministic. Default to 0.
- **`responseMimeType: "application/json"`** whenever output is parsed.
- **`responseSchema`** — the SDK supports one, so always pass it.

## Where it lives

`src/lib/ai/`, called in-process from server actions. There is no AI service, no HTTP hop and
no Python — `python-backend/` was deleted on 2026-08-11, see
`docs/adr/0009-ai-in-process.md`.

| File | Does |
| --- | --- |
| `gemini.ts` | Client, model chain, `generateJson()`. Every model call goes through here. |
| `quote.ts` | `generateQuote()` — catalog fetch, prompt, reconciliation, mock fallback. |
| `explain.ts` | `explainQuote()` — plain-language summary for the homeowner. |
| `prompts.ts` | Reads `prompts/*.md`. |

Prompts live in `prompts/` as markdown. Behaviour changes go there, not into string literals.
They reach production through `outputFileTracingIncludes` in `next.config.ts`; without it
`readFileSync` misses and every prompt silently falls back to its inline default.

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
4. **Reconcile** — match every returned item back to a catalog row by name, price it from the
   database, drop anything that matches nothing, collapse duplicates.
5. Return `{ line_items, tax_rate, reasoning, mode, sources }`.

**Step 4 is why prices can be trusted.** The model chooses which items and how many; it does not
set what they cost. Its `unit_price` is read and discarded — the first live test returned
`2450.0000000000005` for a $2450 item. Don't "simplify" this by trusting the model's number.

An unmatched item is logged as `ai/quote: dropped items with no catalog match`. That warning is
the signal that the catalog is missing something the contractor sells, which is a product
problem, not a prompt problem.

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

## Adding a capability

A new AI feature is a function in `src/lib/ai/` plus a server action that calls it. Keep the
shape:

```ts
export async function doThing(input: {...}): Promise<{ ...; mode: string }> {
  if (!aiEnabled()) return { /* degraded result */, mode: 'mock' }

  const result = await generateJson({ system: loadPrompt('thing.md', FALLBACK), contents, schema })
  if (!result) return { /* degraded result */, mode: 'mock' }
  // ...
}
```

Rules that are not optional:

- **Never trust a number the model returns.** Resolve it against the database, as `quote.ts`
  does. This applies to prices, quantities against stock, dates against a calendar.
- **Every function returns `mode`.** `gemini:<model>` or `mock`. The UI and production alerting
  both read it.
- **Decide what a failure means before you write it.** Quoting falls back to keyword matching
  because a rough quote beats no quote. The customer summary returns an empty string because a
  fabricated explanation reaches a homeowner as the contractor's own words. Both are deliberate;
  copy the reasoning, not one of the answers.
- **The server action owns tenancy.** `companyId` comes from `getSession()` and is passed in.
  Nothing in `src/lib/ai/` should ever read a company id from user input.

## Security

The shared secret, the CORS config and the second origin are gone with the service. Three of the
four items that used to be on this list — verify the JWT, derive `company_id` from it, restrict
CORS — are now structurally satisfied: the code runs inside the authenticated server action with
the session in scope.

What remains: **per-user rate limiting.** Nothing stops one account burning the Gemini quota for
everyone, and the quota is shared.

## RAG

`document_embeddings` (with a tsvector column) and the `match_documents()` RPC still exist.
Retrieving *similar past quotes* rather than dumping the raw catalog remains the single
highest-value AI improvement available — it would improve accuracy and the contractor's sense
that the tool understands their business.

The Python implementation of this (hybrid BM25 + pgvector + reciprocal rank fusion, in the old
`src/quotepro/` tree) was deleted along with the rest. pgvector is reachable from TypeScript via
`query()`, so the schema work carries over but the retrieval code does not. Record the approach
as an ADR before building it.

## Cost

Gemini Flash is cheap, but quote generation is the core loop and it runs on every job. Keep the
catalog slice bounded (currently 80 items), don't resend unchanged context, and use
`ai_cost_view` to watch per-company spend. If a company's catalog outgrows the prompt window,
that's the moment RAG stops being optional.
