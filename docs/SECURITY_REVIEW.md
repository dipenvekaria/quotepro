# Security & architecture review

Date: 2026-08-15
Scope: the whole running system — routes, data access, dependencies, secrets, storage.

Every finding was reproduced against the code or the database. Where something is theory rather
than tested, it says so. Findings are ordered by what an attacker or an accident reaches first.

> **This repository is public.** Keep project ids, account ids, emails and hostnames out of this
> document. Describe a weakness precisely enough to fix and never precisely enough to locate —
> anything more belongs in a private issue.

## Summary

There is no cross-tenant data leak reachable today, and that is not luck — the hand-written
`company_id` predicates hold, the static scanner enforces them, and the public tokens are strong.
What the review found instead is a **thin margin**: several controls are one small mistake away
from mattering, one route was open because it was forgotten rather than because it was reasoned
about, and customer photos are readable by anyone holding a URL.

Two fixes are in this change. The rest are ordered below.

---

## Fixed in this change

### 1. An unauthenticated, untenanted mutation endpoint — `/api/quotes/[id]/mark-paid`

`/api/*` sits outside the auth middleware by design, so every route there must authenticate
itself. This one did not. It read the session **after** the write, only to attribute the activity
log, and updated `work_items` filtered by `.eq('id', id)` alone — no company predicate.

It was not exploitable as written, for three accidental reasons: it set `status: 'paid'`, which is
not in the `work_item_status` enum; it wrote `paid_at` and `payment_method`, which are not columns
on `work_items`; and it used the cookie client, so RLS applied. It was also called from nowhere in
the application.

That is four accidents deep, and every one of them is the kind of thing a later "fix" removes.
**Deleted.**

The lesson generalises: `/api/*` is unauthenticated by default here. Any route added there is
open until someone remembers otherwise.

### 2. Vulnerable dependencies carried for integrations that do not exist

`npm audit` reported 10 vulnerabilities, 4 high. Three of the four arrived through `twilio` and
`@dropbox/sign`, which are **imported in zero source files** — Twilio is documented as "not
wired", and e-signature never landed.

Removing both:

| | before | after |
| --- | --- | --- |
| total | 10 | 6 |
| high | 4 | 2 |

Gone with them: `jws` (improper HMAC verification, reachable through `jsonwebtoken`), `axios`
(NO_PROXY bypass leading to SSRF), and one path to `form-data`. Carrying a vulnerable HMAC
verifier for a feature that does not exist is pure cost.

The remaining two high findings (`ws`, `form-data`) arrive through `@google/genai` and
`google-auth-library`, which are load-bearing. They need an upstream bump, not removal.

---

## Open findings, in priority order

### 3. Customer photos are world-readable, permanently — **highest remaining risk**

The `quote-photos` bucket is `public: true`, and both read paths use `getPublicUrl()`. The path is
`{companyId}/{workItemId}/{uuid}.{ext}` — unguessable, so this is not a scanning risk. But every
URL is permanent, unauthenticated, and survives the quote being deleted, the customer being
deleted, and the account being closed.

These are photographs of people's homes: the failed water heater in their basement, the roof they
are insured on, sometimes the inside of their property. Anywhere such a URL is forwarded — an
email, a text to a spouse, a subcontractor's group chat — it is public forever.

**Fix:** make the bucket private and issue short-lived signed URLs. `createSignedUrl` is a
drop-in for the two `getPublicUrl` call sites in `photo-actions.ts`. This is roughly an hour and
it is the finding most likely to embarrass the product.

### 4. Row-level security is capable but not in force

Covered in `ARCHITECTURE_SCALE.md` and half-addressed already: the grants are fixed and the
policies are proven correct by six tests. The application still connects as a superuser, so the
policies do not run and tenancy rests entirely on hand-written predicates plus the scanner.

Worth stating plainly what the recent grants change did and did not do. `authenticated` now holds
DML on tenant tables where before it held none, and `TRUNCATE` was revoked from it and from
`anon`. That is strictly safer than the previous state, in which a role that could not read a row
could still empty a table. But it also means any code path that reaches the database with the
anon key — the cookie client, as `/api/quotes/[id]/mark-paid` did — can now write within RLS where
it previously failed closed on a missing grant. Nothing in the app does this today; the deleted
route was the only instance.

### 5. No rate limiting anywhere

There is none, on any surface. Three matter:

- **`/q/{token}` accept and sign.** A leaked or forwarded token can be replayed. The token is
  128 bits from `gen_random_bytes(16)`, so it cannot be guessed — but nothing throttles use once
  it is known.
- **AI drafting.** Authenticated, so it needs a compromised or malicious account, but each call
  costs money and one account can loop it.
- **Address autocomplete.** Same shape, against a Google quota with a daily cap.

The daily quota cap and the AI timeout bound the damage; neither is a rate limit.

### 6. Server actions returning without input validation

The convention — Zod validate, return `{ ok }` — is followed in most places. A crude count finds
several files with more exported actions than `safeParse` calls. Some are legitimate (an action
taking no input cannot validate one), so this is a list to audit rather than a list of holes.
Worth doing once, deliberately, and worth a lint rule afterwards.

### 7. Everything runs on one person's personal accounts — **go-live blocker**

Confirmed during this review, not assumed:

| Service | Owner today |
| --- | --- |
| Google Cloud project — Vertex AI, Places | a personal Google account, sole `roles/owner` |
| Google billing account | same person, sole `roles/billing.admin` |
| Vercel project | personal account, no team |
| Supabase project | personal |
| Stripe, Resend | personal |
| Production domain | personal, and still registered under the legacy product name |

(Identifiers deliberately omitted — this repository is public. They are in the
Vercel and Google consoles.)

Every key, project id and service account in production belongs to an individual. Three
consequences, in order of how much they hurt:

1. **Single point of failure.** If that Google account is lost, suspended or locked out, Vertex
   AI and Places stop and there is no second owner to restore them. The same holds for Vercel and
   Supabase.
2. **Nothing is transferable.** Company data sitting on personal accounts is a problem the first
   time there is an entity, an investor or an acquirer, and migrating live infrastructure is much
   harder than starting it correctly.
3. **No separation between a person and the business** for audit, DPA or subprocessor purposes —
   the subprocessor list in `GTM_BUSINESS_CHECKLIST.md` names organisations, and none of these
   are one.

**Before going live**, move to organisation-owned accounts and reissue everything: Google Cloud
org and project, service account and its key, Vercel team, Supabase organisation, Stripe account,
Resend domain, and the production domain itself. Treat every credential currently in use as
disposable — they were created for a prototype and several have been pasted into chat transcripts.

This is planned. Recording it so it is a gate rather than a memory.

### 8. Leaked credentials from earlier sessions still need rotation

A Supabase access token (`sbp_db77…`) and a Google OAuth client secret (`GOCSPX-…`) were pasted
into a chat transcript. Neither has been rotated. The repository is **public**, and although
neither value is in it, both grant real access and should be assumed compromised.

---

## What is genuinely solid

Said plainly, because a review that only lists problems is misleading about where the system
stands.

- **Public tokens are strong.** `encode(gen_random_bytes(16), 'hex')` — 128 bits, unique,
  unguessable. The correct choice, and not always the one made.
- **No SQL injection surface.** Every statement is parameterised. The only interpolation is
  structural — table aliases and placeholder numbers in `liveTierPredicate`, `workItemScope` and
  the calendar filter — and no user input reaches it.
- **Tenancy is tested, not assumed.** A static scanner asserts every statement carries a company
  predicate or a recorded exemption, and integration tests prove cross-tenant reads and writes
  return nothing. That scanner caught three real mistakes during this session.
- **Secrets never reach the browser.** The Gemini, Places and service-account credentials are all
  behind `envServer()`; there is no `NEXT_PUBLIC_` path to any of them.
- **Security headers are set** — HSTS with preload, `X-Content-Type-Options`, `X-Frame-Options`,
  a restrictive `Permissions-Policy`.
- **Stripe webhooks verify signatures**, and the cron route refuses to run without `CRON_SECRET`
  rather than running open.
- **Account closure archives rather than destroys**, and the archive is service-role only.

## Ordered plan

| # | Finding | Effort |
| - | ------- | ------ |
| 1 | Private photo bucket + signed URLs | ~1 hour |
| 2 | Rotate the two leaked credentials | Minutes, needs you |
| 2b | Move off personal accounts and reissue every key — **go-live gate** | Days, needs you |
| 3 | Rate limit the public accept/sign routes and the AI actions | ~1 day |
| 4 | Audit server actions for input validation, then lint it | ~1 day |
| 5 | Connect as a non-superuser role so RLS is in force | Days — see `ARCHITECTURE_SCALE.md` |
| 6 | Upstream bump for `ws` / `form-data` via `@google/genai` | Watch |
