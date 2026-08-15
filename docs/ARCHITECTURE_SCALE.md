# Scaling architecture — recommendation

Date: 2026-08-15
Status: Recommendation, not yet decided

Grounded in the running system, not in general advice. Every claim below was checked against the
code or the database; where something is a judgement call it says so.

## Can it hold 2–3 million records cheaply? Yes, and it is not close.

Measured, not estimated. 200,000 work items were loaded into a scratch tenant on the current
schema and the pipeline query was run against them:

| | |
| --- | --- |
| Marginal storage per work item, **including all ten indexes** | **571 bytes** |
| Pipeline query at 200k rows (tenant + status, ordered, limit 50) | **0.68 ms** |
| Plan | Index scan on `work_items_company_created_idx`, no sequential scan |

At that rate, 3 million work items is **≈1.7 GB** including indexes. With their customers,
addresses, line items and invoices alongside, call it well under 20 GB. That fits on the smallest
paid tier of any managed Postgres, with room to spare.

**The database is not your cost problem at this scale, and no amount of AlloyDB changes that.**
The composite tenant-first indexes already in place — `(company_id, status)`,
`(company_id, created_at)`, `(company_id, kind)` — are exactly the shape these queries need, and
they are why the plan stays sub-millisecond as rows grow. Postgres on modest hardware handles
tens of millions of rows of this shape.

### What actually costs money at 3 million records

Not storage and not queries. In order:

1. **AI calls.** A variable cost on every draft. This is the dominant line item at volume, and it
   is the reason the model chain and the "ask instead of guessing" change matter commercially as
   well as for quality — `gemini-2.5-flash-lite` over the full-size model is roughly an order of
   magnitude, and a quote that asks one question instead of generating twelve wrong lines is
   cheaper too.
2. **Serverless execution time.** Vercel bills active CPU, so holding a function open while an AI
   call completes is billed work. See item 3 in the plan below — moving drafting out of the
   request path is a cost change, not just a concurrency one.
3. **Photo storage and egress.** The only line that grows with raw bytes. Worth revisiting
   storage vendors when photo volume is real; irrelevant before that.

Nothing on that list is fixed by changing database engine or cloud.

## The headline

**Do not migrate anything.** Vercel + Supabase Postgres + Vertex AI is the right stack for this
product, and none of the scaling risks in it are vendor problems. The work that actually matters
is unglamorous: make tenancy enforceable rather than conventional, get eyes on production, and
take the AI out of the request path. A database migration would consume the quarter and fix none
of those.

Current volume is trivial — 15 work items, 101 catalog items — so this is about the shape you
build into, not about pain you are feeling.

## The one thing that must change

**Tenancy is enforced by hand-written SQL predicates, and nothing else.**

The `pg` pool connects as superuser, so it bypasses RLS entirely. There are 75 row-level policies
on public tables and 44 of them call `auth.uid()` — and **none of them ever run**, because
nothing queries the database with the anon key. Every read and write goes through the superuser
pool. The policies are decoration.

What actually stops one contractor seeing another's book of business is a developer remembering
`where company_id = $n` on every statement, backed by a static scanner in the test suite. That
scanner is good — it caught three of my own mistakes this week — but it is a grep, and it can
only flag what it can pattern-match.

This holds at one engineer. It does not hold at five.

**The fix needs no new vendor.** Connect as a non-superuser role and set `request.jwt.claims` on
the connection, the way `withUser()` already does for the two SQL functions that need
`auth.uid()`. The 44 policies stop being decoration and become a real second line, so a missed
predicate returns nothing instead of returning another tenant's data. This is the highest-value
structural change available and it is entirely inside the existing stack.

It is also the strongest argument for keeping auth in the same database: those policies only work
because identity is a row in the same Postgres.

## The second thing: you cannot see production

`NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_POSTHOG_KEY` are declared in `env.ts` and **nothing
reads them**. There is no error reporting and no product analytics in a product that is being
shown to real users.

The cost of that is already on the record. Earlier this session: `removeConsole` was stripping
`console.error` so production had no diagnostics at all; the middleware matcher was redirecting
every `/api/*` route to `/login`, so Stripe webhooks had never once been delivered; Gemini
credits ran out and every quote silently became keyword matching. Each was found by someone
looking, not by being told.

Wire Sentry and PostHog before anything else on this list. They are configured already.

## The third thing: AI runs inside the request

`generateQuote()` is awaited inline in a Server Action. It is fast now — `gemini-2.5-flash-lite`
answers in a couple of seconds — but it was 23–70s before the model chain was tuned, and a
function instance is held open for the whole call. That is fine at ten quotes a day and a problem
at a thousand, because concurrency is bounded by how long each request holds its instance.

Move drafting to a job: write a row, return immediately, stream or poll the result. Vercel Queues
or a `work_item_drafts` table with a cron both work; the point is the request stops waiting.

The same applies to PDF generation and any future embedding indexer.

## What is already right

Worth saying, because it means the foundation is sound:

- **Indexes are properly composite and tenant-first** — `(company_id, status)`, `(company_id, kind)`, `(company_id, created_at)`. That is the correct shape for every query this app makes, and it is the thing most teams get wrong.
- **There is a real API surface** — eight route handlers alongside the Server Actions. A mobile app later has something to talk to.
- **Tests run against real Postgres in CI**, 185 of them, including a tenancy scanner and cross-tenant assertions.
- **Degrade-not-fail is applied consistently** — AI, address autocomplete and email all fall back rather than erroring.
- **pgvector 0.8.2 is installed** with a `document_embeddings` table and a `match_documents()` RPC already in place.

## Ordered plan

| # | Change | Why now | Effort |
| - | ------ | ------- | ------ |
| 1 | Wire Sentry + PostHog | Already configured; you are flying blind | Hours |
| 2 | Non-superuser DB role + `request.jwt.claims` | Turns 44 dead policies into real enforcement | Days |
| 3 | AI drafting out of the request path | Concurrency ceiling, not latency | Days |
| 4 | Cache the catalog and company settings | Every page currently hits Postgres; nothing uses `revalidate` or `unstable_cache` | Days |
| 5 | Wire the embeddings that already exist | RAG is built and has 0 rows; retrieval over past accepted quotes is the real quality lever | Days |
| 6 | Read replica | Only when read latency actually hurts | Hours, when needed |
| 7 | Multi-region | Only when customers are outside one geography | Later |

Items 1–3 are the ones that change what happens when this grows. Everything below 4 is an
optimisation you should not pay for until something hurts.

## On the vendor questions

Asked and answered concretely, so they stop being relitigated:

**Storage → GCS** is fine and cheap: 5 call sites, roughly a day. Do it if fewer vendors is worth
that to you. It changes nothing structural.

**Database → Cloud SQL or AlloyDB** breaks 10 foreign keys to `auth.users` and the 44 policies
above. AlloyDB additionally costs more than Cloud SQL, which already costs more than the bundled
Supabase plan at this size. AlloyDB's genuine advantage is vector and analytical workload — and
pgvector is already installed here with nothing writing to it, so that advantage is unrealised
for a reason that has nothing to do with the engine.

**Firebase Auth / Identity Platform** is the coherent all-GCP choice if you ever commit to one
vendor. **Firestore is not** — this data model is relational to its core, and moving would mean
rewriting the data layer and losing the tenancy scanner.

The incoherent option is Supabase-auth-plus-GCP-database: it pays both vendors and discards the
integration that makes Supabase auth worth having.
