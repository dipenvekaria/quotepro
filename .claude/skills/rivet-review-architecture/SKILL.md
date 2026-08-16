---
name: rivet-review-architecture
description: Use when asked for an architecture review, when a change spans several layers, when something needs to scale or cost less, or when a decision deserves an ADR. Judges against what this system actually is — one Next.js process, raw pg, Vertex AI — not against a reference architecture.
---

# Architecture Reviewer

The job is to keep this system boring in the places that matter and let it be interesting in the
one place that earns it.

## What it is

One Next.js process runs the entire product. Reads are Server Components calling `query()`.
Writes are Server Actions colocated with the route. Postgres is reached with raw `pg` and
parameterised SQL — **no ORM**. Auth is Supabase (auth only, never data reads). AI is Gemini via
Vertex, called in-process. Hosting is Vercel + Supabase Cloud.

Read `docs/ARCHITECTURE.md` and `docs/ADR/` before proposing anything. Several settled decisions
look open because abandoned artifacts are still in the tree — `k8s/deployment.yaml`,
`docker-compose.yml` and a commit titled "GCP-native" are all from a direction that was dropped.
**Do not propose a GCP migration off the back of them.**

## Review in this order

**1. Does it belong in the request path?** Fluid Compute bills active CPU, so awaiting a slow
external call is largely unbilled — this reverses the usual instinct. A recommendation to move
AI out of the request path on cost and concurrency grounds was wrong for exactly this reason and
had to be amended in `docs/ARCHITECTURE_SCALE.md`. Check the billing model before optimising for
it.

**2. Where does tenancy live?** Every new access path is a new place to forget `company_id`. If
a change adds one, it must also add the predicate and pass `tests/tenancy.test.ts`.

**3. What happens at 3 million rows?** A `work_item` is ~571 bytes across ten indexes, so 3M is
about 1.7 GB — storage is not the constraint. Query shape and missing indexes are. Check that
new filters have an index and that `limit` exists on anything unbounded.

**4. Does it add a process?** A worker, a queue, a second service, Redis — each is real
operational burden for a two-person team. The Python backend was deleted and the AI moved
in-process precisely to remove one ([ADR 0009](../../docs/adr/0009-ai-in-process.md)). The bar
for adding one back is a measured problem, not an anticipated one.

**5. Is it one source of truth?** Duplication drifts and then contradicts. `/analytics` and the
dashboard computed the same three metrics from the same columns in two implementations and
disagreed cosmetically — "Close rate 71%" against "Acceptance rate 71.4%" — which reads as two
metrics contradicting each other. Prefer one definition with two presentations.

**6. Can it be a view or a column?** `company_activation` measures signup-to-first-quote from
timestamps that already existed. No instrumentation, no new table, no event pipeline. Reach for
that before building machinery.

## Cost

Measure before arguing. The numbers that exist:

| | measured |
| --- | --- |
| AI quote draft | $0.00035 |
| All variable cost per customer/month | ~$0.24 |
| Fixed infrastructure | ~$111/month |
| Gross margin at $249 | 96.9% |

**The AI is three hundredths of one percent of the subscription.** Economising on model choice
for cost reasons is misplaced; choose for latency or quality. If a proposal is justified by
infrastructure savings, check the saving against $111/month before taking it seriously.

## Traps that are load-bearing

- Hosted Postgres needs `ssl: { rejectUnauthorized: false }` — `pg` treats `sslmode=require` as
  `verify-full` and Supabase's pooler chain is untrusted. Handled in `src/lib/db/index.ts`.
- `DATABASE_URL` is not Zod-validated and fails late as a connection error.
- `withUser(userId, fn)` sets `request.jwt.claims` inside the transaction — required by the SQL
  functions that call `auth.uid()`. Plain `query()` leaves it NULL.
- Money returns as `number` and timestamps as ISO strings, not `Date` — custom parsers.
- Prompts reach production via `outputFileTracingIncludes`; remove it and every prompt silently
  falls back to an inline default.
- Server Action bodies cap at 1MB by default. Phone photos are 2–5MB. `bodySizeLimit` is set for
  a reason.

## Writing it up

Non-obvious decisions become an ADR in `docs/adr/`. Record what was rejected and why — the
purpose is to stop the decision being relitigated every time someone reads a competitor's
marketing page.

Amend rather than delete when you were wrong. `ARCHITECTURE_SCALE.md` carries a correction to its
own recommendation, and that correction is the most useful paragraph in it.

Be specific about confidence. "Measured on this machine", "read from the code", and "assumed
from vendor docs" are three different claims and the reader cannot tell them apart unless you
say.
