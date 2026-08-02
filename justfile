# QuotePro command runner. Install just: https://github.com/casey/just
# Run `just` to see all commands.

set dotenv-load := true
set shell := ["bash", "-uc"]

default:
    @just --list --unsorted

# ---- Install / setup ------------------------------------------------------

install:
    corepack enable
    pnpm install --frozen-lockfile
    cd python-backend && uv sync

install-hooks:
    lefthook install

# ---- Local dev ------------------------------------------------------------

# Start everything (Supabase local, Next.js, FastAPI, indexer worker)
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    supabase start > /dev/null 2>&1 || true
    pnpm dev &
    (cd python-backend && uv run uvicorn quotepro.main:create_app --factory --reload --port 8000) &
    (cd python-backend && uv run arq quotepro.workers.indexer_worker.WorkerSettings) &
    wait

# Frontend only
dev-web:
    pnpm dev

# Backend only
dev-api:
    cd python-backend && uv run uvicorn quotepro.main:create_app --factory --reload --port 8000

# Indexer worker only
dev-worker:
    cd python-backend && uv run arq quotepro.workers.indexer_worker.WorkerSettings

# ---- Database -------------------------------------------------------------

migrate:
    supabase db push

reset:
    supabase db reset

seed:
    psql "$SUPABASE_DB_URL" -f supabase/seed.sql

types:
    supabase gen types typescript --local > src/types/database.ts

verify-rls:
    pnpm tsx scripts/verify-rls.ts

reindex:
    curl -X POST http://localhost:8000/api/admin/reindex \
        -H "Authorization: Bearer $QP_ADMIN_TOKEN"

# ---- Quality gates --------------------------------------------------------

typecheck:
    pnpm tsc --noEmit

lint:
    pnpm biome check .
    cd python-backend && uv run ruff check .

format:
    pnpm biome format --write .
    cd python-backend && uv run ruff format .

test:
    pnpm vitest run
    cd python-backend && uv run pytest

test-watch:
    pnpm vitest

e2e:
    pnpm playwright test

# ---- Build / deploy -------------------------------------------------------

build:
    pnpm build

storybook:
    pnpm storybook

# ---- Utilities ------------------------------------------------------------

clean:
    rm -rf .next node_modules python-backend/.venv coverage playwright-report test-results

env-example:
    cp .env.example .env.local
