# ADR 0005: Host on Vercel + Railway + Supabase Cloud

> **Amended by [ADR 0009](0009-ai-in-process.md) (2026-08-11).** Railway is no longer part of
> the topology — the FastAPI service it was for has been deleted and the AI runs in-process.
> Vercel + Supabase Cloud stands.


**Status**: Accepted
**Date**: 2026-08-07
**Deciders**: @dipenvekaria

## Context

Rivet has never been deployed. It runs against a local Supabase instance exposed through
disposable Cloudflare quick tunnels. Going live requires picking a topology, and the repo
contained evidence of three different intentions:

1. **Vercel + Railway + Supabase Cloud** — what `docs/rebuild/DEPLOYMENT.md`, `railway.json`,
   `Procfile`, and `next.config.ts` assume.
2. **GCP-native** — implied by the raw `pg` data layer (commented for Cloud SQL), the Vertex AI
   toggle in `ai_backend.py`, `k8s/deployment.yaml`, and the commit message "GCP-native" on the
   Drizzle removal.
3. **Self-hosted Docker** — `docker-compose.yml`.

Leaving this unresolved was blocking every other launch task, and a new engineer joining had no
way to know which was real.

## Decision

**Vercel (Next.js) + Railway (FastAPI) + Supabase Cloud (Postgres, Auth, Storage).**

Reasoning, in order of weight:

- **Team size.** Two people, pre-revenue. Ops time spent is product time not spent. Vercel and
  Railway both deploy on push with zero infrastructure code; GCP needs Cloud Run services, a
  Cloud SQL instance, a connector, IAM, and a Terraform or gcloud story to keep it reproducible.
- **Auth.** Supabase Auth is already wired end to end — cookies, SSR refresh middleware, OAuth
  callback, password reset, invitations. Going GCP-native means replacing it (Identity Platform,
  or self-hosting GoTrue) or running hosted Supabase anyway for auth alone. That's a rewrite of
  the one part of the system that currently works without complaint.
- **The migration path is intact.** Migrations, RLS, and the seed all target Supabase. `supabase
  db push` against a hosted project is a one-command step.
- **Nothing is locked in.** The data layer is raw `pg` against a `DATABASE_URL`. Moving to
  Cloud SQL later is a connection-string change plus an auth decision — precisely the option the
  Drizzle removal was meant to preserve. That option stays open; it just isn't exercised now.

Rejected: **GCP-native.** Better long-run economics at scale and a cleaner story if Vertex AI
becomes central, but it front-loads weeks of infrastructure work at the exact moment the product
needs to reach its first paying contractor. Revisit when either scale or a Vertex-dependent
feature justifies it.

Rejected: **Self-hosted Docker / k8s.** No operational benefit at this size and considerable
cost.

## Consequences

**Positive**
- Live infrastructure achievable in days, not weeks.
- Preview deploys per PR on both frontend and backend, which matters for a two-person team with
  no staging discipline yet.
- Supabase handles backups, PITR, and auth email out of the box.

**Negative**
- Vendor cost scales with usage and gets expensive at high traffic. Acceptable pre-revenue.
- **Vertex AI is awkward on Railway** — it needs Application Default Credentials, which Railway
  doesn't provide natively. Rivet uses AI Studio API keys for now. If Vertex becomes necessary,
  move just the backend to Cloud Run; the unified `google-genai` SDK makes that a config change.
- Serverless plus a `pg` pool needs care: `max: 5` per instance multiplied by Vercel concurrency
  will exhaust connections. Production must use Supabase's transaction-mode pooler (6543), not
  the direct connection.

**Neutral**
- `docker-compose.yml` and `k8s/deployment.yaml` become dead config and are deleted in
  `CLEANUP_PLAN.md` Phase 5.

## Follow-up

- Two Supabase projects: `rivet-staging`, `rivet-production`. Never share a database with preview.
- `DATABASE_URL` in production points at the pooler.
- Rotate every key before launch — all of them have lived in tunnel-facing dev configs.
- The AI backend must not be publicly reachable until it authenticates requests. See
  `docs/LAUNCH_PLAN.md`.
