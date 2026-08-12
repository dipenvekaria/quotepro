# Deployment

**Topology: Vercel + Supabase Cloud.** Decision in
[`adr/0005-hosting-vercel-railway-supabase.md`](adr/0005-hosting-vercel-railway-supabase.md),
amended by [`adr/0009-ai-in-process.md`](adr/0009-ai-in-process.md) — Railway is gone, and with
it the separate AI service.

```
Vercel                              Supabase Cloud
Next.js 16 + Gemini in-process  →   Postgres + Auth + Storage
main                                migrations from repo
```

| Environment | App | Database |
| --- | --- | --- |
| Local | `npm run dev` | `supabase start` |
| Preview | Vercel preview per PR | staging project |
| Production | Vercel, `main` | production project |

Preview and production must use **different Supabase projects**. A shared database means a
preview deploy can corrupt live contractor data.

## Database

Two projects: `rivet-staging` and `rivet-production`.

```bash
supabase link --project-ref <ref>
supabase db push                 # applies supabase/migrations/*.sql
```

Never run `supabase/seed.sql` against production — it creates demo users with a known password.

Also required:

- **Point-in-time recovery on.** Then actually test a restore into staging. An untested backup
  is not a backup.
- **Auth redirect URLs** for the production domain, and Google OAuth authorised origins.
- **Email templates** branded, sending through Resend rather than Supabase's default sender.
- **Connection pooling.** The `pg` pool is `max: 5` per instance; Vercel serverless multiplies
  that by concurrency. Use Supabase's pooler (port 6543, transaction mode) for `DATABASE_URL` in
  production, not the direct 5432 connection.

## Frontend (Vercel)

Root directory `/`, production branch `main`, framework preset Next.js.

Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL          https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL               https://<domain>
GEMINI_API_KEY                    server only — never NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY         server only
DATABASE_URL                      pooler connection string
RESEND_API_KEY
RESEND_FROM_EMAIL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PLATFORM_FEE_BPS
DROPBOX_SIGN_API_KEY
NEXT_PUBLIC_SENTRY_DSN
```

`src/lib/env.ts` validates these at boot with Zod and fails loudly on a missing required var —
which is the behaviour you want. Don't work around it.

`ignoreBuildErrors` is off and `tsc --noEmit` passes with no exclusions, so a type error fails
the build — which is the point. Don't reintroduce either escape hatch.

## AI

There is nothing to deploy. Gemini is called from `src/lib/ai/` inside the server actions, so it
ships with the Next.js build and inherits the function's limits (300s on Fluid Compute, ample
for a Flash call).

The only required variable is `GEMINI_API_KEY`. `GEMINI_MODELS` is optional and overrides the
fallback chain.

**Watch `mode` on generated quotes.** `gemini:<model>` is real generation; `mock` means the
keyword matcher produced them. A missing or empty key silently yields `mock` — it does not
error. Alert on it.

Also watch the function logs for `ai/quote: dropped items with no catalog match`. Each one is a
line item the model invented that was discarded before reaching a customer. A steady stream
means the contractor's catalog is missing something they sell.

### Still outstanding

**Per-user rate limiting.** One account can burn the shared Gemini quota for everyone. The other
three items that used to sit here — JWT verification, deriving `company_id` from the token, CORS
— went away with the separate service: the code now runs inside the authenticated server action
with the session in scope.

## CI/CD

`.github/workflows/ci.yml` describes the target pipeline (pnpm, biome, vitest). It cannot pass
today — none of that toolchain is installed. Phase 3 of [CLEANUP_PLAN.md](CLEANUP_PLAN.md)
fixes it.

`.github/workflows/{test,deploy}.yml` are pre-rebuild and reference scripts that no longer
exist. Delete them; Vercel deploys on push natively.

## Rollback

- **App** — Vercel: promote the previous deployment. Instant, and it takes the AI with it.
- **Database** — migrations are forward-only. A bad migration needs a compensating migration,
  not a revert. Test every migration on staging first. PITR is the last resort and it costs
  data.

## Domain and DNS

- Apex + `www` → Vercel. Nothing else needs a record; there is no second service.
- Resend needs SPF, DKIM, and DMARC records on the sending domain. Without them, quote emails
  land in spam — a silent failure that looks like customers ignoring quotes.

## Secrets

Vercel environment store only. Nothing in the repo, nothing in `.env.local` in
production.

**Rotate every key before launch.** Gemini, Supabase service role, Resend, Stripe, SignNow —
all of them have lived in tunnel-facing dev configs and been shared during handoff. Treat them
as compromised. Rotate again on any team change.
