# Rivet command runner. Install just: https://github.com/casey/just
# Run `just` to see all commands.
#
# These are the commands that actually work. The previous version drove a
# python-backend/ that was deleted (ADR 0009) with pnpm, biome, uv and ruff —
# none of which are installed — so every recipe in it failed.

set dotenv-load := true
set shell := ["bash", "-uc"]

default:
    @just --list --unsorted

# ---- Install / setup ------------------------------------------------------

install:
    npm install

# ---- Local dev ------------------------------------------------------------

# Everything. One process runs the whole product — there is no second service.
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    supabase start > /dev/null 2>&1 || true
    npm run dev

# ---- Database -------------------------------------------------------------

migrate:
    supabase db push

reset:
    supabase db reset

types:
    npm run db:types

psql:
    npm run db:psql

verify-rls:
    npm run verify:rls

# Fill a company with believable data. Pass the account's login email.
seed-demo email:
    npx tsx scripts/seed-demo-data.ts --email {{email}}

# Draft quotes across several trades and print what came back.
eval-ai:
    npx tsx scripts/eval-quote-ai.ts

# ---- Quality gates --------------------------------------------------------

# What CI runs, in the order CI runs it.
check: typecheck lint test build

typecheck:
    npm run typecheck

lint:
    npm run lint

test:
    npm run test

test-watch:
    npm run test:watch

build:
    npm run build

# ---- Utilities ------------------------------------------------------------

clean:
    rm -rf .next node_modules coverage

env-example:
    cp .env.example .env.local
