# Architecture

_Current as of 2026-08-07, branch `main`. Supersedes the pre-rebuild version of this
file and everything under `docs/rebuild/`._

## Shape

```
                    ┌──────────────────────────────┐
   Contractor ─────▶│  Next.js 16 App Router       │
   (authenticated)  │  React 19 · Tailwind 4       │
                    │                              │
                    │  RSC ──── query() ───────────┼──▶ ┌──────────────┐
                    │  Server Actions ─────────────┼──▶ │  Postgres    │
                    │                              │    │  (Supabase)  │
   Customer ───────▶│  /q/{token}  /i/{token}      │    └──────┬───────┘
   (no account)     │  service-role read           │           │
                    └───────┬──────────────────────┘           │
                            │                                  │
                     JWT verify │                       auth.users
                            ▼                                  │
                    ┌──────────────────┐            ┌──────────▼─────────┐
                    │  Supabase Auth   │            │  FastAPI           │
                    │  cookies, OAuth  │            │  ai_backend.py     │
                    └──────────────────┘            │  Gemini            │
                                                    └────────────────────┘

   Resend (email) · Stripe Connect (payments) · SignNow (e-signature)
```

Three deliberate choices explain most of the code you'll read.

## 1. Postgres directly, not through Supabase's client

Every read and write in the live app goes through `src/lib/db/index.ts` — a `pg` connection
pool, parameterized SQL, no ORM.

Supabase is still the database host and still owns authentication. It is not the data layer.
The reasons: PostgREST forced awkward shapes on multi-table reads (embeds that silently break
when a column is renamed — that caused two production 404s, see
`docs/GO_TO_MARKET_CHECKLIST.md`), server-side joins were being emulated in TypeScript, and
staying on plain SQL keeps the door open to move off Supabase without rewriting the app.

The consequence you must internalise: **the pool connects as superuser and bypasses RLS.**

RLS policies exist on every table and are correct. They protect the anon and authenticated
Postgres roles — which is what the public token routes and any future direct client access use.
They do not protect `query()`. Tenant scoping in application code is the primary control:

```ts
const { companyId } = await requireSession()
await query('select ... from work_items where id = $1 and company_id = $2', [id, companyId])
```

Two more things live in that file and surprise people:

- **Type parsers are overridden.** `numeric` comes back as a JS `number`, not a string, so money
  arithmetic works. `date`/`timestamp`/`timestamptz` come back as raw ISO strings, not `Date`
  objects, matching the `string` types the app declares.
- **`withUser(userId, fn)`** opens a transaction and sets `request.jwt.claims` inside it, so SQL
  functions that call `auth.uid()` internally resolve correctly. Required for
  `create_work_item_with_customer` and `bootstrap_company`. A plain `query()` leaves
  `auth.uid()` NULL and those functions fail.

## 2. Server Actions for writes, RSC for reads

There is no REST API for the product. `src/app/api/**` is dead except the vitals beacon.

A route directory owns its own data access:

```
src/app/app/(shell)/pipeline/[id]/
  page.tsx              Server Component — query(), renders
  actions.ts            'use server' — Zod in, { ok, data } | { ok, error } out
  work-item-detail.tsx  'use client' — interaction only
```

Actions never throw to the client. They validate with Zod, verify ownership, mutate, call
`revalidatePath()`, and return a discriminated result the client narrows on. Errors surface as
toasts, not error boundaries.

This keeps the request waterfall short — a page render is one round trip to Postgres from the
server, with no client-side fetch layer, no React Query cache to invalidate, and no API schema
to keep in sync.

## 3. One table for the whole lifecycle

`work_items` is a lead, a quote, a job, and an archived record — the same row throughout.
`status` moves through the lifecycle; `kind` is derived from it for board filters and indexes.

Converting a lead to a quote is `UPDATE work_items SET status = 'quote_draft'`. No row copy.
The id is stable, so the customer's link keeps working, the activity log stays continuous, and
analytics is one `GROUP BY` instead of a three-way union.

The cost is a wide table — 40-odd columns, many only meaningful at one stage (`scheduled_start`
on jobs, `sent_at` on quotes). That's an accepted trade. Full reasoning in
[`adr/0002-unified-work-items.md`](adr/0002-unified-work-items.md).

## Authentication

Supabase Auth issues the JWT and manages the session cookies via `@supabase/ssr`.
`src/middleware.ts` refreshes the cookie on every request.

Application code never reads user data from Supabase. It calls `supabase.auth.getUser()` to
verify the JWT, then reads the `users` row through `pg`:

```ts
requireSession()   // pages    → redirects to /login or /app/onboarding
getSession()       // actions  → returns null, caller returns { ok: false }
```

Both return `{ userId, email, companyId, role, profile }`. `companyId` is the tenant key for
every subsequent query.

## The public surface

`/q/{token}` and `/i/{token}` are the only unauthenticated routes that read data. `token` is
`work_items.public_token` — 128 random bits, `encode(gen_random_bytes(16),'hex')`, never the
row's UUID, so links can't be enumerated.

These routes use the service-role Supabase client (`src/lib/supabase/untyped.ts`) because there
is no session to scope by. The token *is* the authorisation. That is a deliberate exception to
the "everything goes through `pg`" rule, not an oversight.

This is also the surface customers judge the product on. It should feel like Stripe Checkout.

## AI

`python-backend/ai_backend.py` is a single FastAPI file exposing `POST /api/ai/generate-quote`.

It fetches the company's `catalog_items`, builds a grounded prompt, and calls Gemini through the
unified `google-genai` SDK — which targets either AI Studio (API key) or Vertex AI (ADC), toggled
by `GOOGLE_GENAI_USE_VERTEXAI`.

Three properties are load-bearing:

- **Grounded, not generative.** The system prompt forbids inventing line items. Prices come from
  the contractor's own catalog. A hallucinated price is a quote the contractor has to honour.
- **Model fallback chain.** `GEMINI_MODELS` is tried in order until one succeeds, so a quota
  limit on the newest flash model degrades instead of failing.
- **Mock fallback.** If Gemini fails entirely, a keyword matcher over the catalog returns
  plausible line items and the response's `mode` field says `mock`. The UI stays exercisable
  offline and a Gemini outage doesn't take quoting down.

Model policy is fixed: **Google models only**, temperature ≤ 0.2, JSON response mime type
whenever output is parsed. Money and structured output must be deterministic.

Prompts live in `prompts/` as markdown, not inline in Python, so they can be edited and diffed
without touching code.

`python-backend/src/quotepro/` contains a far more sophisticated backend — ADK multi-agent
routing, hybrid RAG over `document_embeddings`, Postgres-backed sessions, an arq indexer worker
— that was built during the rebuild and **never wired up**. It is dead code today. Whether to
adopt or delete it is an open decision in [`CLEANUP_PLAN.md`](CLEANUP_PLAN.md).

## Integrations

| Service | State |
| --- | --- |
| Resend | Wired. Quote sent, invoice sent, overdue reminders. Templates in `src/emails/`. |
| Stripe Connect | Wired, **test mode**. Express onboarding, checkout, card-fee pass-through. |
| SignNow / Dropbox Sign | Wired with an instant-acceptance fallback if signing fails. |
| Twilio | In dependencies, not wired. |
| LemonSqueezy | In dependencies, not wired. This is how Rivet itself would be billed. |
| Sentry | Config files exist, DSN not confirmed for production. |
| PostHog | Referenced in `env.ts`, not installed. |

## Rendering and performance

Server Components by default; `'use client'` only where there's interaction. The React Compiler
is enabled (`reactCompiler: true`), so manual `useMemo`/`useCallback` is usually unnecessary —
write straightforward code and let it optimise.

Security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, Referrer-Policy,
Permissions-Policy) are set in `next.config.ts`. There is no CSP yet — that's a launch task.

PDFs render through `@react-pdf/renderer` in `src/lib/pdf/documents.tsx`, server-side, for both
quotes and invoices.

## Known architectural debt

1. **`typescript: { ignoreBuildErrors: true }`** in `next.config.ts`. The live app and the
   `pg`-migrated code are type-clean; the dead `(dashboard)` tree is not. Deleting that tree is
   what lets this flag come off. Until then `tsc --noEmit` in CI is the real gate.
2. **Two data-access styles in the tree.** Live code uses `pg`; dead code uses the Supabase
   client. New code that copies a dead file inherits the wrong one.
3. **Scratch routes are publicly routable** — `/theme-test`, `/logo-test`, `/premium-logos`,
   `/preview`, `/pricing`, `/brand`. They ship to production today.
4. **No tests.** No vitest, no playwright, no pytest run. `tsc` is the only automated check.
5. **Tax is effectively a company-level default**, not per-jurisdiction. Fine for a single-state
   contractor, wrong the moment one crosses a state line.
