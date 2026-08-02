# QuotePro 2.0 — Builder Plan

> **Approach**: Phased in-place refactor. Repo stays, data can be wiped (no prod users), stack modernized aggressively toward 2026 best-of-breed.
>
> **Executor**: Autonomous coding agent. Each phase has verifiable checkpoints and explicit file paths.
>
> **Target output**: A rebuilt `quotepro/` on `rebuild/main` branch that meets every success criterion in this document, tagged `v2.0.0`.

---

## Table of Contents

1. [TL;DR](#tldr)
2. [Recommendation Rationale](#recommendation-rationale)
3. [Current State Findings](#current-state-findings)
4. [Target Architecture](#target-architecture)
5. [Tech Stack Decisions](#tech-stack-decisions)
6. [Success Criteria](#success-criteria)
7. [Phases](#phases)
   - [Phase 0 — Foundation & Cleanup](#phase-0--foundation--cleanup)
   - [Phase 1 — Canonical Data Model](#phase-1--canonical-data-model)
   - [Phase 2 — Backend Restructure & AI Consolidation](#phase-2--backend-restructure--ai-consolidation)
   - [Phase 3 — Frontend Restructure](#phase-3--frontend-restructure)
   - [Phase 4 — AI Excellence](#phase-4--ai-excellence)
   - [Phase 5 — UX & Design System](#phase-5--ux--design-system)
   - [Phase 6 — Feature Additions](#phase-6--feature-additions)
   - [Phase 7 — Reliability, Testing, Observability](#phase-7--reliability-testing-observability)
   - [Phase 8 — DevEx, CI/CD, Deployment](#phase-8--devex-cicd-deployment)
   - [Phase 9 — Documentation](#phase-9--documentation)
   - [Phase 10 — Cutover & Sunset](#phase-10--cutover--sunset)
8. [Cross-Cutting Concerns](#cross-cutting-concerns)
9. [Risks & Mitigations](#risks--mitigations)
10. [Out of Scope](#out-of-scope)
11. [Handoff Notes for Executing Agent](#handoff-notes-for-executing-agent)

---

## TL;DR

Rebuild QuotePro into a best-in-class field-service SaaS with:

- **Canonical `work_items` data model** (drop parallel `quotes/leads/jobs` tables).
- **Single multi-agent AI service** (Google ADK + hybrid RAG, drop legacy Groq).
- **Strictly-typed feature-based Next.js 16 frontend** using Server Components + Server Actions.
- **Streaming AI chat** via Vercel AI SDK.
- **Postgres-backed agent sessions** (drop InMemory).
- **Hardened observability + CI stack** (Sentry + PostHog + OpenTelemetry).
- **Modern tooling**: pnpm, uv, biome, ruff, lefthook, just.

Executed in **10 phases** with verifiable checkpoints. No downtime constraint (no prod users), but every phase is independently verifiable.

---

## Recommendation Rationale

**Why refactor, not rewrite:**

- Domain model is proven; RAG + RLS + PDF + tax + e-sig integrations already work.
- Rewrites lose institutional knowledge encoded in 30+ migrations and prompt engineering.
- Preserves working Google ADK integration, Supabase RLS, `@react-pdf/renderer`, SignNow, Resend, LemonSqueezy, Sentry.

**Why aggressive within the refactor:**

- No prod users = free to wipe legacy migrations, drop parallel schemas, delete legacy code paths, enable `strict: true`.
- User-stated priority: best-in-class across AI, UX, reliability, DX, cost, and features.
- User-stated openness to full stack change.

**Why now, not incrementally:**

- Schema drift (dual data model) is compounding tech debt.
- `@ts-nocheck` pollution blocks safe refactors.
- Monster components (1,366-line `quotes/new/page.tsx`) block feature velocity.

---

## Current State Findings

### What works
- Domain model: `companies → customers → work_items → quote_items → invoices → payments`.
- pgvector RAG with 768-dim Gemini embeddings, HNSW index, `match_documents` RPC.
- Google ADK 1.20 with `QuoteBuilderAgent`, structured output schema, tool calling.
- Multi-tenancy via `company_id` + RLS.
- React Email + Resend for transactional email.
- `@react-pdf/renderer` for quote PDF generation.
- SignNow / Dropbox Sign for e-sig.
- Sentry client + server config.

### Debt to eliminate

1. **Dual data model**: `work_items` unified table (mig 20251205) coexists with legacy `quotes/leads/jobs`. Code uses both inconsistently.
2. **Migration chaos**: 30+ migrations with emergency patches (`EMERGENCY_DISABLE_RLS.sql`, `TEMP_BYPASS_RLS.sql`, `ADD_YOURSELF_AS_OWNER.sql`, v1/v2 fixes).
3. **`@ts-nocheck` pollution** in `src/app/(dashboard)/quotes/new/page.tsx`, `src/app/(dashboard)/leads-and-quotes/quotes/page.tsx`, `src/hooks/useQuotesQueue.ts`, and more.
4. **Monster page**: [src/app/(dashboard)/quotes/new/page.tsx](src/app/(dashboard)/quotes/new/page.tsx) = 1,366 lines mixing lead loading, customer creation, quote saving, AI calls, tax recalc, mobile sticky UI.
5. **Two AI generation stacks** hit the same endpoint: legacy `QuoteGeneratorService` (Groq/Gemini) and new `AdkQuoteService`. Only ADK is actually used but old code lingers.
6. **Component sprawl** in `src/components/`: `dashboard-nav.tsx` vs `dashboard-navigation.tsx`, `work-calendar.tsx` vs `work-calendar-simple.tsx`, `home-dashboard.tsx` + `dashboard-quotes.tsx` + `leads-and-quotes.tsx` (dead code).
7. **Hardcoded `http://localhost:8001`** in `src/app/(dashboard)/quotes/new/page.tsx` for tax API call.
8. **In-memory ADK sessions** — dropped on server restart.
9. **Root clutter**: `ADK_INTEGRATION_COMPLETE.md`, `CODE_REVIEW_2025-12-07.md`, `THEME_MANAGEMENT_GUIDE.md`, `ROLES_AND_PERMISSIONS.md` should live in `docs/`.
10. **3 separate indexer scripts** (`catalog_indexer.py`, `quote_indexer.py`, `auto_indexer.py`) with overlapping logic + a polling worker that can't scale.
11. **npm + `requirements.txt` + venv** — slow install loops.
12. **Workspace-root `options/` and `stock_app/`** — unrelated projects. **Never touched by this plan.**

---

## Target Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Next.js 16 App Router (Vercel)                            │
│  - Server Components + Server Actions                      │
│  - Streaming AI chat via Vercel AI SDK                     │
│  - Strict TypeScript, feature-based structure              │
│  - PostHog + Sentry client                                 │
└────────────────┬─────────────────────────┬─────────────────┘
                 │                         │
                 │ Server Actions          │ SSE stream
                 │ (direct Supabase)       │ /api/ai/chat
                 ▼                         ▼
      ┌──────────────────────┐   ┌──────────────────────────┐
      │ Supabase Postgres    │   │ FastAPI (Railway/Fly)    │
      │ + Auth + Storage     │◄──┤ - ADK multi-agent router │
      │ + pgvector + RLS     │   │ - Hybrid RAG (BM25+vec)  │
      │ + Realtime           │   │ - Postgres ADK sessions  │
      └──────────┬───────────┘   │ - Background indexer     │
                 │               │ - OTel traces            │
                 │ Triggers /    └──────────┬───────────────┘
                 │ Webhook                  │
                 ▼                          │
      ┌──────────────────────┐              │
      │ Indexer Worker       │◄─────────────┘
      │ (arq)                │
      └──────────────────────┘

External: Resend | Twilio | Stripe Connect | Dropbox Sign |
          LemonSqueezy | PostHog | Sentry | OpenTelemetry
```

---

## Tech Stack Decisions

| Layer            | Choice                                             | Why                                            |
| ---------------- | -------------------------------------------------- | ---------------------------------------------- |
| Frontend         | Next.js 16 App Router + React 19 + TS strict       | Best DX for SSR/streaming/actions              |
| UI               | Tailwind CSS 4 + shadcn/ui + Radix                 | Already installed, best-in-class primitives    |
| Forms            | React Hook Form + Zod                              | Already installed                              |
| Client state     | Zustand + TanStack Query                           | UI state / server cache                        |
| AI client        | Vercel AI SDK v5                                   | Streaming UI, tool calling                     |
| Server framework | Next.js Server Actions for CRUD + FastAPI for AI   | Best of both worlds                            |
| AI backend       | Google ADK 1.20 + Gemini 2.0 Flash/Pro             | Already integrated, multi-agent ready          |
| Vector search    | pgvector (hybrid: BM25 tsvector + HNSW cosine)     | Single DB, no separate vector store            |
| Session storage  | Postgres via new `adk_sessions_v2` table           | Durable across restarts                        |
| Database         | Supabase Postgres 15+                              | Auth + Storage + RLS + pgvector all-in-one     |
| Auth             | Supabase Auth (email + Google + magic link)        | Already integrated                             |
| Email            | Resend + React Email                               | Already integrated                             |
| SMS/Voice        | Twilio (SMS follow-ups + missed-call-to-lead)      | Already installed                              |
| E-sig            | Dropbox Sign (drop `hellosign-sdk`)                | Simpler, modern API                            |
| Subscription $   | LemonSqueezy MoR                                   | Already integrated                             |
| Customer $       | Stripe Connect Express (NEW)                       | Contractor gets paid via QuotePro              |
| PDF              | @react-pdf/renderer                                | Already works                                  |
| Observability    | Sentry + PostHog + OpenTelemetry → Honeycomb       | Errors + product + traces                      |
| Package manager  | pnpm (frontend) + uv (Python)                      | 5–10× faster                                   |
| Formatter/lint   | biome (TS/JS) + ruff (Python)                      | 10–100× faster                                 |
| Testing          | Vitest + Playwright + pytest                       | Fast, modern                                   |
| CI               | GitHub Actions with Turborepo remote cache         | Cached builds                                  |
| Frontend deploy  | Vercel                                             | Best Next.js integration                       |
| Backend deploy   | Railway or Fly.io                                  | Simple Python deploys                          |
| Local dev        | docker-compose + `just` command runner             | Consistent DX                                  |

---

## Success Criteria

- Zero `@ts-nocheck` and zero `any` in `src/`.
- `tsc --noEmit` clean; `biome check` clean; `ruff check` clean.
- `pnpm dev` starts in <5s cold, HMR in <500ms.
- `pytest` under 30s for full unit + integration suite.
- Playwright E2E covers: login → onboarding → create lead → generate quote → send → public accept → schedule → complete → invoice → mark paid.
- Lighthouse mobile score ≥95 on dashboard, quote editor, public quote page.
- p95 quote generation latency <4s including RAG + tool calls.
- 100% RLS-covered tables (verified by `scripts/verify-rls.ts`).
- No hardcoded URLs, secrets, or company IDs anywhere in `src/` or `python-backend/src/`.
- All AI calls logged to `ai_conversations` with tokens + $ cost.
- Monthly LLM spend visible in `/analytics/ai` dashboard.
- Every component file in `src/features/*` ≤300 lines.

---

## Phase Dependencies

```
Phase 0 (Foundation)
   │
   ▼
Phase 1 (Data Model) ──────┐
   │                       │
   ├──▶ Phase 2 (Backend)  │
   │      │                │
   │      └──▶ Phase 4 (AI Excellence)
   │
   ├──▶ Phase 3 (Frontend) ─┐
   │      │                 │
   │      └──▶ Phase 5 (UX) ─┼──▶ Phase 6 (Features) ──▶ Phase 7 (Reliability) ──▶ Phase 8 (DevEx/CI) ──▶ Phase 9 (Docs) ──▶ Phase 10 (Cutover)

Parallel opportunities:
- Phase 2 ∥ Phase 3 (backend + frontend independent after data model)
- Phase 4 depends on Phase 2 but can overlap with late Phase 3
- Phase 5 depends on Phase 3
- Phase 6 depends on 2, 3, 5
- Phases 7, 8 can run alongside 6
```

---

## Phases

Notation: `phase X (depends: A, B)` — cannot start until A, B complete. `[parallel: Y, Z]` — safe to run alongside. Each phase ends with a **Verification** block.

---

### Phase 0 — Foundation & Cleanup

**Blocker for all phases.**

**Goal**: Get to a clean, tagged, snapshotted, buildable starting point.

**Steps**

1. Tag current state: `git tag pre-rebuild-YYYYMMDD && git push --tags`.
2. Create working branch `rebuild/main` from `main`.
3. Move root-level docs to `docs/archive/pre-rebuild/`:
   - `ADK_IMPLEMENTATION_PLAN.md`
   - `ADK_INTEGRATION_COMPLETE.md`
   - `CODE_REVIEW_2025-12-07.md`
   - `CLOUDFLARE_TUNNEL.md`
   - `ROLES_AND_PERMISSIONS.md`
   - `THEME_MANAGEMENT_GUIDE.md`
4. Create `docs/rebuild/` with placeholder files:
   - `README.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `AI.md`, `API.md`, `DEVELOPMENT.md`, `DEPLOYMENT.md`, `SECURITY.md`, `RUNBOOK.md`, `adr/0001-record-adrs.md`.
5. Delete unused: `test-ai-update.mjs`, `fieldgenie.png` (unused; keep `thefieldgenie.png` — active brand logo), `frontend.log`, `cloudflare.log`.
6. Move `product.csv` → `python-backend/seed/product.csv`.
7. Adopt pnpm: `corepack enable && pnpm import`, delete `package-lock.json`, commit `pnpm-lock.yaml`, add `packageManager` field to `package.json`.
8. Adopt uv in `python-backend`: `uv init && uv sync`; keep `requirements.txt` as export until Phase 2.
9. Add root tooling files: `.nvmrc` (Node 22 LTS), `.tool-versions` (asdf/mise), `.editorconfig`, `biome.json`, `lefthook.yml`, `justfile` with commands: `dev`, `test`, `migrate`, `seed`, `format`, `lint`, `typecheck`, `e2e`.
10. Enable strict TS in `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`. Record baseline error count for Phase 3.
11. Add `.github/workflows/ci.yml` skeleton (install / typecheck / lint / test).

**Files created**
- `docs/rebuild/**`
- `.nvmrc`, `.tool-versions`, `.editorconfig`, `biome.json`, `lefthook.yml`, `justfile`, `pnpm-lock.yaml`
- `.github/workflows/ci.yml`

**Files moved/deleted**
- Root `.md` files → `docs/archive/pre-rebuild/`
- `package-lock.json` (deleted)
- `test-ai-update.mjs`, `fieldgenie.png`, `frontend.log`, `cloudflare.log` (deleted)

**Verification**
- `pnpm install` completes without errors.
- `just typecheck` runs (baseline error count recorded).
- `just format` runs.
- Root directory `ls` shows ≤8 markdown files.
- CI skeleton runs on push to `rebuild/main`.

---

### Phase 1 — Canonical Data Model

**Depends: Phase 0.**

**Goal**: One schema. One truth. Wipe legacy migrations, ship a baseline.

**Steps**

1. Snapshot current schema: `supabase db dump --file supabase/migrations/legacy/final_snapshot.sql`.
2. Archive: `mv supabase/migrations/*.sql supabase/migrations/legacy/`.
3. Wipe DB: `supabase db reset`.
4. Write `supabase/migrations/00000000000000_baseline.sql`:

**Extensions**: `pgcrypto`, `pg_trgm`, `vector`.

**Enums**:
- `work_item_status`: lead, quote_draft, quote_sent, quote_viewed, quote_accepted, quote_rejected, quote_expired, job_scheduled, job_in_progress, job_completed, job_cancelled, archived.
- `user_role`: owner, office, sales, technician.
- `invoice_status`: draft, sent, partial, paid, overdue, cancelled.
- `payment_method`: cash, check, card, bank_transfer, stripe.

**Tables** (with FKs, CHECK constraints, generated columns, `updated_at` triggers):

- `companies` (id, name, slug UNIQUE, logo_url, phone, email, address, settings JSONB, plan, created_at, updated_at)
- `users` (id → auth.users, company_id, role user_role, profile JSONB, is_active, last_login_at, created_at)
- `customers` (id, company_id, name, email, phone, metadata, created_at, updated_at)
  - UNIQUE (company_id, phone) WHERE phone IS NOT NULL
  - UNIQUE (company_id, email) WHERE email IS NOT NULL
- `customer_addresses` (id, customer_id, label, address, city, state, zip, country, geocode JSONB, is_primary, created_at)
- **`work_items` — unified single table**:
  - id, company_id, customer_id, address_id → customer_addresses, assigned_to → users, created_by → users
  - status work_item_status, kind CHECK IN ('lead','quote','job')
  - source, urgency
  - quote_number, invoice_number, job_number, job_name, description, notes
  - subtotal, discount_amount, tax_rate, tax_amount, total
  - scheduled_start, scheduled_end
  - sent_at, viewed_at, accepted_at, rejected_at, completed_at, archived_at, archived_reason, expires_at
  - metadata JSONB, pdf_url, signed_document_url
  - created_at, updated_at
- `quote_items` (id, work_item_id, name, description, quantity, unit_price, total GENERATED, option_tier, is_upsell, is_discount, discount_target, sort_order, created_at)
- `quote_options` (id, work_item_id, tier, name, description, total, is_selected, sort_order, created_at)
- `invoices` (id, company_id, work_item_id, customer_id, invoice_number, subtotal, tax_amount, total, amount_paid, status, due_date, sent_at, paid_at, payment_method, payment_link_url, stripe_payment_intent_id, pdf_url, notes, created_at, updated_at)
- `payments` (id, invoice_id, amount, method payment_method, reference_number, notes, paid_at, recorded_by, created_at)
- `catalog_items` (id, company_id, name, description, category, subcategory, base_price, unit, is_active, tags TEXT[], typical_quantity, labor_hours, material_cost, job_type, metadata, created_at, updated_at)
- `document_embeddings` (id, company_id, entity_type, entity_id, content, embedding vector(768), metadata JSONB, tsv TSVECTOR GENERATED, created_at, updated_at)
- `activity_log` (append-only: id, company_id, user_id, entity_type, entity_id, action, description, changes JSONB, ip_address, user_agent, created_at)
- `ai_conversations` (id, company_id, user_id, entity_type, entity_id, agent_name, model, purpose, messages JSONB, tokens_input, tokens_output, cost_usd, latency_ms, metadata JSONB, created_at)
- `ai_prompts` (id, company_id, name, version, content, is_active, created_by, created_at)
- `adk_sessions_v2` (app_name, user_id, session_id, state JSONB, events JSONB, expires_at, created_at, updated_at; PK (app_name, user_id, session_id))
- `notification_prefs` (id, user_id UNIQUE, channels JSONB, quiet_hours JSONB, created_at, updated_at)
- `webhooks_inbound` (id, source, event_type, payload JSONB, signature, processed_at, status, created_at)

**Indexes**: HNSW on `document_embeddings.embedding`, GIN on `tsv`, B-tree on all FKs, composite indexes on `(company_id, status)` and `(company_id, created_at DESC)` for `work_items`, GIN on `catalog_items.tags`.

**Views**: `quote_details_view`, `job_schedule_view`, `customer_overview_view`, `analytics_daily_view`, `ai_cost_view`.

**RPC functions**: `match_documents` (hybrid: BM25 rank + cosine + RRF), `get_user_company_id`, `get_user_role`, `create_work_item_with_customer` (atomic).

**Triggers**:
- `updated_at` auto-update on all mutable tables.
- Postgres `NOTIFY 'work_item_indexed'` on `work_items` INSERT/UPDATE.
- Postgres `NOTIFY 'catalog_item_indexed'` on `catalog_items` INSERT/UPDATE.

**RLS**: policies for every table using SECURITY DEFINER helper `get_user_company_id()`.

5. Write `supabase/seed.sql`: 1 demo company, 3 users (owner/office/technician), 20 customers, 40 catalog items, 15 work_items across lifecycle, 5 invoices, 3 payments.
6. Add `just types` → `supabase gen types typescript --local > src/types/database.ts`.
7. Add `scripts/verify-rls.ts` — for every table, hit as unauthenticated + as other-company user, assert 0 rows.
8. Delete `supabase/SCHEMA.md` (regenerate as needed).

**Files created**
- `supabase/migrations/00000000000000_baseline.sql`
- `supabase/seed.sql`
- `scripts/verify-rls.ts`
- Move: all existing migrations → `supabase/migrations/legacy/`

**Verification**
- `supabase db reset` runs clean.
- `psql` table count matches expected.
- `supabase gen types` produces `src/types/database.ts` with all tables.
- `just verify-rls` reports 0 leaks.
- Seed populates dashboards with realistic data.

---

### Phase 2 — Backend Restructure & AI Consolidation

**Depends: Phase 1. Parallel: Phase 3.**

**Goal**: Clean Python backend, single AI service, Postgres-backed sessions, unified indexer.

**Steps**

1. Restructure `python-backend/`:

```
python-backend/
├── pyproject.toml            # uv-managed
├── uv.lock
├── src/quotepro/
│   ├── main.py               # FastAPI app factory
│   ├── api/
│   │   ├── deps.py           # Depends() providers
│   │   ├── health.py
│   │   ├── ai.py             # /api/ai/generate, /api/ai/update, /api/ai/chat (SSE)
│   │   ├── catalog.py
│   │   ├── indexing.py
│   │   ├── webhooks.py       # Stripe, Dropbox Sign, Twilio
│   │   └── admin.py
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── registry.py       # Loads agents from agents.yaml
│   │   ├── router.py         # Top-level orchestrator
│   │   ├── quote_builder.py
│   │   ├── quote_updater.py
│   │   ├── job_namer.py
│   │   ├── upsell_suggester.py
│   │   ├── quote_optimizer.py
│   │   ├── invoice_drafter.py
│   │   └── schedule_assistant.py
│   ├── tools/                # ADK tool functions
│   │   ├── rag.py
│   │   ├── tax.py
│   │   ├── discount.py
│   │   ├── customer.py
│   │   ├── quote.py
│   │   └── schedule.py
│   ├── services/
│   │   ├── ai_client.py      # Wrapped Gemini + cost tracking
│   │   ├── rag.py            # Hybrid vector + BM25
│   │   ├── indexer.py        # Unified indexer for catalog + work_items
│   │   ├── sessions.py       # PostgresSessionService
│   │   ├── quotes.py         # Business logic
│   │   ├── invoices.py
│   │   └── notifications.py
│   ├── db/
│   │   ├── client.py         # Supabase + asyncpg pool
│   │   ├── repositories/     # BaseRepository + per-entity
│   │   └── models.py         # Pydantic domain models
│   ├── core/
│   │   ├── config.py         # Pydantic Settings v2
│   │   ├── logging.py        # Structured JSON logs
│   │   ├── auth.py           # Supabase JWT verification
│   │   ├── errors.py
│   │   ├── rate_limit.py
│   │   └── observability.py  # OpenTelemetry setup
│   ├── workers/
│   │   ├── indexer_worker.py # arq worker listening to Postgres NOTIFY
│   │   └── scheduler.py      # Cron jobs
│   └── prompts/              # Versioned .md files
├── config/
│   └── agents.yaml           # Agent registry
├── tests/
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   └── contract/             # Schemathesis vs OpenAPI
├── seed/
│   └── product.csv
├── Dockerfile                # Multi-stage
└── Procfile                  # web + worker
```

2. **Delete legacy**:
   - `python-backend/quote_indexer.py`, `catalog_indexer.py`, `auto_indexer.py`
   - `python-backend/check_db.py`
   - `python-backend/services/ai/quote_generator.py` (legacy Groq/Gemini path)
   - Old `requirements.txt` (replaced by `pyproject.toml`)
3. Migrate `main.py` to app-factory pattern (`create_app()`), Pydantic Settings v2.
4. Implement `PostgresSessionService` (subclass ADK `BaseSessionService`) storing in `adk_sessions_v2` with TTL cleanup.
5. Replace `InMemorySessionService` usage.
6. JWT auth middleware — verify Supabase JWT, inject `user_id`, `company_id` into request context via `contextvars`. Drop the per-tool `set_company_id()` pattern; auth middleware sets a single ctx.
7. **Multi-agent registry**:
   - `config/agents.yaml` declares each agent's name/description/prompt-file/tools/model.
   - `agents/registry.py::AgentRegistry.get(name)` returns configured `LlmAgent`.
   - `agents/router.py::RouterAgent` inspects intent and delegates via ADK sub-agents.
8. **Rewrite RAG** `services/rag.py`:
   - BM25 via `ts_rank_cd(tsv, plainto_tsquery(...))`.
   - Cosine via `1 - (embedding <=> query_embedding)`.
   - Merge with Reciprocal Rank Fusion (`1 / (60 + rank)`).
   - Optional cross-encoder rerank on top-20 → top-5.
9. **Unified indexer** `services/indexer.py`:
   - Single `Indexer.index_entity(entity_type, entity_id, company_id)`.
   - `workers/indexer_worker.py` uses `arq` (Redis) consumed from Postgres NOTIFY bridge.
   - Delete + recreate to prevent stale embeddings.
   - `POST /api/index/backfill` admin endpoint.
10. `services/ai_client.py`: wraps Gemini calls, logs tokens + cost to `ai_conversations`, adds OpenTelemetry spans, retries on 429/500.
11. Rewrite `api/ai.py`:
    - `POST /api/ai/generate-quote` — via RouterAgent
    - `POST /api/ai/update-quote`
    - `POST /api/ai/chat` — SSE streaming
    - `POST /api/ai/optimize-quote`
    - `POST /api/ai/suggest-upsells`
    - `POST /api/ai/generate-job-name`
    - `POST /api/ai/draft-invoice`
12. `api/webhooks.py`: Stripe, Dropbox Sign, Twilio SMS, LemonSqueezy — verify signatures, upsert to `webhooks_inbound`, dispatch handlers.
13. Config via Pydantic Settings v2, env prefix `QP_`, fail loudly on missing.
14. Structured JSON logging with `request_id`, `user_id`, `company_id`.
15. OpenTelemetry: auto-instrument FastAPI, httpx, asyncpg → OTLP → Honeycomb.
16. Rate limiting per company (slowapi + Redis): 10 AI/min, 100 CRUD/min, 1 bulk/min.
17. Tests: unit per tool, integration per agent, contract via Schemathesis against generated OpenAPI.
18. `Dockerfile` multi-stage; `Procfile` with `web` and `worker` processes; `railway.json`/`fly.toml` updated.

**Verification**
- `uv sync` completes; `uv run pytest` passes.
- `uv run uvicorn quotepro.main:create_app --factory` starts.
- `GET /api/health` returns 200 with build info + DB check.
- Kill/restart server → agent session state preserved (verify via `adk_sessions_v2` row).
- Test webhook → row in `webhooks_inbound`, action processed.
- Trigger work_item update → LISTEN fires → indexer worker upserts embedding.
- Load test: 100 concurrent `/api/ai/generate-quote` — rate limit kicks in.

---

### Phase 3 — Frontend Restructure

**Depends: Phase 1. Parallel: Phase 2.**

**Goal**: Feature-based, strictly-typed Next.js app. Zero `@ts-nocheck`. Server Components + Server Actions.

**Steps**

1. **Delete cruft**:
   - `src/components/dashboard-nav.tsx` (keep `dashboard-navigation.tsx` → `components/layout/AppSidebar.tsx`)
   - `src/components/dashboard-quotes.tsx` (dead)
   - `src/components/leads-and-quotes.tsx` (dead)
   - `src/components/work-calendar.tsx` (keep `work-calendar-simple.tsx` → `components/calendar/CalendarView.tsx`)
   - `src/components/home-dashboard.tsx` (replace with server component)
   - `src/components/theme-example.tsx`, `hide-devtools.tsx`
   - `src/components/logo-options.tsx`, `field-genie-logo.tsx` (consolidate to `components/brand/Logo.tsx`)
   - `src/app/logo-backgrounds/`, `logo-test/`, `theme-test/`, `premium-logos/`
   - `src/app/dashboard/` (replace with `src/app/(app)/dashboard/`)
   - `src/app/settings/` (move under `(app)`)
   - `src/lib/dashboard-context.tsx` (replace with server components + TanStack Query)

2. **New target structure** — see [Appendix A](#appendix-a-target-frontend-structure) below.

3. **Split monster** `quotes/new/page.tsx`:
   - Move to `features/quotes/components/QuoteEditor/`.
   - Break into: `CustomerPanel`, `LineItemsTable`, `PricingSummary`, `AIChatPanel`, `OptionsBuilder`, `DiscountControls`. Each <250 lines.
   - Data fetching → `features/quotes/queries.ts` (server) + `useQuote(id)` (client).
   - Mutations → `features/quotes/actions.ts` (server actions with Zod).

4. Replace `dashboard-context.tsx`:
   - Server-fetched data via RSC + `queries.ts`.
   - Client cache via TanStack Query.
   - UI state (dialogs, filters) via Zustand stores in `features/*/hooks/`.

5. Delete every `@ts-nocheck`. Add missing types via `src/types/domain.ts`. Regen supabase types.
6. Env vars via `@t3-oss/env-nextjs` in `src/lib/env.ts`.
7. Remove hardcoded `http://localhost:8001` — call `env.BACKEND_URL` through `lib/ai/client.ts`.
8. Add `error.tsx`, `loading.tsx`, `not-found.tsx` to every route segment.
9. Add root-level `robots.txt`, `sitemap.ts`, `manifest.json` (PWA).
10. Server actions via `next-safe-action` v7 — typed inputs, Zod validation, RLS-safe.
11. Middleware:
    - Supabase session refresh
    - Protect `(app)/*` — redirect to `/login` if no session
    - Rate-limit public routes (`/q/*`, `/i/*`) via Upstash Ratelimit
12. Design tokens in `globals.css` (light + dark).
13. Add `framer-motion` for micro-interactions.
14. Add `cmdk` for ⌘K palette.

**Verification**
- `pnpm tsc --noEmit` returns 0 errors.
- `pnpm biome check .` returns 0 issues.
- `grep -r "@ts-nocheck" src/` returns 0 matches.
- `grep -r "localhost:8001\|localhost:8000" src/` returns 0 matches.
- `pnpm build` succeeds.
- Manual walkthrough: login → dashboard → pipeline → new quote → save → send → public view → accept → schedule → complete → invoice → paid.
- Lighthouse mobile: dashboard ≥95, quote editor ≥90, public quote ≥95.
- No file in `features/*` exceeds 300 lines.

---

### Phase 4 — AI Excellence

**Depends: Phase 2.**

**Goal**: Multi-agent system, streaming chat, hybrid RAG, cost visibility.

**Steps**

1. Populate `config/agents.yaml`:
   - Each agent: `name`, `description`, `prompt_file`, `model`, `temperature`, `output_schema`, `tools[]`.
   - Agents: `router`, `quote_builder`, `quote_updater`, `job_namer`, `upsell_suggester`, `quote_optimizer`, `invoice_drafter`, `schedule_assistant`.
2. Implement `agents/router.py` using ADK sub-agent feature. Classify intent → delegate.
3. Prompts under `src/quotepro/prompts/`, versioned (`quote_builder_v1.md`). Company-specific overrides via `ai_prompts` table.
4. Streaming `POST /api/ai/chat`:
   - Accepts `{ messages, session_id, entity_type, entity_id }`.
   - SSE events: `token`, `tool_call`, `tool_result`, `agent_switch`, `done`.
   - Frontend consumes via Vercel AI SDK `useChat({ api: '/api/ai/chat' })`.
5. Hybrid RAG in `services/rag.py` (BM25 + cosine + RRF; optional rerank).
6. Auto-indexing:
   - Supabase trigger on `work_items` INSERT/UPDATE → NOTIFY `work_item_indexed`.
   - `workers/indexer_worker.py` uses arq; `listener.py` bridges NOTIFY → arq queue.
7. `POST /api/admin/reindex` — bulk reindex.
8. AI cost tracking via `services/ai_client.py`; `ai_cost_view` aggregates daily $/company; frontend `/analytics/ai` page charts + top-spending features.
9. **Guardrails**:
   - Input: Zod at Next boundary + Pydantic at FastAPI boundary.
   - Output: Pydantic `output_schema` on every LlmAgent.
   - Content filter via Gemini safety settings.
   - Prompt injection protection: strip suspicious tokens, reject overrides.
10. Prompt playground at `/settings/prompts` — owner-only override.
11. **Tests**: golden-file snapshot tests, deterministic mock mode via `pytest-httpx`, cost budget assertions.
12. Docs: `docs/rebuild/AI.md`.

**Verification**
- `POST /api/ai/generate-quote` returns grounded results (only catalog items).
- Streaming chat renders tokens live.
- Backfill reindexes 100 items in <60s.
- `ai_conversations` populated with `cost_usd > 0` after every AI call.
- `/analytics/ai` shows daily cost chart + top-5 features.
- Golden-file tests pass across 20+ scenarios.
- Prompt override reflected in next AI call.

---

### Phase 5 — UX & Design System

**Depends: Phase 3.**

**Goal**: Feel like a delightful, modern SaaS. Mobile-first. Accessible.

**Steps**

1. Design tokens spec in `docs/rebuild/DESIGN.md`: colors, typography, spacing, radii, shadows, motion.
2. Implement tokens in `globals.css` (light + dark).
3. Update all shadcn/ui components to use tokens.
4. Empty states for every list view.
5. Skeleton loaders for every `loading.tsx`.
6. Error boundaries with recovery CTAs.
7. Toasts via sonner.
8. ⌘K command menu (`cmdk`).
9. **Public quote viewer polish**:
   - Hero: contractor logo + quote number.
   - Line items with inline photos.
   - Sticky pricing summary.
   - Optional trust indicators.
   - Full-page Dropbox Sign or in-app instant acceptance.
   - Post-acceptance: thank-you + ICS download + next-steps timeline.
10. Mobile bottom nav: 5 items (Pipeline, Calendar, +, Customers, More).
11. Floating action button on mobile with radial menu.
12. **Onboarding** (`/onboarding`):
    - Step 1: Company info + logo
    - Step 2: Catalog CSV import or default template
    - Step 3: Invite team
    - Step 4: Guided tour (react-joyride)
13. Dark mode (system preference + toggle).
14. A11y: semantic HTML, ARIA labels, visible focus, keyboard nav, reduced-motion respected, contrast ≥4.5:1, VoiceOver tested.
15. PWA: `manifest.json`, `next-pwa` service worker for offline quote viewing, Add-to-Home-Screen prompt.
16. Storybook 8 for `components/ui/*`, `components/shared/*`, key `features/*` components with a11y + interactions addons.

**Verification**
- Manual mobile pass on iOS Safari + Android Chrome.
- Lighthouse a11y ≥95 on every route.
- Storybook builds; 40+ stories.
- ⌘K menu finds any customer/route in <2 keystrokes.

---

### Phase 6 — Feature Additions

**Depends: Phases 2, 3, 5.**

**Goal**: Best-in-class feature parity with QuickBooks/Housecall Pro/Jobber.

**Steps**

1. **Stripe Connect Express** — customer pays contractor via QuotePro:
   - `stripe_accounts` table.
   - Onboarding at `/settings/billing/payments`.
   - "Pay Now" on invoices → hosted checkout → webhook.
   - Deposit support: 30/50/100% on quote acceptance.
2. **Automated SMS follow-ups** (Twilio):
   - Scheduled at +24h, +72h, +7d after quote sent if not accepted.
   - Preferences per company.
   - Inbound SMS → parses as reply, logs to `activity_log`.
3. **Missed-call-to-lead** (Twilio Voice):
   - QuotePro phone number per company.
   - Missed call → auto-SMS asking for address + job details.
   - Reply → new lead via webhook.
4. **QuickBooks Online sync** (Intuit API):
   - OAuth at `/settings/integrations/quickbooks`.
   - Invoice create → mirror to QBO.
   - Payment → mirror to QBO.
5. **Google Business Profile review requests** after job completion.
6. **Route optimization** (Mapbox Optimization API).
7. **Team chat per work item** (`work_item_comments` + Supabase Realtime).
8. **Voice-to-quote** (Gemini audio input).
9. **Photo AI captions** (Gemini vision).
10. **Reporting dashboards** at `/analytics/{sales,team,ai}`.
11. **Customer portal** at `/portal/[token]`.

**Verification**
- Stripe test-mode payment E2E.
- Twilio test-mode SMS sent + received.
- QBO sandbox invoice sync.
- Playwright covers new flows.

---

### Phase 7 — Reliability, Testing, Observability

**Depends: Phase 3, ideally after Phase 4.**

**Goal**: Prod-ready confidence. No silent failures. Fast to diagnose.

**Steps**

1. **Testing pyramid**:
   - Unit (Vitest + pytest)
   - Component (Vitest + Testing Library)
   - Integration (pytest)
   - E2E (Playwright, 15 critical journeys)
   - Contract (Schemathesis vs OpenAPI)
   - Load (k6: 100 concurrent AI, 1000 concurrent CRUD)
2. **Observability**:
   - Sentry: errors, releases tied to git SHA, source maps, performance.
   - PostHog: page views, funnels, feature flags, session replay, A/B.
   - OpenTelemetry backend traces → Honeycomb.
   - Correlation IDs in all logs.
3. **Health & readiness**:
   - `GET /api/health` — liveness
   - `GET /api/ready` — readiness (DB, Gemini, Redis)
   - `GET /api/metrics` — Prometheus/OTel
4. Alerting: Sentry on error rate spikes, PostHog on drop in daily quote creation, uptime via Better Uptime/checkly.
5. **Security hardening**:
   - CSP + HSTS + X-Frame-Options + X-Content-Type-Options headers via `next.config.ts`.
   - CORS locked to specific origins.
   - RLS verified per-table.
   - Secret rotation runbook (every 90 days).
   - Vulnerability scanning: `pnpm audit` + `uv pip audit` + Snyk in CI.
   - JWT verification on all backend endpoints; 1h tokens with refresh.
   - Zod + Pydantic input sanitization.
   - Rate limiting per user + per company.
   - Anti-CSRF via SameSite=Lax + double-submit tokens.
   - Public token URLs: random 128-bit tokens, not sequential UUIDs.
6. Backup + restore: Supabase pgbackrest; monthly restore drill.
7. Feature flags via PostHog.
8. Runbook at `docs/rebuild/RUNBOOK.md` for common incidents.

**Verification**
- Coverage ≥75% frontend + backend.
- Playwright <5min in CI.
- Sentry receives test error; PostHog receives test event.
- k6: p95 <500ms CRUD, p95 <4s AI.
- `scripts/verify-rls.ts` reports 0 issues.
- CSP report-only period → 0 violations → enforce.

---

### Phase 8 — DevEx, CI/CD, Deployment

**Depends: Phase 0, ideally after Phase 7.**

**Goal**: Fast local loop, reliable deploys, one-command onboarding.

**Steps**

1. **Local dev**: `just dev` starts everything (`supabase start`, `pnpm dev`, `uvicorn`, `arq worker`, optional Storybook).
2. `docker-compose.yml`: local Supabase, Redis, MailHog, otel-collector.
3. **CI** (`.github/workflows/ci.yml`) parallelized:
   - install (cached) / typecheck / lint / test-frontend / test-backend / build / e2e / contract-tests
   - Runs on PR + push to main.
   - Turborepo remote caching.
4. **CD**:
   - Vercel auto-deploy from `main` + preview per PR.
   - Railway auto-deploy + PR previews.
   - DB migrations manual-approval via GitHub Environment; `supabase db push` on tag.
   - Blue-green for backend.
5. Migration process: every schema change = new file `supabase/migrations/YYYYMMDDHHMMSS_description.sql`; CI validates syntax + idempotency; rollback runbook.
6. Env management: `.env.example` documents every var; Vercel + Railway synced from 1Password via `op run`; `pnpm env:pull` fetches remote env for local dev.
7. Preview environments per PR using Supabase branching.
8. Semantic PR titles (conventional commits) + changesets for versioning + auto-generated release notes.
9. Local scripts: `just seed`, `just migrate`, `just types`, `just reindex`, `just clean`.

**Verification**
- Fresh clone → `just install && just dev` starts full stack in <2min.
- CI pipeline runs in <8min end-to-end.
- Preview URL live on PR within 2min.
- Migration rollback drill successful.

---

### Phase 9 — Documentation

**Depends: Phases 1–8 substantially complete.**

**Goal**: Anyone can onboard in <1 hour.

**Steps**

1. `docs/rebuild/README.md` — index + architecture diagram.
2. `ARCHITECTURE.md` — system diagram, component responsibilities, data flow.
3. `DATA_MODEL.md` — ERD (Mermaid), table docs, RLS matrix.
4. `AI.md` — agents catalog, prompt registry, RAG architecture, cost accounting, "how to add a new agent".
5. `API.md` — endpoint + server action catalog (auto-generated from OpenAPI + Zod).
6. `DEVELOPMENT.md` — prerequisites (Node 22, Python 3.12, pnpm, uv, docker), setup, common tasks.
7. `DEPLOYMENT.md` — Vercel + Railway + Supabase setup, env vars, migration, rollback.
8. `SECURITY.md` — auth flow, RLS overview, secret management, threat model, incident response.
9. `RUNBOOK.md` — common incidents + step-by-step fixes.
10. `docs/rebuild/adr/*` — ADRs (in-place refactor, ADK choice, hybrid RAG, work_items unified schema, etc.).
11. `CONTRIBUTING.md` at root.
12. In-code docstrings: `pdoc` (backend) + TSDoc (frontend).
13. Storybook remains UI docs.

**Verification**
- New engineer walks through `DEVELOPMENT.md` end-to-end without hitting undocumented issue.
- Every ADR dated + numbered + has status.

---

### Phase 10 — Cutover & Sunset

**Depends: Phases 1–9.**

**Goal**: Retire old code, make new stack the only path.

**Steps**

1. `git rm -r supabase/migrations/legacy/` after 30 days stability (or archive branch).
2. Remove any `src/app/api/*` legacy routes not migrated to server actions.
3. `pnpm depcheck` → delete unused JS deps.
4. `uv pip check` + import audit → delete unused Python deps.
5. Remove `hellosign-sdk` (consolidated on `@dropbox/sign`).
6. Remove any remaining `@ts-nocheck`, `any`, unresolved `TODO`.
7. Branch protection on `main`: require PR + CI green + 1 approval + no direct push.
8. Update root `README.md` for new architecture + link to `docs/rebuild/`.
9. Delete `docs/archive/pre-rebuild/` (or archive as historical).
10. Tag `v2.0.0`; write launch changelog.

**Verification**
- `pnpm depcheck` = 0 unused deps.
- `git log --oneline main` shows only rebuild commits.
- Root README describes v2.0 as canonical.
- All success criteria (top of doc) met.

---

## Cross-Cutting Concerns

### Coding Standards
- **TypeScript**: strict, no `any`, no `@ts-nocheck`, prefer `unknown` + narrow.
- **Python**: type hints everywhere, `mypy --strict` in CI (ratchet up).
- **File size**: components ≤300 lines, functions ≤50 lines, files ≤500 lines.
- **Naming**: kebab-case files, PascalCase components, camelCase functions, UPPER_SNAKE constants.
- **Imports**: absolute (`@/features/quotes/...`), no relative parent paths.
- **Comments**: only for non-obvious constraints. No restating code.

### Security Baseline
- All secrets in env, never in code.
- Service role Supabase client only in server code (enforced by import path).
- RLS on every table; verified in CI.
- CSP + HSTS + secure cookies.
- Webhook signature verification on every inbound.
- Rate limiting per user + per company.

### Performance Baseline
- RSC by default; `use client` audited in review.
- Streaming for AI + long-running.
- DB: indexes on every FK + common filter; `EXPLAIN ANALYZE` in migration reviews.
- Backend: async everywhere (asyncpg, httpx.AsyncClient); connection pooling.
- Caching: TanStack Query on frontend; Redis for RAG embeddings + agent config.
- Images: Next `<Image>`; Supabase Storage → Vercel image CDN.

### Cost Baseline
- Track LLM cost per feature/company in `ai_conversations`.
- Alerts at 80% of monthly budget per company.
- Prefer Gemini Flash for most calls; Gemini Pro only for complex reasoning.
- Cache embeddings by content hash.
- Rate-limit AI calls per user.

### AI Ethics & Trust
- All AI-generated content clearly labeled ("AI-generated draft").
- User can always edit before sending.
- No auto-send without human review.
- Training data policy: opt-in for fine-tuning on customer data.

---

## Risks & Mitigations

| Risk                                          | Mitigation                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Migration script errors, wipe wrong data      | Snapshot to backup + `pre-rebuild` git tag; work on `rebuild/main` branch                         |
| ADK API breaks between versions               | Pin `google-adk==1.20.0`; test upgrades in isolated PR                                             |
| Gemini output schema violations at runtime    | Strict Pydantic `output_schema` + validation; fallback to markdown JSON extract                    |
| RLS accidentally opens data across companies  | `scripts/verify-rls.ts` in CI + integration tests with two seeded companies                       |
| Stripe Connect regulatory complexity          | Use Stripe Express (Stripe handles KYC); US-only initially                                        |
| Scope creep during rebuild                    | Phases gated; each must pass verification before next starts                                      |
| Vendor lock-in (Vercel/Railway/Supabase)      | All Dockerized locally; Supabase self-hostable                                                    |
| Legacy Groq path silently used somewhere      | `grep -r "groq" src/ python-backend/src/` = 0 in Phase 2                                            |
| Cost blow-up during AI-heavy testing          | Scoped GCP budget on `GEMINI_API_KEY`; dev env uses Flash exclusively                              |

---

## Out of Scope

Deferred to v3:

- Native mobile apps (React Native / Expo) — PWA covers v2.
- Multi-language (i18n) — English-only for v2.
- Multi-currency — USD only.
- Whitelabel domains.
- Marketplace / plugin system.
- International tax (VAT, GST).
- Complex crew management / dispatch.
- AI fine-tuning on customer data.

---

## Handoff Notes for Executing Agent

- **Never** touch `options/` or `stock_app/` directories in the workspace root — unrelated projects.
- **Never** apply migrations to a database with paying users without owner approval (per Phase 1 assumption: no prod users; if that changes, halt).
- **Never** delete `.env.local` or committed secrets.
- **Always** run `just typecheck && just test` before opening a PR.
- **Always** update `docs/rebuild/adr/` when making a non-obvious decision.
- **Always** work on branches (`feat/phase-N-description`) → PRs to `rebuild/main`.
- **When stuck**: file a clarifying question in the PR description tagged `@dipenvekaria`.

---

## Appendix A — Target Frontend Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Marketing landing (public)
│   ├── globals.css
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (app)/                          # Authenticated shell
│   │   ├── layout.tsx                  # AppShell
│   │   ├── dashboard/page.tsx
│   │   ├── pipeline/
│   │   │   ├── page.tsx                # Unified board
│   │   │   └── [id]/page.tsx           # Work item detail
│   │   ├── quotes/
│   │   │   ├── new/page.tsx            # Thin orchestrator
│   │   │   ├── [id]/page.tsx
│   │   │   └── loading.tsx, error.tsx, not-found.tsx
│   │   ├── jobs/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── customers/
│   │   ├── calendar/page.tsx
│   │   ├── catalog/page.tsx
│   │   ├── analytics/
│   │   │   ├── page.tsx
│   │   │   ├── sales/page.tsx
│   │   │   ├── ai/page.tsx
│   │   │   └── team/page.tsx
│   │   └── settings/
│   │       ├── company/page.tsx
│   │       ├── team/page.tsx
│   │       ├── billing/page.tsx
│   │       ├── integrations/page.tsx
│   │       └── prompts/page.tsx        # AI prompt customization
│   ├── q/[token]/page.tsx              # Public quote viewer
│   ├── i/[token]/page.tsx              # Public invoice viewer
│   └── api/
│       ├── ai/chat/route.ts            # SSE proxy to FastAPI
│       ├── webhooks/
│       └── health/route.ts
├── features/
│   ├── work-items/
│   ├── quotes/
│   │   └── components/QuoteEditor/{index,CustomerPanel,LineItemsTable,PricingSummary,AIChatPanel,OptionsBuilder,DiscountControls}.tsx
│   ├── leads/
│   ├── jobs/
│   ├── invoices/
│   ├── payments/
│   ├── customers/
│   ├── catalog/
│   ├── ai/
│   ├── auth/
│   ├── company/
│   ├── team/
│   ├── analytics/
│   └── notifications/
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── layout/                         # AppShell, Sidebar, Header, MobileNav, CommandMenu
│   ├── brand/                          # Logo, ThemeToggle
│   └── shared/                         # QueueCard, EmptyState, StatusBadge, DataTable, DateRangePicker, AddressAutocomplete
├── lib/
│   ├── supabase/{server,browser,admin,middleware}.ts
│   ├── ai/client.ts
│   ├── env.ts
│   ├── logger.ts, analytics.ts, constants.ts, utils.ts
├── hooks/
├── types/
│   ├── database.ts                     # Generated
│   ├── domain.ts                       # Branded types + DTOs
│   └── api.ts                          # FastAPI response zod schemas
├── styles/globals.css
└── middleware.ts                       # Supabase session + guards
```

---

## Appendix B — Deliverables Checklist

An executing agent, given this plan, will produce:

- [ ] A rebuilt repo on `rebuild/main` branch meeting every verification checkpoint.
- [ ] `docs/rebuild/**` documentation.
- [ ] `v2.0.0` tag.
- [ ] Green CI on all workflows.
- [ ] Deployed Vercel + Railway environments.
- [ ] Populated seed data for QA walkthroughs.
