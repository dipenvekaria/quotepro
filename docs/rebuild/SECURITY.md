# Security

> **Populated in Phase 7.** Placeholder for Phase 0.

## Threat Model

_TBD — will document trust boundaries, attacker capabilities, data classification._

## Auth Flow

Supabase Auth (email + Google OAuth + magic link) → JWT with 1h expiry + refresh token. Frontend stores in `sb-*` cookies (SameSite=Lax). Backend verifies JWT signature + expiry on every request.

## RLS

Every table has RLS enabled. Policies use SECURITY DEFINER helper `get_user_company_id()` to enforce multi-tenancy at the database layer. Verified in CI by `scripts/verify-rls.ts`.

## Secret Management

- Never commit secrets. `.env.example` documents variable names only.
- Local dev: `.env.local` (gitignored).
- Vercel + Railway: env vars synced from 1Password via `op run` script.
- Rotation cadence: every 90 days for API keys; JWT signing secret rotated only during incidents.

## Public Token URLs

`/q/[token]` and `/i/[token]` use random 128-bit tokens (not sequential UUIDs) to prevent enumeration.

## Rate Limiting

- Per user: 10 AI calls/min, 100 CRUD/min.
- Per company: 1000 CRUD/min.
- Public routes: 30/min per IP.

## Webhooks

All inbound webhooks verify signatures before processing:

- Stripe: `STRIPE_WEBHOOK_SECRET` HMAC.
- Dropbox Sign: `DROPBOX_SIGN_API_KEY` HMAC.
- Twilio: `X-Twilio-Signature` validation.
- LemonSqueezy: `LEMONSQUEEZY_WEBHOOK_SECRET` HMAC.

Persisted to `webhooks_inbound` for idempotent replay.

## Headers

CSP + HSTS + X-Frame-Options + X-Content-Type-Options set in `next.config.ts`. CORS locked to specific origins in FastAPI.

## Dependency Scanning

- `pnpm audit` in CI (fail on high/critical).
- `uv pip audit` in CI.
- Snyk optional.

## Incident Response

See [RUNBOOK.md](RUNBOOK.md).
