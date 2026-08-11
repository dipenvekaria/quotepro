# Onboarding

Welcome. This gets you from a fresh machine to a merged PR. Budget half a day.

## What Rivet is

Trades contractors — HVAC, plumbing, electrical, roofing, landscaping — lose jobs because
quoting is slow. A tech finishes a site visit, then spends 20 minutes that evening typing up a
quote, and by the time it lands the customer has already signed with someone faster.

Rivet collapses that. The contractor describes the job in a sentence, AI drafts a quote from
their own price catalog with the right tax, they adjust it on their phone, and the customer
accepts and pays from a link. The same record then becomes the scheduled job and the invoice.

That last part is the product thesis: **one record, whole lifecycle.** A lead becomes a quote
becomes a job becomes an invoice without ever being copied into a new row. The URL you sent
the customer keeps working. The audit trail stays intact. Everything else in the codebase
follows from that decision — see [`adr/0002-unified-work-items.md`](adr/0002-unified-work-items.md).

Who uses it, and what they're allowed to do, is fixed in `src/lib/permissions.ts`:

| Role | Reality |
| --- | --- |
| `owner` | The contractor who owns the business. Everything. |
| `office` | Dispatcher / office manager. Leads, quotes, calendar, jobs, invoices. |
| `sales` | Field sales rep. Creates leads and quotes — their own only. |
| `technician` | The person on the truck. Sees assigned jobs, completes them. |

## Day one

### 1. Move the repo out of iCloud Drive

The repo currently lives in `~/Library/Mobile Documents/com~apple~CloudDocs/code/quotepro`.
iCloud syncs every file operation, which makes `npm install` crawl and can hang `git` history
walks for minutes. Clone somewhere local:

```bash
git clone https://github.com/dipenvekaria/quotepro.git ~/code/rivet
cd ~/code/rivet
git switch main
```

All work happens on `main`. The pre-rebuild history is tagged `pre-rebuild-main` if you ever need it.

### 2. Install the toolchain

```bash
brew install supabase/tap/supabase
corepack enable                       # pnpm
node --version                        # want 22 (.nvmrc); 23 works
```

Docker Desktop must be running — `supabase start` needs it.

### 3. Install dependencies

```bash
npm install
```

The repo is mid-migration from npm to pnpm (see
[`adr/0006`](adr/0006-toolchain-pnpm-biome-vitest.md)). `package.json` and `package-lock.json`
are npm today, so use npm until that migration lands. If you see a `node_modules` symlink
pointing at a missing `node_modules.nosync`, delete the symlink first — it's an iCloud
workaround that doesn't apply once you've moved the repo.

### 4. Bring up the database

```bash
supabase start          # Postgres :54322, API :54321, Studio :54323, Inbucket :54324
supabase db reset       # applies migrations + seed
```

You now have a demo company with 15 work items across the lifecycle. Sign in with any of:

- `owner@acme.demo` / `demo1234`
- `office@acme.demo` / `demo1234`
- `tech@acme.demo` / `demo1234`

Inbucket at http://localhost:54324 catches all outbound mail in local dev.

### 5. Configure environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

If you inherited a `.env.local` with `*.trycloudflare.com` URLs in it, those are expired
throwaway tunnels from mobile testing. Replace them with the localhost values above. Tunnels
are only needed to open the app on a real phone; `scripts/sync-tunnels.sh` regenerates them.

And `python-backend/.env`:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<same as above>
GEMINI_API_KEY=<ask Dipen>
ALLOWED_ORIGINS=http://localhost:3000
```

Without `GEMINI_API_KEY` the backend still runs — it falls back to a keyword-matching mock so
you can exercise the whole quote flow offline. That fallback is deliberate and worth keeping.

### 6. Run it

Two terminals:

```bash
npm run dev                                                    # → :3000
cd python-backend && uvicorn ai_backend:app --reload --port 8000
```

Check `curl localhost:8000/health` — the `ai_mode` field tells you whether you're on real
Gemini or the mock.

## Day one, part two: read these in order

1. [`../CLAUDE.md`](../CLAUDE.md) — 5 minutes. The rules that are non-negotiable.
2. [`CODEBASE_MAP.md`](CODEBASE_MAP.md) — 15 minutes. **The most important thing you will read
   this week.** Roughly half the repo is dead pre-rebuild code that still compiles. This file
   tells you which half.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the pieces fit and why.
4. [`DATA_MODEL.md`](DATA_MODEL.md) — the `work_items` lifecycle. Everything routes through it.
5. [`CONVENTIONS.md`](CONVENTIONS.md) — how we write code here.

Then trace one flow end to end with the app running. Create a quote in the UI and follow it:

```
src/app/app/(shell)/quotes/new/page.tsx      the form
  → quote-editor.tsx                          client-side editing
  → actions.ts::createDraftQuote              server action, Zod, withUser()
  → create_work_item_with_customer            SQL function, atomic customer+work_item
  → ai_backend.py::generate_quote             Gemini grounded on catalog_items
  → actions.ts::saveLineItems                 replace-all write, recomputes totals
  → /app/pipeline/[id]                        detail, send, accept
  → /q/{public_token}                         what the customer sees
```

That single path touches the data layer, tenancy, server actions, the AI service, and the
public surface. Once you can narrate it, you can work anywhere in the codebase.

## The one thing you must not get wrong

**The `pg` connection bypasses Row Level Security.** It connects as superuser. RLS policies
exist and are correct, but they are a second line of defence — they are not protecting the
queries you write.

Every statement touching company data carries `where company_id = $n`. Every mutation verifies
ownership before it writes. There is no framework catching a missed scope; a missing clause is
a cross-tenant data leak that will pass code review if the reviewer isn't looking for it.

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

The `rivet-data` skill walks through the full pattern including transactions and `withUser()`.

## Your first PR

Pick something from [`CLEANUP_PLAN.md`](CLEANUP_PLAN.md) Phase 1 — they're scoped small on
purpose and each one makes the codebase measurably easier for the next person.

Working agreement:

- Branch off `main`. Small PRs, one concern each.
- `npx tsc --noEmit` passes on live code before you open it. The `rivet-ship` skill lists the
  full gate.
- Terse commits: `fix(pipeline): detail 404 on missing address`. No summary paragraphs.
- No new markdown files unless asked. This repo already has 140 of them and it's a problem.
- Non-obvious decision? Write an ADR in `docs/adr/`. Four sections: context, decision,
  consequences, date.

## Working with Claude Code

Full setup: [`CLAUDE_CODE_SETUP.md`](CLAUDE_CODE_SETUP.md). Do it before your first real task —
it takes fifteen minutes and it's the difference between an agent that knows this codebase and
one that guesses about it.

The short version: `CLAUDE.md`, `.claude/skills/`, and `.claude/settings.json` are all
committed, so a clone brings the context, the six project skills, and the team's plugin set
with it. The one thing you have to get right is **starting Claude from the repo root** —
`CLAUDE.md` loads from the working directory, so launching from a parent directory silently
gives you an agent with no project context.

If you correct Claude on something durable about this project, put the correction in
`CLAUDE.md` or the relevant skill and commit it. Otherwise it dies with the session and the
next person hits the same thing.

## Who to ask

Dipen owns product direction, the brand, and the Gemini-only model policy. Anything about what
Rivet should *feel* like goes to him. Anything about what the code currently *does* is in
`CODEBASE_MAP.md` — check there before asking, it was written to answer exactly those questions.
