# Architecture

_Current as of 2026-08-19, branch `main`._

## Shape

```
                    ┌──────────────────────────────────┐
   Contractor ─────▶│  Next.js 16 App Router (Vercel)  │
   (authenticated)  │  React 19 · Tailwind 4           │
                    │                                  │
                    │  RSC ──── query() ───────────────┼──▶ ┌──────────────┐
                    │  Server Actions ─────────────────┼──▶ │  Postgres    │
                    │                                  │    │  (Supabase)  │
   Customer ───────▶│  /q/{token}  /i/{token}          │    └──────┬───────┘
   (no account)     │  service-role read               │           │
                    │                                  │      auth.users
   Vercel crons ───▶│  /api/cron/* (CRON_SECRET)       │           │
                    └───────┬──────────────────────────┘    ┌──────▼───────┐
                            │ JWT verify                    │ Supabase     │
                            ▼                               │ Auth+Storage │
   In-process, no second service:                           └──────────────┘
     Gemini (@google/genai + @google/adk) — quote drafting, Bolt assistant
   External:
     Resend (email, verified getrivet.ai) · Stripe Connect (customer payments)
     Stripe Billing (Rivet subscriptions)  · QuickBooks Online (bookkeeping sync)
```

Three deliberate choices explain most of the code.

## 1. Postgres directly, not through Supabase's client

Every read and write in the signed-in app goes through `src/lib/db/index.ts` — a `pg`
pool, parameterized SQL, no ORM. Supabase hosts the database and owns authentication;
it is not the data layer.

The consequence to internalise: **the pool connects as superuser and bypasses RLS.**
RLS exists and is correct, but it protects the anon/authenticated roles, not
`query()`. Tenant scoping in application code is the primary control, and
`tests/tenancy.test.ts` scans every statement for it — unscoped SQL fails CI and the
commit hook:

```ts
const { companyId } = await requireSession()
await query('select … from work_items where id = $1 and company_id = $2', [id, companyId])
```

Also in that file: `numeric` parses to `number`, timestamps stay ISO strings, and
`withUser(userId, fn)` sets `request.jwt.claims` in a transaction for the SQL
functions that read `auth.uid()` (`create_work_item_with_customer`,
`bootstrap_company`).

## 2. Server Actions for writes, RSC for reads

There is no REST API for the product. A route directory owns its data access:
`page.tsx` (RSC, `query()`), `actions.ts` (`'use server'`, Zod in,
`{ ok, data } | { ok, error }` out — never throws to the client), client components
for interaction only.

`src/app/api/**` exists only where a browser redirect or third party needs a URL:
Stripe checkout/webhook, QuickBooks OAuth callback, cron endpoints, file streams.

## 3. One table for the whole lifecycle

`work_items` is a lead, a quote, a job, and an archived record — one row, `status`
moves, `kind` is derived. Converting never copies a row, so the id and the customer's
link stay stable. Adjacent state rides in jsonb where it is genuinely optional:
`recurrence` (repeat rule), `metadata` (acceptance record, spawn provenance).
Reasoning: [ADR 0002](adr/0002-unified-work-items.md).

## Authentication and roles

Supabase Auth issues the JWT (`@supabase/ssr` cookies, refreshed in middleware);
application code verifies it and then reads the `users` row through `pg`.
`requireSession()` for pages (redirects), `getSession()` for actions (returns null).
Both return `{ userId, email, companyId, role, profile }`.

Roles: owner, admin, office, technician. Withholding happens in the **query**, not
the markup — technicians never receive revenue figures in a payload. Signups are
gated behind an allow-list until `NEXT_PUBLIC_SIGNUPS_OPEN=true`; the public site
collects waitlist emails.

## The public surface

`/q/{token}` and `/i/{token}` — `public_token` is 128 random bits, never the UUID.
Service-role reads; the token is the authorisation. The quote viewer carries the
company's branding (logo from the public `branding` storage bucket), its terms, and
typed-name acceptance: signer, time, IP, user agent, and **the exact terms text**
snapshot into `work_items.metadata`. Job photos live in a separate private bucket
served via signed URLs.

## AI

In-process (`src/lib/ai/`), Gemini only, temperature ≤ 0.2, JSON schema whenever
output is parsed. Prompts are markdown in `prompts/`, shipped via
`outputFileTracingIncludes`; a missing prompt file throws.

Two agents, both on `@google/adk`:

- **Quote drafting** — grounded in the company's catalog; the model never sets a
  price (every line reconciles to a catalog row; a company-priced fallback path
  covers work the catalog doesn't carry, without substituting items). Too-vague
  input returns clarifying questions with tappable answers, not a guess.
- **Bolt** — the in-app assistant. **Read-only by owner decree**: query tools scoped
  to the caller's session plus a how-to corpus; every mutation stays a human tap.
  Entry point is the nav (sidebar footer / More sheet), not a floating bubble.

**There is no mock mode and no fallback content.** When Gemini is unconfigured or
every model fails, generation throws `AiUnavailableError`, the user sees a clear
error, and the run is recorded in `ai_conversations` with `status='degraded'` —
alert on those. The old degrade-to-mock path fabricated plausible quotes and is
deliberately gone. Do not add fallbacks (standing owner rule).

## Money

Two Stripe surfaces, one direction each:

- **Stripe Connect** — customers paying contractors. Express onboarding from
  Integrations; pay-online on `/i/{token}`; card-fee pass-through optional. Without
  Stripe, invoices show the contractor's payment instructions and payments are
  recorded manually — same books either way.
- **Stripe Billing** — contractors paying Rivet. Solo $39 / Team $99, everything
  included, no add-ons (owner pricing decree). 14-day trial, card up front,
  cancel-at-period-end. Webhook `customer.subscription.*` syncs state onto
  `companies`; prices self-provision by lookup key.

**QuickBooks Online** mirrors the books: invoices post as real items (find-or-create
by name, partial unique index on `(company_id, lower(name))`), tax as a Service item
against a liability account (their AST ignores `TotalTax`), payments follow, all
non-blocking via `after()` with `last_error` surfaced on the Integrations card.
One-way: Rivet → QBO.

## Time-based machinery

Three Vercel crons (`vercel.json`, `CRON_SECRET`-guarded): quote follow-up nudges,
catalog reindex, and **recurring visits** — a `work_items.recurrence` template spawns
each visit as its own scheduled job (same lines, same tech), advancing `next_at` in
the same transaction so a crashed run can't double-book. Cadences: weekly, biweekly,
monthly, or custom every-N days/weeks/months; day/week rules add exact days, month
rules keep the wall clock in the company timezone and clamp day-31. Optional
auto-invoice per rule.

## UI system

Monochrome, tokens-only (`globals.css`, oklch), shadcn/ui primitives, mobile-first at
375px with 44px targets. **Light is the default theme** (owner decision); dark and
system are opt-in, and browser chrome color syncs to the resolved theme. The React
Compiler is on — no hand-rolled memoization. Help is the Bolt panel on every page;
support is email (`SUPPORT_INBOX`) with reply-to the sender.

## Verification

`npm run typecheck · lint · test · build` (`just check` runs all four). 380+ vitest
tests including integration suites against local Postgres (tenancy scan, recurring
engine, catalog upsert, billing). Git hooks: commits are gated on `tsc` + the tenancy
scan; pushes are blocked if the diff looks like it carries a secret (public repo).
Screens get verified in a real browser at 375px before "done" (`rivet-test-ui`), and
flows against the database (`rivet-test-functional`).

## Known debt

1. **Tax is a company-level default**, not per-jurisdiction — wrong once a contractor
   crosses a state line.
2. **No CSP header yet** (other security headers are set in `next.config.ts`).
3. **Trial-expiry enforcement** in-app hasn't shipped; Stripe charges at day 14 but
   product behaviour for lapsed/cancelled accounts is undecided.
4. **QBO sync is one-way** — payments taken inside QuickBooks must be recorded in
   Rivet by hand.
5. **`DATABASE_URL` is not Zod-validated** — read raw, falls back to `POSTGRES_URL`
   on Vercel, fails at first query rather than boot.
6. Stale GCP artifacts (`k8s/`, `docker-compose.yml`) await Cleanup Phase 5 — hosting
   is settled on Vercel + Supabase ([ADR 0005](adr/0005-hosting-vercel-railway-supabase.md),
   amended by [0009](adr/0009-ai-in-process.md)).
