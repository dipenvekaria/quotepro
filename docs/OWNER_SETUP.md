# Owner Setup — production runbook

What has to be true for getrivet.ai to serve real customers, split into what is
already done (verified against the live Vercel env on 2026-08-19) and what still
needs a human. Engineer machine setup is a different doc:
[`ENGINEER_RUNBOOK.md`](ENGINEER_RUNBOOK.md).

## Done — verified in production

| Piece | State |
| --- | --- |
| Domain | getrivet.ai on Vercel, SSL issued, `NEXT_PUBLIC_APP_URL=https://getrivet.ai` |
| Database | Supabase Cloud; all migrations pushed; `POSTGRES_URL` wired by the integration |
| Auth | Supabase Auth with Google OAuth + email; signups **gated** (allow-list) until launch |
| AI | `GEMINI_API_KEY` funded; no fallbacks — failures surface as errors and log `status='degraded'` in `ai_conversations` |
| Email | Resend with **verified** getrivet.ai domain; sends as "Rivet <quotes@getrivet.ai>"; replies go to the business, not Rivet |
| Payments (customers → contractor) | Stripe Connect wired; contractors onboard from Integrations |
| Billing (contractor → Rivet) | Stripe Billing: founding $49 Solo / $99 Team (first 100 companies, then $79/$139 — automatic), 14-day trial, card up front; prices self-provision by lookup key |
| QuickBooks | **Production keys live**; OAuth + sync verified |
| Crons | `vercel.json`: quote follow-ups, catalog reindex, recurring visits — daily, guarded by `CRON_SECRET` |
| Support | `SUPPORT_INBOX` set — in-app "Email us" delivers there, reply-to the sender |
| Payments (sandbox) | Full chain verified on prod: checkout → webhook → invoice paid, pi reference stored |
| Sentry | Live — DSN set, client+server capture verified with a test error |
| PostHog | Live — pageviews capturing, autocapture off |
| Ops portal | **Field Genie** at thefieldgenie.com/admin — allow-listed Google accounts only; business metrics + Vercel/Sentry/PostHog snapshots; getrivet.ai/admin 404s |

## To do — in order

1. **Supabase Auth config (5 minutes).** Dashboard → Auth → URL Configuration:
   add `https://thefieldgenie.com/**` to Redirect URLs (portal sign-in), set Site
   URL to `https://getrivet.ai`, and turn **Confirm email** on at launch.
2. **Stripe live mode.** Everything currently runs on sandbox keys. At launch:
   swap `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to live, re-create the webhook
   endpoint on live mode pointing at `https://getrivet.ai/api/stripe/webhook`, and
   enable `customer.subscription.created / updated / deleted` events on it (billing
   state stays stale without them).
3. **Google OAuth branding.** Cloud console → OAuth consent screen: app name, logo,
   getrivet.ai domain — this is what replaces the raw `supabase.co` text users see on
   the Google login screen. `/privacy` and `/terms` URLs exist and are live.
5. **Open the doors.** Set `NEXT_PUBLIC_SIGNUPS_OPEN=true` (unset = false =
   allow-list only) and redeploy. This is the launch switch.
6. **Legal review.** Counsel pass over `/terms` and `/privacy` before charging real
   cards. Drafts were written by the legal-review skill; they are not a substitute
   for a lawyer.
7. **Decide trial-expiry behaviour.** Stripe charges the card automatically at day
   14. In-app enforcement for people who cancel-then-linger, and grandfathering for
   pre-launch accounts, is a product decision that has not shipped.

8. **Sentry.** Config files exist; the DSN does not. Create the Sentry project,
   set `NEXT_PUBLIC_SENTRY_DSN` in Vercel, and the wiring gets verified with a
   thrown test error.
9. **PostHog.** Declared in `env.ts`, not yet installed. Create the project, set
   `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`, and the client gets
   instrumented (pageviews + the handful of product events worth counting).
10. **Repo rename `quotepro` → `rivet`.** One `gh repo rename`; Vercel and GitHub
    redirects follow automatically, local remotes get updated after.
11. **Retell (call answering).** The larger one: needs a Retell account, a phone
    number, an agent configured to Rivet's script, and a webhook that turns a
    finished call into a lead. Bundled as 100 min (Solo) / 300 min (Team);
    costs and margins in `docs/COST_PER_CUSTOMER.md`, decision in
    `docs/PRICING_STRATEGY.md`.

## Optional / later

- `ASSISTANT_MODELS` — pin Bolt to a specific Gemini model; unset it uses the chain's
  default. `GEMINI_MODELS` likewise for quoting.
- Twilio (SMS) — needed before phone verification ships.

## Operating notes

- Env changes only take effect on the **next deploy** — change, then redeploy.
- Prod SQL, read-only diagnosis: `supabase db query --linked "select …"` from the
  repo (Management API; no direct connection string needed).
- Alerting: watch `ai_conversations` where `status='degraded'` — that is Gemini
  failing loudly, by design.
- `DATABASE_URL` is read raw (not Zod-validated) and falls back to `POSTGRES_URL`
  on Vercel; a bad value fails at first query, not at boot.
