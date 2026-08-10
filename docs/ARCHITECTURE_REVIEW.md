# Architecture Review

_2026-08-09. Written against `main` after reading the live tree, the schema, and the canonical
docs. Scope: structural risk and what cleanup should fix. Not a feature review — see
[PRODUCT_REVIEW.md](PRODUCT_REVIEW.md) for that._

The design is sound. `work_items` as a single lifecycle row is a genuinely good decision, the
quote-to-cash path is coherent, and colocating actions with routes keeps features legible. The
risks below are almost all about **enforcement by convention rather than by construction**, plus
the dead tree.

---

## 1. Tenancy is a convention, and nothing enforces it

The `pg` pool connects as superuser and bypasses RLS. Every statement must carry
`where company_id = $n` by hand, and every mutation must verify ownership first.

There is no type, no test, no lint rule, and no runtime guard behind that. `CLAUDE.md`,
`CONVENTIONS.md`, and the `rivet-data` skill all state the rule three times — which is the
correct response to having no mechanism, but it is not a mechanism. A single forgotten predicate
is a silent cross-tenant read that compiles, passes review, and looks correct in local testing
against one seeded company.

RLS exists and is correct on all 18 tables, but it protects the `anon` and `authenticated`
Postgres roles — not the pool the application actually uses.

**The structural fix** is to make the tenant non-optional at the call site: a `queryTenant`
helper that takes `companyId` as a required argument and refuses statements whose text lacks a
`company_id` predicate, or a thin builder that appends it. Until something like that exists,
Phase 4's tenancy tests are the only real defence, and they are worth more than any other test in
the codebase.

## 2. Money is computed in three places

`saveLineItems` computes `subtotal`/`tax_amount`/`total` server-side. `quote-editor.tsx`
computes the same three client-side for display. The PDF renders its own. Three
implementations of one calculation, with no shared function and no test.

They currently agree. Nothing keeps them agreeing.

Two concrete defects already visible: `saveLineItems` defaults `tax_rate` to a hardcoded `8.5`
rather than reading `companies.settings.tax_rate`, so saving without an explicit rate silently
resets a company's tax rate; and `quote_items.total` is a generated column while the four
`work_items` money columns are written by the application, which is an easy distinction to get
wrong.

Extract one `computeTotals()` and have all three call it.

## 3. Dead code is publicly routable, which makes deletion a security task

Next.js route groups add no URL segment, so `src/app/(dashboard)/dashboard/page.tsx` serves
`/dashboard` in production. The dead tree is not inert — it is reachable, and it carries
pre-rebuild branding, an obsolete 2-role model, and its own redirect logic.

This is not hypothetical. A database TLS failure on 2026-08-09 surfaced to a signed-in user as
the **Field Genie** onboarding page, two product names ago: `/app` threw, the live error boundary
offered "Go to Dashboard", that link pointed at `/dashboard`, and the dead layout redirected to
the dead `/onboarding`. Three live-to-dead handoffs, none of them intentional.

Cleanup Phase 1 is therefore a launch blocker, not hygiene.

## 4. The live/dead map drifts, and it is load-bearing

`CODEBASE_MAP.md` is the stated authority on what runs, and agents and engineers are told to
read it first. It is currently wrong in ways that matter:

- `src/hooks/**` is listed as dead and "only imported by dead routes". `src/app/login/page.tsx`
  imports `useAuth` from it — the entire sign-in path. Following Phase 1 literally would have
  deleted login.
- `src/lib/ai/` appears in neither the live nor the dead table.
- The `rivet-ai` skill instructs contributors to validate AI responses through
  `src/lib/ai/client.ts` and `src/types/api.ts`; both are imported only by the dead
  `src/features/ai/**`, and `types/api.ts` mirrors the *dead* Python backend's schemas.

A hand-maintained classification of 240 files will keep drifting. The durable fix is deletion —
once the dead tree is gone the map has nothing to be wrong about.

## 5. The typecheck gate cannot be fixed by configuration

`npm run typecheck` reports 20 errors on `main` while `CLEANUP_PLAN.md` records it as a measured
0. Both were true at different times, and the mechanism is worth understanding: TypeScript's
`exclude` only removes files from the automatic include glob — it does **not** stop a file being
compiled when an included file imports it. `login/page.tsx` imported `@/hooks/useAuth`, which
dragged the excluded `src/hooks/**` back into the program.

So the excludes in `tsconfig.ci.json` are not a gate, they are a wish. Deletion is the only thing
that makes them true. Until then `rivet-ship` tells every contributor to verify against a gate
that is already red.

## 6. Trust boundaries around the AI service

The FastAPI service holds a **service-role** Supabase key and reads any company's catalog by
`company_id`. Until 2026-08-09 it had no authentication and `allow_origins=["*"]`, and the
browser called it directly with a client-supplied `company_id`.

That is now a server action plus a shared secret, which removes the spoofing surface. But the
trust model is still that *one server action* is the only thing standing between a request and
any tenant's pricing. `LAUNCH_PLAN` correctly wants JWT verification and per-user rate limiting
before public exposure; the shared secret is an internal-prototype measure, not the end state.

## 7. Configuration is validated except where it matters most

`src/lib/env.ts` validates every variable with Zod at boot and fails loudly — except
`DATABASE_URL`, which `src/lib/db/index.ts` reads straight from `process.env`. The one variable
whose absence breaks every page is the one that fails late, at query time, as a connection error.

Related: hosted Postgres needed an explicit SSL decision. `pg` now treats `sslmode=require` as
`verify-full`, and Supabase's pooler presents an untrusted chain, so the deploy failed with
`SELF_SIGNED_CERT_IN_CHAIN` until verification was relaxed. That is currently
`rejectUnauthorized: false` — encrypted but unverified. Shipping Supabase's CA and moving to
`verify-full` is the correct end state.

## 8. Errors leak schema and swallow causes

Server actions return `e instanceof Error ? e.message : …` straight to the client in several
places, which surfaces raw Postgres text. `CONVENTIONS.md` and the `rivet-data` skill both
forbid it. Map errors at the boundary.

## 9. No tests, and the right ones are already identified

`CLEANUP_PLAN.md` Phase 4 names them correctly: tenancy, money, status transitions, one
Playwright happy path, and `verify-rls.ts` in CI. Nothing to add — this is a sequencing problem,
not an analysis problem. Note that items 1 and 2 above are exactly what tests 1 and 2 would
catch.

---

## Recommended order

1. **Delete the dead tree** (Phase 1). Unblocks the typecheck gate, removes the publicly
   routable pages, and makes the map true. Highest value per hour by a wide margin.
2. **Extract `computeTotals()`** and read tax from company settings.
3. **Tenancy and money tests** (Phase 4, items 1–2).
4. **Make tenancy structural** — a helper that cannot be called without a `companyId`.
5. **JWT + rate limiting on the AI service**, and Supabase's CA for `verify-full`.

Items 1–3 are cleanup and correctness. Nothing above adds a feature.
