# Deployment Guide

> **Populated in Phase 8.** Placeholder for Phase 0.

## Environments

| Environment | Frontend             | Backend              | Database             |
| ----------- | -------------------- | -------------------- | -------------------- |
| Local       | `pnpm dev`           | `uvicorn` + `arq`    | Supabase local       |
| Preview     | Vercel Preview       | Railway Preview      | Supabase branch      |
| Production  | Vercel (main)        | Railway (main)       | Supabase production  |

## Frontend (Vercel)

_TBD — Vercel project config, env vars, preview settings, custom domain._

## Backend (Railway)

_TBD — Railway service config, env vars, PR previews, worker process._

## Database (Supabase)

_TBD — production project, branching for previews, backup schedule, restore drill cadence._

## Migrations

- Every schema change = new file `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
- CI validates syntax + idempotency (`CREATE TABLE IF NOT EXISTS`).
- Applied via `supabase db push` on tag, gated by GitHub Environment approval.

## Rollback

_TBD — full rollback procedure per component._

## Env Vars

See `.env.example` for the canonical list.
