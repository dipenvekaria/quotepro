# Contributing to Rivet

## Setup

[`docs/ONBOARDING.md`](docs/ONBOARDING.md) — machine to first PR, half a day.
[`docs/CLAUDE_CODE_SETUP.md`](docs/CLAUDE_CODE_SETUP.md) — if you use Claude Code.

Short version:

```bash
git clone https://github.com/dipenvekaria/quotepro.git ~/code/rivet   # NOT in iCloud Drive
cd ~/code/rivet && git switch main                            # NOT main
npm install
cp .env.example .env.local        # fill in the three values from `supabase status`
npm run db:start && npm run db:reset
npm run dev
```

## Before you write any code

Read [`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md). About half this repository is the
pre-rebuild application. It still compiles, still imports the old data layer, and still turns up
in every grep. Editing it is the most common way to lose a day here.

## The rule that has no safety net

The `pg` pool in `src/lib/db/index.ts` connects as superuser and **bypasses Row Level
Security**. RLS policies exist and are correct, but they protect the `anon` and `authenticated`
Postgres roles — not your queries.

Every statement touching company data carries `where company_id = $n`. Every mutation verifies
the target row belongs to the caller's company before it writes.

```ts
const { companyId } = await requireSession()
const rows = await query<Row>(
  'select id, total from work_items where id = $1 and company_id = $2',
  [id, companyId],
)
```

A missing clause is a cross-tenant data leak that compiles, passes review, and looks fine in
local testing against a single seeded company.

## Standards

[`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) has the detail. The parts people trip on:

- **Parameterized SQL only.** No interpolation, ever — including `ORDER BY`.
- **Server actions validate with Zod** and return `{ ok, data } | { ok: false, error }`. Never
  throw to the client, never surface a raw Postgres error.
- **Google Gemini only** in product code. Temperature ≤ 0.2, JSON mime type when output is
  parsed. This is a standing decision, not a default.
- **Design tokens, not palette classes.** `bg-muted`, not `bg-slate-100`.
- **No new markdown files unless asked.** The repo has ~140 and most are misleading.

## Branches and PRs

Branch off **`main`**. It is the only branch.

One concern per PR. Terse conventional commits:

```
fix(pipeline): detail 404 on missing address
feat(quotes): tiered good/better/best options
```

Before opening:

```bash
npm run typecheck    # live code only — see tsconfig.ci.json
npm run lint
```

`npm run typecheck:all` runs over the dead tree too and will fail. That's expected until
Cleanup Phase 1 lands.

The PR template asks what you verified. Answer it honestly — "tested at 375px as office role,
confirmed company B can't read company A's quotes" is worth more than a description of the code.

## Decisions

Non-obvious ones get an ADR in [`docs/adr/`](docs/adr/): context, decision, consequences, date.
One page.

When behaviour changes, update the doc describing it in the same PR. These docs are also the
context Claude Code loads — a stale doc doesn't just mislead a person, it misleads every agent
session either of us runs.

## What to work on

[`docs/CLEANUP_PLAN.md`](docs/CLEANUP_PLAN.md) — debt paydown, in dependency order.
[`docs/LAUNCH_PLAN.md`](docs/LAUNCH_PLAN.md) — the path to production.
[`docs/PROTOTYPE_DEPLOYMENT.md`](docs/PROTOTYPE_DEPLOYMENT.md) — current focus.
