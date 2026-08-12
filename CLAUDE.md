# Rivet — Agent Context

Rivet is a field-service SaaS for trades contractors (HVAC, plumbing, electrical, roofing,
landscaping). A lead comes in, AI drafts a quote from the company's own price catalog in
seconds, the customer accepts it on their phone, the job gets scheduled, invoiced, and paid.
One record — a `work_item` — carries that whole lifecycle.

> The repo directory, git remote, and older docs still say "QuotePro". That's the legacy name.
> The product is **Rivet**. See `docs/adr/0004-product-name-rivet.md`.

## Read this first

**The dead frontend tree was deleted on 2026-08-09** (Cleanup Phase 1): 124 files, ~19,600
lines. Everything under `src/` now runs. `tsc --noEmit` passes with **zero** exclusions and
`ignoreBuildErrors` is off, so a type error fails the build — which is the point.

| Area                                   | Status  |
| -------------------------------------- | ------- |
| `src/app/app/**`                       | LIVE — the entire signed-in product |
| `src/app/{q,i,join,login,auth}/**`     | LIVE — public + auth routes |
| `src/lib/{db,auth,email,pdf,stripe,supabase}/**` | LIVE |
| `src/components/{ui,brand,shared}/**`  | LIVE |
| `src/features/invoices/**`             | LIVE |
| `src/lib/ai/**`                        | LIVE — Gemini, in-process |
| `supabase/migrations/*.sql` (6)        | LIVE |

**There is no Python in this repo.** `python-backend/` was deleted on 2026-08-11 and the AI
now runs in-process inside the server actions — see
[`docs/adr/0009`](docs/adr/0009-ai-in-process.md). Every dead tree is now gone;
[`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) has the detail.

Onboarding lives at `src/app/app/onboarding/` only. The root `/onboarding` — which rendered
pre-Rivet "Field Genie" branding — is gone, along with the scratch routes (`/theme-test`,
`/preview`, `/pricing`, …) that were publicly routable in production.

## Stack

- **Frontend** — Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, shadcn/ui + Radix.
- **Data** — Postgres, accessed with raw `pg` and parameterized SQL. No ORM. `src/lib/db/index.ts`.
- **Auth** — Supabase Auth (cookies via `@supabase/ssr`). Auth only — not for data reads.
- **AI** — Gemini via `@google/genai`, called in-process from server actions. `src/lib/ai/`.
- **Integrations** — Resend (email), Stripe Connect (payments), SignNow/Dropbox Sign (e-sig),
  Twilio (SMS, not wired), LemonSqueezy (billing, not wired).

Read paths are Server Components hitting `query()` directly. Write paths are Server Actions in
`actions.ts` files colocated with the route. One process runs the whole product.

## Commands

Target toolchain is pnpm + biome + vitest + uv + ruff (see
`docs/adr/0006-toolchain-pnpm-biome-vitest.md`). **The repo has not been migrated yet** — today
it runs on npm with eslint and no tests. Until the migration lands:

```bash
npm install                  # node_modules is currently a broken symlink; this fixes it
npm run dev                  # Next.js → http://localhost:3000
npx tsc --noEmit             # typecheck (the real quality gate today)
npm run lint                 # eslint

supabase start               # local Postgres :54322, API :54321, Studio :54323
supabase db reset            # migrations + seed (demo company, 15 work items)
```

`npm run dev` is the entire stack. There is no second service to start.

`justfile` and `.github/workflows/ci.yml` describe the *target* toolchain, not the current one.
They will fail as written. Fixing that is an early task in `docs/CLEANUP_PLAN.md`.

Demo logins after `supabase db reset`: `owner@acme.demo`, `office@acme.demo`, `tech@acme.demo`
— all `demo1234`.

## Non-negotiable rules

**1. Every query is tenant-scoped by hand.** The `pg` pool connects as superuser and
**bypasses RLS**. RLS is a second line of defence, not the first. Every SQL statement that
touches company data must carry `where company_id = $n`, and every mutation must first verify
the target row belongs to the caller's company. There is no framework catching this for you.

```ts
const { companyId } = await requireSession()
const rows = await query<Row>(
  'select id, total from work_items where id = $1 and company_id = $2',
  [id, companyId],
)
```

**2. Gemini only.** No GPT, Claude, Llama, Mistral, or any non-Google model in product code.
Temperature ≤ 0.2, `response_mime_type: "application/json"` whenever output is parsed, and a
response schema where the SDK supports one. Money and JSON must be deterministic.

**3. Never interpolate into SQL.** Parameterized queries only, always.

**4. Server Actions validate input with Zod** and return `{ ok: true, data } | { ok: false, error }`.
They never throw to the client.

**5. Keep it short.** Terse commit messages, terse PR descriptions, terse comments. Do not
create `.md`, TODO, ROADMAP, or summary files unless explicitly asked. Comment the *why*, never
the *what*.

## Data model

One table carries the lifecycle: **`work_items`**. `status` is an enum spanning
`lead → quote_draft → quote_sent → quote_viewed → quote_accepted → job_scheduled →
job_in_progress → job_completed → archived`, and `kind` (`lead|quote|job|archived`) is derived
from it for board filters and indexes. Converting a lead to a quote is an `UPDATE status` — no
row copy, the id and URL stay stable.

Around it: `companies`, `users`, `customers`, `customer_addresses`, `catalog_items`,
`quote_items`, `quote_options`, `invoices`, `payments`, `document_embeddings`, `activity_log`,
`ai_conversations`, `ai_prompts`, `notification_prefs`, `webhooks_inbound`.

Public quote and invoice links use `work_items.public_token` (128-bit random hex), never the
UUID. `/q/{public_token}` and `/i/{public_token}` are unauthenticated and read through the
service-role client.

Full detail: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Where things go

```
src/app/app/(shell)/<feature>/
  page.tsx          Server Component — reads via query(), renders
  actions.ts        'use server' mutations, Zod-validated
  <feature>-*.tsx   'use client' interactive pieces
src/lib/            cross-cutting: db, auth, email, pdf, stripe, permissions
src/components/ui/  shadcn primitives — do not hand-roll what exists here
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Colocate by route. A file only moves to `src/lib` or `src/components/shared` once a second
route actually needs it.

## Traps

- **Clone to `~/code/rivet`, never inside iCloud Drive.** The old iCloud copy actively corrupted
  the repo — it truncated a source file to zero bytes and blocked a commit for fifteen minutes.
  The `node_modules` → `node_modules.nosync` symlink was a workaround for that and no longer
  applies. Plain `npm install`.
- **`.env.local` may point at dead Cloudflare quick tunnels.** For local work set
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`. Tunnels are only for testing on a phone;
  `scripts/sync-tunnels.sh` regenerates them, but it still references the deleted AI service.
- **AI degrades, it does not fail.** Without `GEMINI_API_KEY` quote generation keyword-matches
  the catalog and reports `mode: "mock"`; the customer summary renders nothing. Neither throws,
  so a missing key looks like poor quality rather than an outage. Check `mode`.
- **Hosted Postgres needs `ssl: { rejectUnauthorized: false }`.** `pg` treats `sslmode=require`
  as `verify-full` and Supabase's pooler chain isn't trusted, so a deploy dies with
  `SELF_SIGNED_CERT_IN_CHAIN` on every query. Handled in `src/lib/db/index.ts`.
- **`DATABASE_URL` is not Zod-validated.** `src/lib/env.ts` checks everything else and fails at
  boot; this one is read straight from `process.env` and fails late, as a connection error. On
  Vercel it falls back to `POSTGRES_URL`, which the Supabase integration provisions.
- **Two auth surfaces.** `requireSession()` (`src/lib/auth/session.ts`) redirects and is for
  pages; `getSession()` returns null and is for actions. Both read the user row via `pg` after
  Supabase verifies the JWT.
- **`withUser(userId, fn)`** sets `request.jwt.claims` inside the transaction. Required for the
  SQL functions that call `auth.uid()` internally — `create_work_item_with_customer`,
  `bootstrap_company`. Plain `query()` leaves `auth.uid()` NULL.
- **numeric/timestamp parsing is customised** in `src/lib/db/index.ts` — money comes back as
  `number`, timestamps as raw ISO strings, not `Date`.
- **`prompts/`** holds the AI system prompts as markdown. Behaviour changes belong there, not in
  string literals. They reach production via `outputFileTracingIncludes` in `next.config.ts`;
  remove that and every prompt silently falls back to its inline default.
- **The repo contains stale GCP signals — hosting is settled and it is not GCP.** `k8s/deployment.yaml`,
  `docker-compose.yml` and the commit titled "GCP-native" are all from an abandoned direction.
  The decision is Vercel + Supabase Cloud
  ([`docs/adr/0005`](docs/adr/0005-hosting-vercel-railway-supabase.md), amended by
  [`0009`](docs/adr/0009-ai-in-process.md) — Railway is no longer part of it). Don't propose a
  GCP migration off the back of those artifacts; deleting them is Phase 5 of the cleanup plan.

## Skills

Project skills live in `.claude/skills/` and are committed, so they arrive with the clone.
New engineer setting up Claude Code: [`docs/CLAUDE_CODE_SETUP.md`](docs/CLAUDE_CODE_SETUP.md).
Invoke by name:

- `rivet-dev` — boot the full local stack, resolve setup failures
- `rivet-data` — write a query or mutation correctly (tenancy, transactions, actions)
- `rivet-migration` — schema change → migration → types → RLS verification
- `rivet-ui` — the Rivet design system; build a page that matches the product
- `rivet-ai` — change AI behaviour: prompts, models, grounding
- `rivet-ship` — verification gates before opening a PR

## Docs

| Doc | For |
| --- | --- |
| [`docs/ENGINEER_RUNBOOK.md`](docs/ENGINEER_RUNBOOK.md) | **Hand this to a new engineer.** Fresh machine → merged PR, step by step. |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | Longer-form onboarding with product context |
| [`docs/CLAUDE_CODE_SETUP.md`](docs/CLAUDE_CODE_SETUP.md) | Getting a new machine's Claude Code to match everyone else's |
| [`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) | What is live, what is dead, and why |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit and why |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Schema, lifecycle, RLS |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | How we write code here |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel + Railway + Supabase Cloud |
| [`docs/PROTOTYPE_DEPLOYMENT.md`](docs/PROTOTYPE_DEPLOYMENT.md) | **Current focus** — get the prototype deployed and a second engineer contributing |
| [`docs/STRATEGY.md`](docs/STRATEGY.md) | **Start here for direction.** Wedge, 90-day plan, where the moat comes from. |
| [`docs/PRODUCT_REVIEW.md`](docs/PRODUCT_REVIEW.md) | Product gaps and v1 scope. **Note: there is no way to create a catalog item, so a new account cannot generate a quote.** |
| [`docs/COMPETITIVE_ANALYSIS.md`](docs/COMPETITIVE_ANALYSIS.md) | Jobber, Housecall Pro, QuoteIQ, ServiceTitan, AI-native entrants, market economics |
| [`docs/LAUNCH_PLAN.md`](docs/LAUNCH_PLAN.md) | Sequenced path to production |
| [`docs/GTM_PRODUCT_CHECKLIST.md`](docs/GTM_PRODUCT_CHECKLIST.md) | Feature gaps vs competitors; the launch gate |
| [`docs/GTM_BUSINESS_CHECKLIST.md`](docs/GTM_BUSINESS_CHECKLIST.md) | Legal, compliance, marketing, billing, support |
| [`docs/CLEANUP_PLAN.md`](docs/CLEANUP_PLAN.md) | Debt paydown, in order |
| [`docs/adr/`](docs/adr/) | Decisions and their rationale |
| [`docs/SESSION_LOG_2026-08-07.md`](docs/SESSION_LOG_2026-08-07.md) | Decisions, findings and open items from the handover session |
| [`docs/Rivet-Engineering-Primer.pdf`](docs/Rivet-Engineering-Primer.pdf) | Shareable 12-page condensation of all of the above |

The primer's source is `docs/primer/rivet-primer.html` (also published as a web artifact).
Edit that, then run `python3 docs/primer/build-pdf.py --verify` to regenerate the PDF — the
`--verify` pass audits each page for the orphan-gap problem this document is prone to.

`docs/archive/`, `docs/rebuild/` and `REBUILD.md` were deleted on 2026-08-11 — they described a
system that no longer exists and shipped as agent context on every session. Anything remaining
in `docs/` is current; if you find something that isn't, fix it or delete it.

## Working agreement

- Branch off `main`. Small PRs.
- Read `docs/CODEBASE_MAP.md` before editing an unfamiliar directory.
- `tsc --noEmit` must pass on live code before you open a PR — see the `rivet-ship` skill.
- Record non-obvious decisions as an ADR in `docs/adr/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
