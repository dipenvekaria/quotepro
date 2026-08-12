# ADR 0008: One Python Backend — Delete the Other Three

> **Superseded by [ADR 0009](0009-ai-in-process.md) (2026-08-11).** The one backend this ADR
> chose to keep, `ai_backend.py`, has itself been deleted. There is no Python in the repo.


**Status**: Accepted
**Date**: 2026-08-11
**Deciders**: @dipenvekaria

## Context

`python-backend/` accumulated four generations of backend across the rebuild.
Exactly one of them runs:

| Tree | Files | Lines | Status |
| --- | ---: | ---: | --- |
| `ai_backend.py` | 1 | ~350 | **Serves all traffic** |
| `src/quotepro/` | 38 | 2,959 | Complete, tested, never wired |
| `services/` | 12 | 2,464 | Superseded |
| `app/` | 16 | 1,889 | Superseded |
| `api/` | 9 | 1,643 | Superseded |
| `db/` | 6 | 635 | Superseded |
| `config/` | 3 | 130 | Superseded |

`src/quotepro/` is the interesting one, and
[CLEANUP_PLAN.md](../CLEANUP_PLAN.md) fairly calls it *"the most valuable dead
code in the repo"*: ADK multi-agent routing, hybrid RAG over
`document_embeddings`, Postgres-backed agent sessions, an arq indexer worker,
rate limiting, OpenTelemetry — with tests. It was built during the rebuild and
never connected to anything.

Keeping four backends has a real cost beyond disk. It makes `grep` misleading,
it gives a new contributor four plausible places to make a change, and three of
the four import a data layer that no longer matches the schema. `CODEBASE_MAP.md`
has to carry a table explaining which is real.

## Decision

**Keep `ai_backend.py`. Delete the other three trees and the superseded loose
root files.**

This follows the recommendation already written into `CLEANUP_PLAN.md` Phase 2
for a two-person team pre-launch: keep the backend you can hold in your head,
and lift specific pieces from the deleted tree as they earn their place.

Deleted: `src/`, `app/`, `api/`, `db/`, `config/`, and the root `.py` files other
than `ai_backend.py` — `main.py`, `auto_indexer.py`, `catalog_indexer.py`,
`quote_indexer.py`, `tax_rates.py`, `check_db.py`, plus the test files that only
exercised them.

**Nothing is lost.** It is all in git history, and this ADR records what to look
for.

## What to retrieve, and when

The single highest-value piece is **RAG grounding for quote generation**, and
most of the work already exists on the database side — `document_embeddings`
with a `tsvector` column and an HNSW index, plus the `match_documents()` RPC
doing hybrid BM25 + cosine retrieval with reciprocal rank fusion. All of that is
in the live baseline schema and stays.

What was deleted, and where to find it:

| Piece | Path at deletion |
| --- | --- |
| RAG retriever | `python-backend/src/quotepro/services/rag.py`, `tools/rag.py` |
| Embedding indexer | `services/indexer.py`, `workers/indexer_worker.py` |
| Indexing API | `api/indexing.py` |
| Gemini client wrapper | `services/ai_client.py` |

Retrieve them with `git log --all -- python-backend/src/quotepro/`.

**The trigger:** `ai_backend.py` currently dumps the first 80 catalog items into
the prompt. When a contractor's catalog outgrows that window, retrieving
*similar past quotes* instead of raw catalog rows becomes the obvious next step —
better output and a stronger sense that the tool understands their business.
That is the moment to lift the retriever, not before.

## Consequences

**Positive**
- One backend. `python-backend/` becomes `ai_backend.py`, its prompts, and its
  requirements.
- `CODEBASE_MAP.md` no longer needs a dead-code table; the frontend equivalent
  went in Phase 1 and this removes the last of it.
- Grep results mean what they appear to mean.

**Negative**
- The multi-agent and RAG work has to be rebuilt or recovered from history if it
  is wanted. Accepted: it was never wired up, so nothing regresses, and the
  schema it depended on is untouched.

**Neutral**
- `document_embeddings`, `match_documents()`, and the pgvector extension stay in
  the schema. They cost nothing unused and they are the half of the RAG work
  that is genuinely hard to redo.
