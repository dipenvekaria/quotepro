# Runbook

> **Populated in Phases 7 & 8.** Placeholder for Phase 0.

Step-by-step procedures for common incidents.

## Incident: AI Quota Exceeded

_TBD — detect, temporary throttle, escalate to GCP quota increase._

## Incident: DB Connection Pool Exhausted

_TBD — detect via Supabase dashboard, identify hot query, apply hotfix, add index._

## Incident: Indexer Worker Down

_TBD — detect (no NOTIFY consumed), restart worker on Railway, backfill missed entities._

## Incident: Supabase Auth Outage

_TBD — degraded mode: read-only + surface banner._

## Incident: Vercel Deploy Stuck

_TBD — cancel + re-deploy, check build logs, escalate to Vercel support._

## Incident: Elevated Error Rate (Sentry)

_TBD — check Sentry issue, correlate with deploy timestamp, rollback if regression._

## Runbook: DB Migration Rollback

_TBD — how to revert the most recent migration safely._

## Runbook: Secret Rotation

_TBD — 90-day cadence procedure for `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, `STRIPE_SECRET_KEY`._

## Runbook: Backup Restore Drill

_TBD — monthly test restore from pgbackrest to staging._

## Runbook: Verifying RLS

`just verify-rls` — for every table, hits as unauthenticated + as other-company user, asserts 0 rows.

## Runbook: Reindexing a Company

`just reindex COMPANY_ID=<uuid>` — bulk regenerate embeddings after prompt changes or model upgrades.
