# Engineer Runbook

**Start here.** Everything you need to do, in order, from a fresh machine to a merged pull
request. Follow it top to bottom — later steps assume the earlier ones. Budget half a day.

_Rev. 2026-08-07 · branch `main`_

---

## Before you start — 15 minutes

### 1. Get access

Ask Dipen for: GitHub collaborator on the repo, a seat on Vercel / Railway / Supabase, and the
shared password vault. A Gemini API key is optional — the app works without one.

### 2. Install the toolchain

```bash
brew install supabase/tap/supabase
node --version   # want 22 (see .nvmrc); 23 works
```

Docker Desktop must be installed and running — `supabase start` needs it.

### 3. Clone outside iCloud Drive

```bash
git clone https://github.com/dipenvekaria/quotepro.git ~/code/rivet
cd ~/code/rivet
git switch main
```

**This is not a style preference.** The original working copy lives in iCloud Drive, and during
setup for this handover a complete 778-package `npm install` was silently evicted by iCloud
within minutes of finishing. `rsync` copied source files as **0 bytes**. `git` history walks hang
for minutes. Clone somewhere local.

There is one branch: **`main`**. The pre-rebuild application is preserved under the tag `pre-rebuild-main`.

---

## Get it running — 30 minutes

Two processes are required. A third, the AI service, is only needed for quote generation.

### 4. Install and start the database

```bash
npm install
npm run db:start     # Postgres :54322 · API :54321 · Studio :54323 · mail :54324
npm run db:reset     # migrations + demo seed
```

You now have a demo company with 15 work items across the lifecycle, so every board column and
chart has data.

### 5. Configure

```bash
cp .env.example .env.local
supabase status                     # copy the anon key and service_role key in
cp python-backend/.env.example python-backend/.env
```

Both files are commented with local defaults already filled in — you only need the two keys.
`src/lib/env.ts` validates everything at boot and names whatever is missing, so read the error
rather than guessing.

Leave `GEMINI_API_KEY` empty if you don't have one. The AI service falls back to a keyword
matcher and reports `"mode": "mock"` — the whole quote flow still works offline.

### 6. Run it

```bash
./start-frontend.sh    # → localhost:3000
./start-backend.sh     # → localhost:8000 (creates its own venv)
```

Sign in with `owner@acme.demo`, `office@acme.demo` or `tech@acme.demo` — all `demo1234`. Test
with more than one; permission bugs only appear when you switch roles.

Outbound mail is caught by Inbucket at `localhost:54324`. Stripe is test mode — card
`4242 4242 4242 4242`.

---

## Understand it — 2 hours

Do this before writing anything.

### 7. Read, in this order

| | |
| --- | --- |
| [`../CLAUDE.md`](../CLAUDE.md) | 5 min. The rules that aren't negotiable. |
| **[`CODEBASE_MAP.md`](CODEBASE_MAP.md)** | **15 min. The most important thing you'll read this week.** About half this repo is the pre-rebuild app. It still compiles and still turns up in every grep. This says which half. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the pieces fit and why. |
| [`DATA_MODEL.md`](DATA_MODEL.md) | The `work_items` lifecycle. Everything routes through one table. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Standards and the PR flow. |

For the whole picture in one document: [`Rivet-Engineering-Primer.pdf`](Rivet-Engineering-Primer.pdf).

### 8. Trace one quote end to end

With the app running, create a quote and follow it through the code:

```
/app/quotes/new                      the form
  → createDraftQuote()               server action, Zod, tenant-scoped
  → create_work_item_with_customer() customer + work item, one transaction
  → POST /api/ai/generate-quote      Gemini, grounded on the catalog
  → saveLineItems()                  replace-all; totals recomputed
  → /q/{public_token}                what the customer sees
```

That path touches the data layer, tenancy, server actions, the AI service and the public surface.
Once you can narrate it, you can work anywhere in the codebase.

### 9. Set up Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
cd ~/code/rivet && claude          # MUST be from the repo root
```

The project context, six project skills and the team's plugin set are all committed, so a clone
brings them with it. `CLAUDE.md` loads from the working directory — starting Claude from a parent
folder silently gives you an agent with no project context. Verify with `/context`, then
`/rivet-dev`.

Full detail: [`CLAUDE_CODE_SETUP.md`](CLAUDE_CODE_SETUP.md).

---

## The one rule — read twice

> **The `pg` pool connects as superuser and bypasses Row Level Security.**

RLS policies exist and are correct, but they protect the `anon` and `authenticated` Postgres
roles — not your queries. Nothing catches a missing filter.

```ts
// Right
const { companyId } = await requireSession()
const rows = await query<Row>(
  'select id, total from work_items where id = $1 and company_id = $2',
  [id, companyId],
)

// Wrong — returns another contractor's quote
const rows = await query<Row>('select id, total from work_items where id = $1', [id])
```

Every mutation verifies the target row belongs to the caller's company **before** it writes. A
missing clause is a cross-tenant data leak that compiles, passes review, and looks fine in local
testing against a single seeded company.

The `rivet-data` skill has the full pattern.

---

## Your first PR — days 1–3

Start with **Cleanup Phase 1** — deleting the dead tree. Low-risk, obviously verifiable, forces
you to learn what's actually reachable, and it ends with strict TypeScript builds coming back on.

### 10. Pick one numbered item

From [`CLEANUP_PLAN.md`](CLEANUP_PLAN.md) Phase 1. One PR per item — a single 200-file delete is
unreviewable. Start with `src/app/(dashboard)/**`: largest win, nothing links to it.

As you delete each directory, remove its line from `tsconfig.ci.json`. When that exclude list is
empty, delete the file and drop `ignoreBuildErrors` from `next.config.ts`. That's the finish line.

### 11. Verify before opening

```bash
npm run typecheck    # live code only (tsconfig.ci.json) — must pass, currently 0 errors
npm run lint
npm run build
```

`npm run typecheck:all` includes the dead tree and **will** fail. Expected until Phase 1 lands.

Then check by hand:

- [ ] Exercised the affected flow in the browser
- [ ] Checked at 375px — techs use this on a phone in a truck
- [ ] Tested as a second role if permissions are involved
- [ ] Confirmed a second company can't read the first company's rows, if you touched data access

### 12. Open it

Branch off `main`, one concern per PR, terse conventional commit:
`refactor(cleanup): remove legacy (dashboard) route group`

The PR template asks what you verified — answer honestly. *"Tested at 375px as office role,
confirmed company B can't read company A's quotes"* is worth more than a description of the code.

---

## How the work splits

The two tracks touch almost no common files, which is the point.

| Dipen — infrastructure | You — codebase |
| --- | --- |
| Move the AI call server-side, lock the backend | Cleanup Phase 1 — delete the dead tree |
| Hosted Supabase, Vercel, Railway, secrets | Phase 3 — pnpm, biome, vitest; make CI real |
| Stripe live-mode prep, email deliverability | Phase 4 — tenancy and money tests |

Small PRs off `main`, each getting an automatic Vercel preview. Non-obvious decisions
become a one-page ADR in [`adr/`](adr/). When behaviour changes, the doc describing it changes in
the same PR — these docs are also the context Claude Code loads, so a stale one misleads every
agent session either of you runs.

---

## Known state, so nothing surprises you

- **A new account cannot generate a quote.** There is no way to create a catalog item anywhere in
  the product — the Catalog page's buttons are inert. Highest-priority product bug. See
  [`PRODUCT_REVIEW.md`](PRODUCT_REVIEW.md).
- **The AI backend has no authentication** and `allow_origins=["*"]`, and takes `company_id` from
  the request body. Must be fixed before anything is publicly reachable. See
  [`PROTOTYPE_DEPLOYMENT.md`](PROTOTYPE_DEPLOYMENT.md) §0.
- **34 files carry `@ts-nocheck`; 32 are dead code.** Deleting removes suppressions rather than
  fixing them.
- **Three orphaned files have real defects** — `src/lib/toast.tsx`, `src/lib/web-vitals.ts`
  (imports a package not in `package.json`), `src/components/dashboard-nav.tsx`. Nothing imports
  any of them. Delete rather than repair.
- **`justfile` describes the target toolchain**, not the current one. It will fail as written.

---

## When something breaks

| Symptom | Cause and fix |
| --- | --- |
| Everything slow; `git` hangs | The repo is in iCloud Drive. Move it to `~/code/rivet`. |
| `node_modules` is a broken symlink | iCloud workaround that no longer applies. `rm -f node_modules && npm install`. |
| Login succeeds then bounces to `/login` | Supabase URL in `.env.local` doesn't match the one that issued the cookie — usually a stale tunnel URL. Fix env, clear cookies, restart. |
| Redirected to `/app/onboarding` | `requireSession()` sends you there when the user row has no `company_id`. Either you signed up fresh (correct) or the seed didn't apply — re-run `npm run db:reset`. |
| Quote generation returns nothing | Check `localhost:8000/health`. If `ai_mode` is `mock`, Gemini is unavailable — that's the intended fallback, not a bug. Generation also needs active catalog items and 400s without them. |
| `tsc` errors in `src/app/(dashboard)` | The dead tree. Use `npm run typecheck`, not `typecheck:all`. |
| Claude Code doesn't know the project | You started it outside the repo root. `cd ~/code/rivet` and restart. |

---

## Everything else

| Doc | For |
| --- | --- |
| [`ONBOARDING.md`](ONBOARDING.md) | Longer-form version of this, with the product context |
| [`CLAUDE_CODE_SETUP.md`](CLAUDE_CODE_SETUP.md) | Agent setup and how the team stays in sync |
| [`CODEBASE_MAP.md`](CODEBASE_MAP.md) | Live vs dead, every directory |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`DATA_MODEL.md`](DATA_MODEL.md) · [`CONVENTIONS.md`](CONVENTIONS.md) | How it works and how we write it |
| [`PROTOTYPE_DEPLOYMENT.md`](PROTOTYPE_DEPLOYMENT.md) | Getting it deployed |
| [`CLEANUP_PLAN.md`](CLEANUP_PLAN.md) · [`LAUNCH_PLAN.md`](LAUNCH_PLAN.md) | What to work on |
| [`PRODUCT_REVIEW.md`](PRODUCT_REVIEW.md) · [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) · [`STRATEGY.md`](STRATEGY.md) | Why we're building this and for whom |

Anything under `docs/archive/`, `docs/rebuild/`, or `REBUILD.md` describes a system that no longer
exists. History, not instruction.

Questions → Dipen.
