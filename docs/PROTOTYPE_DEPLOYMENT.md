# Prototype Deployment Plan

Getting Rivet off a laptop and onto a URL two engineers can share, without pretending it's a
product launch. Roughly **three to four days of focused work**, one person, mostly waiting on
DNS and dashboards.

This is deliberately narrower than [LAUNCH_PLAN.md](LAUNCH_PLAN.md). That document is the path
to a paying contractor. This one gets you a working deployed prototype, a second engineer who
can contribute, and a rhythm for continuing the build.

## What "done" looks like

- A URL you can open on a phone that runs the real app against a real hosted database.
- Only you and your engineers can reach it.
- Both of you can develop locally without stepping on each other.
- The engineer can open a PR, get a preview deploy, and merge it.
- Nothing in the stack is a disposable tunnel or a hardcoded laptop path.

## Decisions taken

| | |
| --- | --- |
| **Access** | Internal only. Vercel Authentication, no public signup, demo data is fine. |
| **Databases** | Local Supabase per engineer + one shared hosted `rivet-staging`. |
| **Hosting** | Vercel + Supabase Cloud — [ADR 0005](adr/0005-hosting-vercel-railway-supabase.md), amended by [0009](adr/0009-ai-in-process.md). No separate AI service. |
| **Stripe** | Stays in test mode. |
| **First engineer task** | Cleanup Phase 1 — delete the dead tree. |

---

## Step 0 — Move the AI call server-side ✅ done

The browser used to call the AI service directly with a client-supplied `company_id`, which
meant editing one value in devtools returned another tenant's catalog-derived pricing. That
moved into a server action, where `company_id` comes from the session.

Superseded entirely on 2026-08-11: there is no AI service any more, so there is no cross-origin
call to secure. Gemini runs in-process ([ADR 0009](adr/0009-ai-in-process.md)).

---


## Step 1 — Accounts and access

Half a day, mostly clicking.

1. **GitHub** — add the engineer as a collaborator on `dipenvekaria/quotepro`.
2. **`main` is the only branch.** The pre-rebuild history is tagged `pre-rebuild-main`.
3. **Protect `main`** — require a PR, require CI to pass once CI actually works
   (Cleanup Phase 3). For two people, one approval is enough; don't make it heavier than that.
4. **Vercel and Supabase** — invite the engineer to each. Both have free-tier seats
   that cover this.
5. **Secrets** — put every key in a shared 1Password vault (or Bitwarden). Not Slack, not
   `.env` files over email. This is also the moment to **rotate everything**: the Gemini,
   Supabase, Resend, Stripe and SignNow keys have all lived in tunnel-facing dev configs.

---

## Step 2 — Hosted Supabase

Half a day.

Create one project, `rivet-staging`, in the region nearest your users.

```bash
supabase link --project-ref <ref>
supabase db push          # applies the four migrations in supabase/migrations/
```

**Do not run `supabase/seed.sql` against it.** It creates demo users with the password
`demo1234`. Instead, sign up through the app once and let `handle_new_auth_user()` and
`bootstrap_company()` create your company the way a real user would — that also tests the
onboarding path.

Also configure:

- **Auth redirect URLs** for the Vercel domain, and Google OAuth authorised origins.
- **Point-in-time recovery on.** Cheap insurance even for a prototype.
- **Connection pooling.** `src/lib/db/index.ts` opens a pool with `max: 5` per instance, and
  Vercel multiplies that by concurrency. `DATABASE_URL` in production must be the **transaction-mode
  pooler on port 6543**, not the direct 5432 connection, or you will exhaust connections under
  trivial load.

Local development is unaffected — everyone keeps running `supabase start` with the demo seed.

---

## Step 3 — Deploy the app

Two hours.

Vercel project, production branch `main`, framework preset Next.js.

```
NEXT_PUBLIC_SUPABASE_URL       https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  <anon>
NEXT_PUBLIC_APP_URL            https://<your-vercel-domain>
SUPABASE_SERVICE_ROLE_KEY      <service role>
DATABASE_URL                   <pooler connection string, port 6543>
GEMINI_API_KEY                 <rotated key — server only>
RESEND_API_KEY                 <rotated>
RESEND_FROM_EMAIL              no-reply@<your-domain>
STRIPE_SECRET_KEY              <test mode>
STRIPE_WEBHOOK_SECRET          <test mode>
```

Note what is absent: **no `NEXT_PUBLIC_` prefix on `GEMINI_API_KEY`.** That would ship the key
to every browser that loads the app.

`src/lib/env.ts` validates all of this with Zod at boot and fails loudly on anything missing.
That's the behaviour you want — don't work around it.

**Turn on Deployment Protection → Vercel Authentication (Standard).** This covers production
*and* every preview deploy, and only your Vercel team members get through. That is the whole
access-control story for an internal prototype, and it's one toggle.

A custom domain is optional at this stage; `*.vercel.app` is fine until you're showing it to
someone outside the team.

---

## Step 4 — Verify

An hour, on a real phone as well as a desktop.

- Sign up fresh → onboarding creates a company → land on the dashboard.
- Add catalog items (CSV import or by hand). **Quote quality is a function of catalog quality**
  — an empty catalog makes the AI look broken when it isn't.
- Create a quote, run AI generation, confirm real line items with real prices.
- Send the quote; check the email arrives (Resend logs will tell you if it's being dropped).
- Open `/q/<public_token>` in a private window. Accept it.
- Schedule the job, complete it, convert to invoice, record a test payment.
- Confirm the generated quote reports `mode: "gemini:<model>"`, not `mock`.
- Confirm a logged-out visitor to the Vercel URL hits the Vercel Authentication wall.

If any step fails, fix it before onboarding anyone — debugging a broken deploy is a much worse
first day than a working one.

---

## Step 5 — Onboard the engineer

Half a day of theirs, an hour of yours.

Point them at [ONBOARDING.md](ONBOARDING.md) and
[CLAUDE_CODE_SETUP.md](CLAUDE_CODE_SETUP.md). They cover the machine setup, the local stack,
and getting Claude Code loaded with the project context.

The three things worth saying out loud, because they're the ones that cost real time:

1. **Clone outside iCloud Drive.** `~/code/rivet`.
2. **`main`** — the only branch.
3. **Half the repo is dead code.** [CODEBASE_MAP.md](CODEBASE_MAP.md) says which half. This is
   the single highest-value thing they can read.

Then walk them through one quote end to end in the deployed app, and one in their local stack.
Twenty minutes, and it makes the architecture concrete in a way the docs can't.

---

## Step 6 — Continue the build

**Their first task: Cleanup Phase 1 — delete the dead tree.**
See [CLEANUP_PLAN.md](CLEANUP_PLAN.md).

It's the right first task for reasons beyond the cleanup itself: it's low-risk, it's obviously
verifiable (`tsc --noEmit` gets cleaner with each PR), it forces them to trace what's actually
reachable, and it ends with `ignoreBuildErrors` coming off `next.config.ts` — which means every
subsequent change is type-checked for real. One PR per numbered item in that plan, not one
giant delete.

**Meanwhile, you take the infrastructure track.** The two barely touch the same files, which is
the point:

| You | Them |
| --- | --- |
| Steps 0–5 above | Cleanup Phase 1 |
| Then: full JWT auth on the AI backend | Then: Phase 3 — pnpm/biome/vitest, make CI real |
| Then: Stripe live-mode prep, email domain auth | Then: Phase 4 — tenancy and money tests |

**Rhythm.** Small PRs off `main`, each with a preview deploy Vercel generates
automatically. `npx tsc --noEmit` clean before opening — the `rivet-ship` skill has the full
gate. Anything non-obvious becomes an ADR in `docs/adr/`.

**Keep the docs true.** When behaviour changes, the doc describing it changes in the same PR.
This matters more than usual here because the docs are also the agent's context — a stale
`CLAUDE.md` doesn't just mislead a person, it misleads every Claude session either of you runs.

---

## Rollback

- **Frontend** — Vercel, promote the previous deployment. Instant.
- **Database** — migrations are forward-only. A bad one needs a compensating migration, not a
  revert. Test every migration against a local `supabase db reset` first. PITR is the last
  resort and it costs data.

## Deliberately not in this plan

All of it lives in [LAUNCH_PLAN.md](LAUNCH_PLAN.md) and matters before real customers, not
before your engineer's first PR:

Stripe live mode · Rivet's own billing and entitlements · SPF/DKIM/DMARC · a landing page ·
per-jurisdiction tax · Sentry, uptime monitoring, PostHog · Terms and Privacy · GDPR/CCPA
export and delete · load testing · a production database separate from staging.

One caveat on that last point: the moment you show this to someone outside the team, `staging`
stops being staging. Add the production project then, not before.
