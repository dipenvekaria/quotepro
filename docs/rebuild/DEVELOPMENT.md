# Development Guide

> **Populated in Phase 8.** Placeholder for Phase 0.

## Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **Python 3.12** (see `.tool-versions`)
- **pnpm 9** (`corepack enable`)
- **uv 0.5+** (`brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Docker Desktop** (for Supabase local + Redis)
- **Supabase CLI** (`brew install supabase/tap/supabase`)
- **just** (`brew install just`)

## First-Time Setup

```bash
git clone https://github.com/dipenvekaria/quotepro
cd quotepro
just install
cp .env.example .env.local
# Fill in .env.local values
just install-hooks
supabase start
just migrate
just seed
just types
```

## Common Commands

Run `just` for a full list. Highlights:

- `just dev` — start Next.js + FastAPI + indexer worker + Supabase.
- `just dev-web` / `just dev-api` / `just dev-worker` — individual services.
- `just typecheck` — TypeScript check.
- `just lint` — biome + ruff.
- `just format` — auto-format.
- `just test` — vitest + pytest.
- `just e2e` — Playwright.
- `just migrate` — apply pending Supabase migrations.
- `just types` — regenerate `src/types/database.ts`.
- `just reindex` — trigger backfill of embeddings.
- `just clean` — nuke node_modules, .venv, .next.

## Adding a Feature

1. Design the schema change (if any) → new migration in `supabase/migrations/`.
2. Regenerate types: `just types`.
3. Write server action in `src/features/<feature>/actions.ts` with Zod input.
4. Write query in `src/features/<feature>/queries.ts` for RSC.
5. Build UI in `src/features/<feature>/components/`.
6. Add unit tests + Playwright happy path.
7. Update Storybook if UI-facing.
8. Open PR to `rebuild/main`.

## Troubleshooting

See [RUNBOOK.md](RUNBOOK.md).
