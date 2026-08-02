# Architecture

> **Populated in Phase 9.** Placeholder for Phase 0.

## System Diagram

See top-level diagram in [REBUILD.md](../../REBUILD.md#target-architecture).

## Components

_TBD — will document each component's responsibilities, boundaries, and interfaces once Phases 1–3 land._

- Next.js Frontend (Vercel)
- FastAPI Backend (Railway)
- Supabase Postgres (DB + Auth + Storage + Realtime + pgvector)
- Indexer Worker (arq + Redis)
- External integrations: Resend, Twilio, Stripe Connect, Dropbox Sign, LemonSqueezy, PostHog, Sentry, OpenTelemetry.

## Data Flow

_TBD — will document read paths (RSC → Supabase) and write paths (Server Action → Supabase → Postgres NOTIFY → indexer)._

## Deployment Topology

_TBD — will document Vercel + Railway + Supabase deployment boundaries and networking._
