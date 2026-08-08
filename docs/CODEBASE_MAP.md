# Codebase Map

_Verified against the working tree on 2026-08-07, branch `rebuild/main`._

The repo carries a full pre-rebuild application alongside the current one. Roughly 10,400
lines are live; a larger volume is dead. Nothing has been deleted yet — deletion is sequenced
in [CLEANUP_PLAN.md](CLEANUP_PLAN.md). Until then, **this file is the authority on what runs**.

How the classification was made: every route reachable from `src/app/page.tsx`,
`src/middleware.ts`, and the `/app` shell was traced, then the transitive import closure of
those files was computed. Anything outside that closure is dead.

---

## Live — frontend

| Path | What it is |
| --- | --- |
| `src/app/page.tsx` | Root. Exchanges an OAuth code if present, then redirects to `/app` or `/login`. |
| `src/app/layout.tsx` | Root layout, fonts, theme, toaster. |
| `src/middleware.ts` | Refreshes the Supabase session cookie on every request. |
| `src/app/login/` | Email/password + Google OAuth. |
| `src/app/auth/callback/`, `src/app/auth/actions.ts` | OAuth callback, `signOut` server action. |
| `src/app/app/layout.tsx` | Requires a user; onboarding lives outside the shell. |
| `src/app/app/page.tsx` | `requireSession()` then redirect to `/app/dashboard`. |
| `src/app/app/onboarding/` | Company setup for a brand-new account. **This is the live onboarding.** |
| `src/app/app/_components/app-shell.tsx` | Sidebar, top bar, mobile drawer, user menu. |
| `src/app/app/(shell)/dashboard/` | Home: KPIs, trends, overdue reminders. Largest page (734 lines). |
| `src/app/app/(shell)/pipeline/` | Lead → quote → job board, and the detail page (1,012 lines). |
| `src/app/app/(shell)/quotes/new/` | Quote creation + AI editor (677 lines). |
| `src/app/app/(shell)/calendar/` | Week/month schedule. |
| `src/app/app/(shell)/customers/` | Customer list + detail. |
| `src/app/app/(shell)/catalog/` | Price catalog. |
| `src/app/app/(shell)/analytics/` | Business metrics. |
| `src/app/app/(shell)/integrations/` | Stripe Connect, e-sig, email status. |
| `src/app/app/(shell)/settings/` | Company profile, team, invitations, Stripe. |
| `src/app/q/[id]/` | **Public quote viewer.** `[id]` is `work_items.public_token`. Accept, sign, pay, PDF. |
| `src/app/i/[id]/` | **Public invoice viewer** + PDF. Same token scheme. |
| `src/app/join/[token]/` | Team invitation acceptance. |
| `src/app/api/vitals/` | Web-vitals beacon. The only live route under `src/app/api`. |
| `src/app/brand/` | Internal design-kit page. Dev tool — not customer-facing, but routable. |

## Live — shared code

| Path | What it is |
| --- | --- |
| `src/lib/db/index.ts` | The `pg` pool, `query()`, `withTransaction()`, `withUser()`. Custom numeric/timestamp parsers. |
| `src/lib/auth/session.ts` | `requireSession()` (pages, redirects) and `getSession()` (actions, returns null). |
| `src/lib/supabase/{server,client,admin,untyped,middleware}.ts` | Supabase clients. **Auth only**, plus service-role reads on public token routes. |
| `src/lib/env.ts` | Zod-validated env. `env` for client vars, `envServer()` for server. |
| `src/lib/email/{senders,email-sender,resend-client}.ts` | Resend wrappers. |
| `src/lib/pdf/documents.tsx` | `@react-pdf/renderer` quote + invoice documents. |
| `src/lib/stripe/{client,checkout}.ts` | Stripe Connect + checkout sessions. |
| `src/lib/permissions.ts` | Role matrix: `owner`, `office`, `sales`, `technician`. |
| `src/lib/team-personas.ts` | Invite-by-persona copy. |
| `src/lib/signnow.ts` | E-signature client. |
| `src/lib/utils.ts` | `cn()` and friends. |
| `src/lib/toast.tsx`, `src/lib/web-vitals.ts` | Notifications, vitals reporting. |
| `src/features/invoices/{actions,reminders}.ts` | Invoice conversion, payment recording, overdue reminders. |
| `src/emails/` | React Email templates + shared layout components. |
| `src/components/ui/` | shadcn primitives (19 components). Use these; do not hand-roll. |
| `src/components/brand/logo.tsx` | `BRAND_NAME`, `BrandMark`, wordmark, logo variants. |
| `src/components/shared/{page,empty-state,status-badge}.tsx` | Page container/header/section, empty states, status pills. |
| `src/components/{error-boundary,hide-devtools,network-status}.tsx` | Root-layout utilities. |
| `src/types/api.ts` | Zod schemas for the FastAPI contract. |

## Live — backend, data, config

| Path | What it is |
| --- | --- |
| `python-backend/ai_backend.py` | **The only Python file that runs.** FastAPI, `POST /api/ai/generate-quote`, `GET /health`. Gemini via `google-genai`, model fallback chain, keyword-match mock fallback. |
| `prompts/` | AI system prompts and templates as markdown. Behaviour changes go here. |
| `supabase/migrations/00000000000000_baseline.sql` | The canonical schema. 1,114 lines, 17 tables. |
| `supabase/migrations/20260802000001_signup_bootstrap.sql` | `bootstrap_company` RPC. |
| `supabase/migrations/20260803000001_stripe_connect.sql` | Connect account columns. |
| `supabase/migrations/20260806000000_team_invitations.sql` | Invitation table + RPC. |
| `supabase/seed.sql` | Demo company, 3 users, 15 work items. |
| `supabase/config.toml` | Local ports: API 54321, DB 54322, Studio 54323, Inbucket 54324. |
| `next.config.ts` | Security headers, React Compiler, `ignoreBuildErrors` (see note below). |
| `src/app/globals.css` | Rivet design tokens. Read before writing any UI. |

---

## Dead — do not edit, do not copy patterns from

| Path | Why it's dead | Notes |
| --- | --- | --- |
| `src/app/(dashboard)/**` | Pre-rebuild UI, superseded by `src/app/app/(shell)`. | Unreachable — no link or redirect points at it. Several files carry `@ts-nocheck`. **This tree is the sole reason `ignoreBuildErrors` is on.** |
| `src/app/api/**` except `vitals/` | Old REST layer replaced by Server Actions. | Still imports the Supabase data client. |
| `src/app/onboarding/` (root) | Superseded by `src/app/app/onboarding/`. | `@ts-nocheck`. Nothing redirects here. |
| `src/app/dashboard/`, `src/app/settings/`, `src/app/pricing/`, `src/app/preview/`, `src/app/theme-test/`, `src/app/logo-test/`, `src/app/logo-backgrounds/`, `src/app/premium-logos/` | Scratch and experiment routes. | Publicly routable in production. Removing them is a launch-blocking task. |
| `src/components/features/**` | Old feature components (leads, quotes, pay, settings, work). | |
| `src/components/{queues,navigation,calendar,ai,dialogs,guards}/**` | Old UI systems. | Includes duplicate pairs like `dashboard-nav` vs `dashboard-navigation`. |
| `src/components/*.tsx` at root, except `error-boundary`, `hide-devtools`, `network-status` | Pre-rebuild widgets, plus `field-genie-logo` and `logo-options` from earlier branding rounds. | 20 files. |
| `src/hooks/**` | React-Query hooks against the old schema. | Only `useAuth` and `useOnboarding` are imported, and only by dead routes. |
| `src/features/{work-items,catalog,ai}/**` | Written during the rebuild, never wired up. | `work-items/queries.ts` still uses the Supabase client, contradicting the `pg` data layer. `work-items/schemas.ts` is the one exception — `status-badge.tsx` imports its `WorkItemStatus` type. |
| `src/lib/{api,hooks,dashboard-context,default-pricing,prompts,roles,invoice-number,auto-index-catalog,theme-config}` | Superseded. | `src/lib/roles.ts` is the old 2-role model; `src/lib/permissions.ts` is the live 4-role one. |
| `src/types/{database.types,database.new}.ts` | Generated against schemas that no longer match. | Regenerating these is a cleanup task. |
| `python-backend/src/quotepro/**` | A complete, well-structured FastAPI app (38 files: ADK agents, RAG, sessions, workers) that **was never wired up**. | The most valuable dead code in the repo. Decide explicitly whether to adopt or delete — see CLEANUP_PLAN. |
| `python-backend/{app,api,services,db,config}/**` | Two further generations of the backend. | |
| `python-backend/*.py` at root except `ai_backend.py` | `main.py`, `auto_indexer.py`, `catalog_indexer.py`, `quote_indexer.py`, `tax_rates.py`, `check_db.py`. | `start-backend.sh` still points at `main.py` and a hardcoded `/Users/dipen/` path. |
| `supabase/migrations/legacy/**` | 30+ pre-rebuild migrations including `EMERGENCY_DISABLE_RLS.sql`, `TEMP_BYPASS_RLS.sql`, `ADD_YOURSELF_AS_OWNER.sql`. | Not applied by `supabase db reset`. Dangerous if ever run. |
| `emails/quote-sent.tsx` (repo root) | Duplicate of `src/emails/QuoteSentEmail.tsx`. | |
| `scripts/*.sh` (most) | One-off theme and migration scripts from earlier passes. | `sync-tunnels.sh` and `verify-rls.ts` are still useful. |

## Stale documentation

Accurate as of the date in each file, describing a system that has since changed:

- `README.md` (38 KB) and `REBUILD.md` (50 KB) — the rebuild plan and the pre-rebuild feature list.
- `docs/rebuild/**` — mostly `_TBD_` placeholders. `DATA_MODEL.md` and `AI.md` there have real
  content; `adr/0001`–`0003` are genuine and worth keeping.
- `docs/archive/**` — 112 files.
- `docs/{ARCHITECTURE,DEVELOPMENT,DEPLOYMENT,DEPLOYMENT_GUIDE,ENVIRONMENT_CONFIG,SECURITY_*,MONITORING_*,QUICK_START,SUPABASE_SETUP,ROLE_PERMISSIONS,...}.md` — pre-rebuild.
- `.github/copilot-instructions.md` — still valid on the Gemini-only model policy and on brevity;
  its content is carried into `CLAUDE.md`.

---

## Cross-cutting inconsistencies

These are real and worth knowing before you trust any single file:

1. **Two data-access styles coexist.** Live pages use raw `pg` (`query()` from `@/lib/db`).
   Dead code uses the Supabase JS client. Public token routes (`/q`, `/i`) legitimately use the
   service-role Supabase client because they run unauthenticated — that is not a leftover.
2. **`justfile` and `.github/workflows/ci.yml` describe a toolchain that isn't installed** —
   pnpm, biome, vitest, playwright, uv, ruff, arq, Redis. `package.json` has npm + eslint and no
   test runner. CI as written cannot pass.
3. **`.github/workflows/{test,deploy}.yml` are pre-rebuild** and reference `npm run type-check`,
   which does not exist.
4. **`docker-compose.yml`, `k8s/deployment.yaml`, `railway.json`, `Procfile`** each describe a
   different deployment shape. Only Railway is on the chosen path.
5. **`.env.local` points at expired Cloudflare quick tunnels** for both Supabase and the backend.
6. **`node_modules` is a symlink to a `node_modules.nosync` directory that doesn't exist.**
   Nothing builds until `npm install` recreates it.
