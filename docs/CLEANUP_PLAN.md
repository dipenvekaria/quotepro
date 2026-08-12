# Cleanup Plan

Technical debt paydown, in dependency order. Each phase is independently shippable and leaves
the repo better than it found it. Nothing here changes product behaviour — that's
[LAUNCH_PLAN.md](LAUNCH_PLAN.md).

Do these in order. Phase 1 is what makes every later phase safe.

---

## Phase 1 — Delete the dead tree ✅ DONE 2026-08-09

**Why first:** roughly half the repo is pre-rebuild code that still compiles and still imports
the old data layer. It is the reason `ignoreBuildErrors` is on, the reason grep results are
misleading, and the reason a new contributor's first instinct is wrong. Everything else is
easier once it's gone.

Consult [CODEBASE_MAP.md](CODEBASE_MAP.md) for the full inventory. Delete in this order,
running `npx tsc --noEmit` after each step:

1. **`src/app/(dashboard)/**`** — the old UI. Nothing links to it. Largest single win.
2. **`src/app/api/**` except `vitals/`** — superseded by Server Actions.
3. **Scratch routes** — `src/app/{dashboard,settings,pricing,preview,theme-test,logo-test,logo-backgrounds,premium-logos}/`.
   These are publicly routable in production today, which makes this a launch item as well as a
   cleanup one. Decide whether `/brand` stays as an internal design kit (recommended: keep it,
   behind a check).
4. **`src/app/onboarding/`** (root) — superseded by `src/app/app/onboarding/`.
5. **`src/components/{features,queues,navigation,calendar,ai,dialogs,guards}/`** and the 20 dead
   root-level component files. Keep `error-boundary`, `hide-devtools`, `network-status`.
6. **`src/hooks/`** entirely — nothing live imports it.
7. **`src/features/{work-items,catalog,ai}/`** — but first move `work-items/schemas.ts` somewhere
   sensible, because `components/shared/status-badge.tsx` imports its `WorkItemStatus` type.
8. **`src/lib/{api,hooks,dashboard-context,default-pricing,prompts,roles,invoice-number,auto-index-catalog,theme-config}`.**
   Note `src/lib/roles.ts` is the obsolete 2-role model — `src/lib/permissions.ts` is live.
9. **`supabase/migrations/legacy/`** — includes `EMERGENCY_DISABLE_RLS.sql` and
   `TEMP_BYPASS_RLS.sql`. Actively dangerous to keep around.
10. **`emails/quote-sent.tsx`** at repo root — duplicate of `src/emails/QuoteSentEmail.tsx`.
11. **`scripts/`** — keep `sync-tunnels.sh`, `verify-rls.ts`, `backup-database.sh`. Delete the
    one-off theme and migration scripts.

**Done when:** `next.config.ts` no longer needs `typescript: { ignoreBuildErrors: true }` and
`npm run build` passes with it removed.

**Outcome (2026-08-09):** 124 files and ~19,600 lines removed in one pass. `ignoreBuildErrors`
is off, `tsconfig.ci.json` is deleted (its exclude list had emptied), `npm run typecheck` is now
plain `tsc --noEmit` and reports **0 errors**, and `npm run build` passes without suppressions.
The frontend has no dead tree left; Phase 2 (the Python backends) is untouched.

Do it as one PR per numbered step. A single 200-file delete is unreviewable.

### Measured starting point (2026-08-07)

Numbers from an actual `tsc` run, so you can tell whether a PR moved anything:

- **`npm run typecheck` → 0 errors.** The live app is type-clean today. `tsconfig.ci.json`
  scopes the check to shipping code; keep it passing.
- **34 files carry `@ts-nocheck`. 32 of them are dead code** — 14 in `src/app/(dashboard)`,
  6 in `src/app/api/quotes`, 4 in `src/hooks`, the rest scattered through dead components.
  Each deletion in this phase removes suppressions rather than fixing them.
- **Only one genuinely live file is suppressed:** `src/app/q/[id]/accepted/page.tsx`. Removing
  its `@ts-nocheck` and fixing what surfaces is a good standalone PR.
- **Three orphaned files carry real defects** — nothing imports any of them, so delete rather
  than repair:
  - `src/lib/toast.tsx` misuses the sonner promise API (passes `{title, icon}` where a
    `ReactNode` is required).
  - `src/lib/web-vitals.ts` imports `web-vitals`, which **is not in `package.json`**.
  - `src/components/dashboard-nav.tsx` passes a `UserRole` the target signature doesn't accept.

As you delete each directory, remove its line from `tsconfig.ci.json`. When that exclude list is
empty, delete the file and drop `ignoreBuildErrors` — that's the finish line for this phase.

---

## Phase 2 — Decide the Python backend's future ✅ DONE 2026-08-11

Resolved twice. [ADR 0008](adr/0008-single-python-backend.md) kept `ai_backend.py` and deleted
the other three backend trees (~90 files), including the unwired `src/quotepro/` app — ADK
multi-agent routing, hybrid RAG over `document_embeddings`, an arq indexer worker, all of it
tested and none of it connected.

[ADR 0009](adr/0009-ai-in-process.md) then deleted `ai_backend.py` too. The AI moved into the
Next.js server actions (`src/lib/ai/`) after two sessions of failing to get 450 lines of Python
onto Railway. **There is no Python left in the repo.**

The RAG opportunity survives the deletion in schema form only: `document_embeddings` and
`match_documents()` still exist, and retrieving similar past quotes remains the highest-value
AI improvement available. The implementation is in git history, in a language the repo no
longer uses.

---

## Phase 3 — Make the toolchain real

Per [`adr/0006`](adr/0006-toolchain-pnpm-biome-vitest.md), the target is pnpm + biome + vitest +
playwright + uv + ruff. `justfile`, `biome.json`, `lefthook.yml`, and `.github/workflows/ci.yml`
already assume it. Nothing is installed.

1. `corepack enable`, `pnpm import` from `package-lock.json`, delete `package-lock.json`.
2. Add biome, vitest, playwright to `devDependencies`. Remove eslint and `eslint.config.mjs`.
3. Add real `package.json` scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `e2e`.
5. `lefthook install`.
6. Delete `.github/workflows/{test,deploy}.yml` — both are pre-rebuild and reference scripts
   that don't exist. Fix `ci.yml` so it passes.

**Done when:** a clean clone runs `pnpm install && just dev` successfully, and CI is green.

---

## Phase 4 — Tests where they pay

No tests exist. Don't chase coverage — cover the things that lose money when they break:

1. **Tenancy.** For each live query helper, assert that company A cannot read company B's rows.
   This is the highest-value test suite in the codebase by a wide margin.
2. **Money.** Subtotal, discount, tax, and total arithmetic across the quote editor, PDF, and
   invoice. Rounding on `NUMERIC(12,2)`. Percentage vs. fixed discounts.
3. **Status transitions.** Every legal move through `work_item_status`, and rejection of the
   illegal ones.
4. **One Playwright happy path.** Sign up → create quote → send → accept at `/q/{token}` → pay.
   That single test covers more real risk than a hundred unit tests.
5. **`scripts/verify-rls.ts` in CI** — it already exists and already works.

---

## Phase 5 — Structural refactors (deployment config ✅ DONE 2026-08-11)

Only after the dead code is gone, because several of these get simpler once it is.

- **Split `work-item-detail.tsx` (1,012 lines)** into header, line items, timeline, and actions.
- **Split `dashboard/page.tsx` (734 lines)** — extract each KPI card and the chart.
- **Regenerate `src/types/database.types.ts`** from the live schema; delete `database.new.ts`.
- **Extract repeated query shapes.** `select company_id from users where id = $1` appears in
  most action files even though `getSession()` already returns it.
- **Consolidate deployment config.** `docker-compose.yml`, `k8s/deployment.yaml`, `railway.json`,
  and `Procfile` describe four different topologies. All are gone.

---

## Phase 6 — Documentation consolidation ✅ DONE 2026-08-11

`CLAUDE.md` and `docs/{ONBOARDING,CODEBASE_MAP,ARCHITECTURE,DATA_MODEL,CONVENTIONS,DEPLOYMENT,LAUNCH_PLAN,CLEANUP_PLAN}.md`
are the canonical set. Everything else is history.

- Move `docs/rebuild/adr/000{1,2,3}` into `docs/adr/` — they're real decisions and still apply.
- Move the surviving content of `docs/rebuild/{DATA_MODEL,AI}.md` into the canonical docs, then
  delete `docs/rebuild/` and `REBUILD.md`.
- Delete `docs/archive/` (112 files). It's in git history if anyone ever needs it.
- Delete the pre-rebuild root docs listed in [CODEBASE_MAP.md](CODEBASE_MAP.md#stale-documentation).
- Rewrite `README.md` as a short human-facing overview — it's currently 38 KB of pre-rebuild
  feature list.
- `.github/copilot-instructions.md`: keep the Gemini-only policy and the brevity rule, drop the
  rest, and point it at `CLAUDE.md`.

**Target:** under 15 markdown files in the repo, every one of them true.

**Outcome (2026-08-11).** `docs/` holds 18 markdown files plus 8 ADRs, all current. Deleted:
`docs/archive/` (22 files), `docs/rebuild/`, `REBUILD.md`, and fourteen orphaned pre-rebuild
guides that no canonical document referenced. The three real ADRs from `docs/rebuild/adr/` moved
into `docs/adr/`, which now runs 0001–0008 in one place.

Phase 2 resolved in [adr/0008](adr/0008-single-python-backend.md): `ai_backend.py` kept, the
other three backend trees deleted (~90 files), with a record of what to retrieve from history
and when. Phase 5's deployment-config item is done — `docker-compose.yml` and `k8s/` are gone,
Railway went too (ADR 0009) — Vercel + Supabase is the whole topology. The file-splitting items in Phase 5 remain open.

---

## Ongoing hygiene

- **Move the repo out of iCloud Drive.** `~/code/rivet`. iCloud syncs every file operation;
  `git rev-list` can hang for minutes and installs crawl. This costs nothing and pays back daily.
- **Delete the `node_modules` → `node_modules.nosync` symlink** once the repo is out of iCloud.
  It's a workaround for a problem you no longer have.
- **`.DS_Store` files are committed** in `docs/`, `src/`, `src/components/`, `prompts/`,
  `.gitignore` covers them but they were added before it did — `git rm --cached`.
- **`generated-pdfs/`** is gitignored but present. Delete it locally.
