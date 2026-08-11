# Launch Plan

The path from "runs on a laptop against a local database" to "a contractor can pay for this."

Supersedes `docs/GO_TO_MARKET_CHECKLIST.md`. Priority: **P0** blocks launch, **P1** is needed
for a credible launch, **P2** is fast-follow.

Today the app runs entirely against a **local** Supabase instance exposed through **disposable
Cloudflare quick tunnels**. Stripe is in test mode. There is no production database, no
deployment, and no domain. That's the gap.

---

## P0 — Infrastructure

Nothing else is real until this is done. Roughly a week of focused work.

- [ ] **Provision hosted Supabase** — separate `production` and `staging` projects. Run the four
      migrations. Do *not* run the seed against production.
- [ ] **Deploy the frontend to Vercel** from `main`. Preview deploys on PRs.
- [ ] **Deploy `ai_backend.py` to Railway** (`railway.json` exists). Stable HTTPS URL.
- [ ] **Domain, DNS, TLS.** Decide the production domain — this is also the Rivet naming
      decision made concrete.
- [ ] **Remove every `*.trycloudflare.com` URL** from all environments.
- [ ] **Secrets into the host's secret store.** Nothing in `.env.local` in production.
- [ ] **Rotate every key** that existed during development — Gemini, Supabase service role,
      Resend, Stripe, SignNow. Treat all of them as exposed; they've been in tunnel-facing
      configs and shared during handoff.
- [ ] **Environment separation** — distinct dev / staging / prod projects and keys, no crossover.

Details in [DEPLOYMENT.md](DEPLOYMENT.md).

## P0 — Security

- [ ] **Lock down the AI backend.** It currently runs `allow_origins=["*"]` with **no
      authentication at all** on `POST /api/ai/generate-quote`. Anyone who finds the URL can
      burn your Gemini quota and enumerate any company's catalog by passing a `company_id`.
      Require a Supabase JWT, verify `company_id` matches the caller's company, restrict CORS to
      the production origin, and rate-limit per user. **This is the most serious open issue in
      the codebase.**
- [x] **Tenancy audit — done 2026-08-10, clean.** All 53 data-access call sites in live code
      reviewed. Every statement touching company data is scoped by `company_id`, directly or via
      a verified parent; every mutation verifies ownership first. The three unauthenticated
      routes (`/q`, `/i`, `/join`) authorise by token and derive child rows from the verified
      parent. **No leaks found.** Re-run after any new data access — this is manual and there is
      no automated guard yet (Cleanup Phase 4, test 1).
- [ ] **Run `scripts/verify-rls.ts`** against the production schema. Anon reads must return zero
      rows on every table.
- [ ] **Delete the scratch routes** — `/theme-test`, `/logo-test`, `/premium-logos`,
      `/logo-backgrounds`, `/preview`, `/pricing`, `/dashboard`, `/settings`. They are publicly
      routable today. (Also Phase 1 of [CLEANUP_PLAN.md](CLEANUP_PLAN.md).)
- [ ] **Delete the legacy `(dashboard)` tree** so it cannot leak into production.
- [ ] **Password reset and email verification** verified end to end on the production domain.
- [ ] **Google OAuth redirect URLs** configured for production.
- [ ] **Add a CSP header.** `next.config.ts` has HSTS and the rest; CSP is missing.

## P0 — Correctness

- [ ] **Migrations apply cleanly to an empty production database.** Test on a scratch Supabase
      project first.
- [ ] **Backups configured and a restore actually tested.** Not "backups are on" — a real
      restore into staging.
- [ ] **`npm run build` passes with `ignoreBuildErrors` removed.** Follows from the Phase 1
      deletions.

---

## P1 — Payments

- [ ] **Stripe Connect to live mode** — live keys, Express onboarding tested with a real
      contractor account, payout verification.
- [ ] **Webhook signature verification** confirmed in production. Idempotent handling via
      `webhooks_inbound`.
- [ ] **Card-fee pass-through** tested end to end. Contractors care about this more than any
      other payment detail.
- [ ] **Billing for Rivet itself.** LemonSqueezy is in dependencies but unwired, and
      `companies.plan` exists but is enforced nowhere. Plans, checkout, entitlement gating,
      trial. **You cannot charge for the product until this exists.**

## P1 — Email and notifications

- [ ] **SPF, DKIM, DMARC** on the sending domain, plus a verified Resend sender. Without this,
      quote emails land in spam and the product silently doesn't work.
- [ ] **Complete the transactional set** — quote sent, quote viewed, quote accepted, invoice
      sent, payment receipt, overdue reminder. Several exist; audit which actually fire.
- [ ] **Twilio SMS** if in scope — needs opt-in capture and compliance copy. Defer if unsure.

## P1 — Product gaps

- [ ] **A landing page.** `/` redirects straight to `/login`. There is nowhere to send a
      prospect, nothing for search engines, no pricing page.
- [ ] **Per-jurisdiction tax.** Currently a company-level default in `companies.settings`.
      Wrong the moment a contractor crosses a state line, and quietly so.
- [ ] **E-signature verified in production** — SignNow with the instant-acceptance fallback.
- [ ] **Onboarding that produces a usable catalog.** Quote quality is a direct function of
      catalog quality, and a new signup starts empty. CSV import plus a per-trade starter
      catalog is the highest-leverage activation work available.

## P1 — Observability

- [ ] **Sentry live** — DSN configured, source maps uploaded, releases tracked. Config files
      already exist.
- [ ] **Uptime monitoring** on the app and `/health` on the AI backend, with alerting that
      reaches a phone.
- [ ] **Product analytics.** `env.ts` references PostHog; it isn't installed. Without it you
      cannot see where activation fails.

---

## P2 — Polish and compliance

- [ ] Loading and skeleton states across the app.
- [ ] Accessibility pass — focus order, contrast, labels on icon-only buttons.
- [ ] On-device mobile QA. Techs use this on a phone in a truck; that's the primary surface.
- [ ] Real charts in analytics.
- [ ] PWA manifest verification.
- [ ] Terms and Privacy reviewed by counsel, linked in the footer.
- [ ] **Fix untruthful marketing claims** — the login page says "SOC 2 in progress." Don't imply
      a certification you don't have.
- [ ] GDPR/CCPA data export and delete.
- [ ] E2E happy path in CI.
- [ ] Load-test AI generation and payment webhooks.

---

## Sequencing

**Weeks 1–2 — make it real.** Phase 1 of the cleanup plan in parallel with P0 infrastructure.
These two are complementary: deleting dead code is what lets the production build pass, and
standing up hosted Supabase is what lets anyone else work on it. Lock down the AI backend in
this window — it's a small change and currently the largest open risk.

**Week 3 — make it trustworthy.** Remaining P0 security and correctness. Backups, restore drill,
RLS verification, tenancy audit. Domain, TLS, OAuth.

**Weeks 4–5 — make it chargeable.** Stripe live mode, then Rivet's own billing. Email
deliverability, since a quote that lands in spam is a lost job.

**Week 6 — make it findable and fixable.** Landing page, Sentry, uptime, PostHog. Then P2 as
capacity allows.

## Splitting the work

Two people, minimal collision:

- **Infrastructure and backend track** — hosted Supabase, Vercel, Railway, secrets, AI backend
  lockdown, Stripe live mode, webhooks, email deliverability.
- **Codebase and product track** — Phase 1 deletions, toolchain migration, tenancy audit,
  landing page, onboarding/catalog activation, mobile QA.

The tracks touch different files almost entirely, which is the point.
