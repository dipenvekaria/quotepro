# Codebase Map

_Verified against the working tree on 2026-08-11, branch `main`._

The pre-rebuild frontend was deleted on 2026-08-09 — 124 files, ~19,600 lines. **Everything
under `src/` now runs.** `tsc --noEmit` passes with no exclusions and `ignoreBuildErrors` is off.

**No dead trees remain.** `python-backend/` was deleted on 2026-08-11 when the AI moved
in-process ([ADR 0009](adr/0009-ai-in-process.md)), taking the last one with it.

> ### This map has been wrong about live code twice
>
> It was built by tracing **imports**, which cannot see a route reached by a URL string.
> `src/app/api/**` was listed as dead on that basis and deleted; five live call sites used
> `fetch('/api/…')`, including the customer-facing "Pay now" button. `src/hooks/useAuth` was
> nearly deleted the same way — the login page imports it.
>
> Before deleting anything that has a URL — a route, a public page, a webhook target — grep for
> its **path**, not its module. An import graph is necessary evidence here, not sufficient.

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
| `src/lib/ai/{gemini,quote,explain,prompts}.ts` | Gemini client and model chain, quote generation with catalog reconciliation, customer summary, prompt loading. |

## Live — backend, data, config

| Path | What it is |
| --- | --- |
| `prompts/` | AI system prompts and templates as markdown. Behaviour changes go here. Bundled via `outputFileTracingIncludes`. |
| `supabase/migrations/00000000000000_baseline.sql` | The canonical schema. 1,114 lines, 17 tables. |
| `supabase/migrations/20260802000001_signup_bootstrap.sql` | `bootstrap_company` RPC. |
| `supabase/migrations/20260803000001_stripe_connect.sql` | Connect account columns. |
| `supabase/migrations/20260806000000_team_invitations.sql` | Invitation table + RPC. |
| `supabase/seed.sql` | Demo company, 3 users, 15 work items. |
| `supabase/config.toml` | Local ports: API 54321, DB 54322, Studio 54323, Inbucket 54324. |
| `next.config.ts` | Security headers, React Compiler, `ignoreBuildErrors` (see note below). |
| `src/app/globals.css` | Rivet design tokens. Read before writing any UI. |

---

## Dead — none

Every tree previously listed here has been deleted. If you find something that looks
unreachable, verify it by path as well as by import (see the warning at the top), then delete
it rather than adding it back to this list.

### Deleted on 2026-08-09 (Cleanup Phase 1)

124 files, ~19,600 lines. In git history if ever needed:

`src/app/(dashboard)/**` · the root `/onboarding` (pre-Rivet "Field Genie" branding) ·
scratch routes `/dashboard`, `/pricing`, `/preview`, `/theme-test`, `/logo-test`,
`/logo-backgrounds`, `/premium-logos` (all publicly routable in production) ·
`src/app/api/**` except `vitals/` · `src/hooks/**` · `src/features/{work-items,catalog,ai}/**` ·
`src/components/{features,queues,navigation,calendar,ai,dialogs,guards}/**` ·
`src/lib/{api,hooks,ai,dashboard-context,default-pricing,prompts,roles,invoice-number,auto-index-catalog,theme-config,toast,web-vitals}` ·
`src/types/database.new.ts` · `supabase/migrations/legacy/**` (35 files incl.
`EMERGENCY_DISABLE_RLS.sql`) · `tsconfig.ci.json`.

**Two things nearly went wrong, worth recording.** `src/app/login/page.tsx` imported
`useAuth` from `src/hooks/` — this file previously claimed those hooks were "only imported by
dead routes", so following it literally would have deleted the sign-in path. `useAuth` now lives
at `src/app/login/use-auth.ts`. And `components/shared/status-badge.tsx` imported
`WorkItemStatus` from `src/features/work-items/schemas.ts`; that type is now declared inline in
the badge.

## Stale documentation

None. `docs/archive/` (22 files), `docs/rebuild/`, `REBUILD.md` and fourteen orphaned
pre-rebuild guides were deleted on 2026-08-11; the three genuine ADRs from `docs/rebuild/adr/`
moved into `docs/adr/`. Everything left in `docs/` is current.

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
