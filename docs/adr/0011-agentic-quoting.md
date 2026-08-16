# ADR 0011 — Agentic quoting: per-tenant catalog RAG with a persistent session per quote

Date: 2026-08-16
Status: Proposed

## The problem

Quoting today is a one-shot generator. `generateQuoteItems` reads up to 200 catalog rows, puts
the first 80 in a prompt, and returns a complete list of line items. The editor replaces
everything it had.

Three consequences, all of which the contractor feels:

1. **An edit throws the work away.** Ask for a thermostat, get a price, then ask for 10% off —
   the only path is to draft again, and the second draft is not the first one with a discount. It
   is a different quote. Anything hand-adjusted in between is gone.
2. **The catalog is truncated arbitrarily.** Eighty items of a 200-row slice of a book that can
   run to thousands. Whether the right item is visible to the model depends on `order by` and
   luck, not on relevance to what was asked.
3. **Nothing is remembered.** Come back tomorrow and the model knows nothing about this quote —
   not what was asked for, not what was rejected, not why the price was changed.

## What already exists and was never connected

This is the important finding, and it changes the size of the work. Verified against the running
database on 2026-08-16:

| Thing | State |
| --- | --- |
| `pgvector` | **installed**, v0.8.2 |
| `document_embeddings` | table exists — `company_id`, `entity_type`, `entity_id`, `content`, `embedding`, `tsv`, `metadata`. **0 rows** |
| `match_documents(...)` | **exists** — hybrid search, vector + full-text with reciprocal rank fusion, already company-scoped |
| `ai_conversations` | table exists with `entity_type`, `entity_id`, `messages` jsonb, token and cost columns |

So the retrieval layer and the session store are both built. Neither has ever held a row. The
work is wiring, populating, and changing the generator into an agent — not building RAG from
nothing.

## Decision

**Build the agent in TypeScript against Vertex AI function calling, in-process. Do not
reintroduce Python or ADK.**

### Why not ADK

ADK is a Python framework. [ADR 0009](0009-ai-in-process.md) deleted the Python backend and moved
the AI in-process precisely to remove a service that two part-time people had to deploy, monitor
and keep in sync. Bringing ADK back means bringing that cost back.

The label is not the goal. What was actually asked for is: an agent that retrieves from the
company's own catalog, holds a session per quote, and edits rather than regenerates. Gemini's
function calling gives all three, in the process that already exists, with the session in a table
that already exists.

If ADK is wanted specifically — for its evaluation harness or multi-agent routing — that is a
separate decision with a real operational cost, and it should be taken on its own merits after
this ships. Nothing here forecloses it: the tools below are plain functions, and a future ADK
agent would call the same ones.

### The shape

**Retrieval.** Every `catalog_items` row is embedded into `document_embeddings` with
`entity_type = 'catalog_item'`. Retrieval goes through the existing `match_documents`, which
already fuses vector and keyword results and already takes `match_company_id` — so tenancy is
enforced inside the search, not around it. The model sees the ten or twenty items relevant to
what was asked instead of the first eighty in the table.

**Session.** One row in `ai_conversations` per work item, `entity_type = 'work_item'`,
`entity_id = work_items.id`. That is the unique key: a quote belongs to exactly one customer, so
"customer + quote" and "quote" identify the same thing, and the work item is the id the rest of
the product already uses. `messages` accumulates the turn history.

**Tools, not generation.** The agent is given functions that mutate the quote in place:

| Tool | Effect |
| --- | --- |
| `search_catalog(query)` | hybrid search, company-scoped |
| `read_quote()` | current line items and totals |
| `add_line_item(catalog_item_id, quantity)` | append |
| `update_line_item(id, quantity?, unit_price?)` | change one line |
| `remove_line_item(id)` | drop one line |
| `apply_discount(percent \| amount, label)` | a discount line, not a silent price edit |
| `ask_clarifying_question(question, options)` | when the catalog cannot cover what was asked |

"Add 10% off" becomes `read_quote` then `apply_discount`. Nothing regenerates, because there is
no generate step left — the quote is the database rows, and the agent edits them.

**Grounding stays absolute.** Tools accept a `catalog_item_id` that must exist for this company.
The model cannot invent a line item, because there is no tool that takes a free-text name and a
price. A hallucinated price the customer accepts is a contract the contractor has to honour, and
this removes the mechanism rather than instructing against it.

## Consequences

**Good.** Edits stop destroying work. Catalog size stops being a prompt-window problem — a
contractor with three thousand items gets better results than one with eighty, which is the
opposite of today. Sessions make the assistant continuous across days.

**The technician materials list falls out of this** rather than being a second feature. Once
accepted line items reference catalog rows, "what do I need to load before this job" is a query
over `quote_items → catalog_items`, and the stop at Home Depot is a list, not a guess.

**Costs.** Embedding is a per-catalog-item one-off plus re-embedding on edit; at Vertex's
text-embedding pricing a 3,000-item book is cents. Each agent turn is several model calls instead
of one, so a quote costs more than $0.00035 — but it is still far below the $0.24/customer/month
that all variable cost currently comes to. Watch it in `ai_conversations.cost_usd`, which exists
for this.

**Risks.** A tool-calling loop can run away; it needs a hard cap on turns and a budget per
session. Embeddings drift from the catalog if an edit does not re-embed — the write path must own
that, not a nightly job nobody watches.

## Staging

Each stage is shippable and useful alone.

1. **Embed the catalog.** Backfill + re-embed on write. Retrieval function over `match_documents`.
   Verifiable on its own: search "thermostat" and get thermostats.
2. **Swap retrieval into the existing generator.** Same one-shot behaviour, better item selection.
   No UI change, measurable quality change.
3. **Sessions.** Persist turns per work item; show the history in the editor.
4. **Tools and the agent loop.** The edit-in-place behaviour. This is the change the contractor
   notices.
5. **Materials list** for a scheduled job, from the accepted quote.

Stage 2 is the point at which the moat argument in `STRATEGY.md` gets real: quote quality becomes
a function of the contractor's own price book, and the bigger their book the better it gets.
