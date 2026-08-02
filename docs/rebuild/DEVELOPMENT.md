# Development Guide

> Verification playbook for the rebuilt `rebuild/main` branch. Everything below assumes you are on that branch.

## Prerequisites

Install once (macOS via Homebrew):

```bash
brew install just uv supabase/tap/supabase lefthook   # dev tooling
corepack enable                                       # pnpm 9
```

Node 22 LTS, Python 3.12, Docker Desktop running.

## First-Time Setup

```bash
git switch rebuild/main
git tag                                # confirm pre-rebuild-2026-08-02
pnpm install                           # from repo root
```

### Database (Phase 1)

```bash
supabase start                         # boots local Postgres + Auth on :54321
supabase db reset                      # applies 00000000000000_baseline.sql + seed.sql

# Regenerate typed Supabase client
supabase gen types typescript --local > src/types/database.types.ts
```

Verify:
- 17 tables under `public`: `psql "$SUPABASE_DB_URL" -c '\dt public.*'`
- Seed data present: `psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM public.work_items;"` → 15
- Login credentials for the demo company:
  - `owner@acme.demo`  / `demo1234`
  - `office@acme.demo` / `demo1234`
  - `tech@acme.demo`   / `demo1234`

### Backend (Phase 2)

```bash
cd python-backend

# rename net-new configs to canonical names once you're ready to cut over
mv .env.example.new .env.example        # optional (keeps legacy for now)
mv Procfile.new     Procfile             # optional
mv Dockerfile.new   Dockerfile           # optional

cp .env.example .env
# Fill in from the Supabase dashboard:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, SUPABASE_DB_URL,
#   GEMINI_API_KEY

uv sync                                  # installs deps, writes uv.lock
uv run pytest tests/unit -v              # 8-10 unit tests should pass

uv run uvicorn quotepro.main:create_app --factory --reload --port 8000
curl http://localhost:8000/api/health    # {"status":"ok",...}
curl http://localhost:8000/api/ready     # {"status":"ok","checks":{"supabase":"ok"}}
open http://localhost:8000/docs          # Swagger UI
```

Optional — indexer worker (needs Redis):

```bash
docker run -d -p 6379:6379 redis:7-alpine
uv run arq quotepro.workers.indexer_worker.WorkerSettings
```

### Frontend (Phase 3 opener)

```bash
# from repo root
cp .env.example .env.local   # if you have one; otherwise create with:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
#   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
#   SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
#   NEXT_PUBLIC_APP_URL=http://localhost:3000

pnpm dev                     # http://localhost:3000
```

### Verify RLS

```bash
pnpm tsx scripts/verify-rls.ts
```

Anon reads should return 0 rows for every table.

## Common Commands

Run `just` for a full menu. Highlights:

- `just dev` — start Supabase local, Next.js, FastAPI, indexer worker in one shell (once all tools are installed).
- `just typecheck` — TypeScript check.
- `just lint` — biome + ruff.
- `just test` — Vitest + pytest.
- `just types` — regenerate `src/types/database.types.ts`.
- `just verify-rls` — anon read smoke test.
- `just reindex` — trigger backfill of embeddings.
- `just clean` — nuke node_modules, .venv, .next.

## Adding a Feature

1. Design the schema change → new migration file `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
2. Apply + regenerate types: `just migrate && just types`.
3. Write server action(s) in `src/features/<feature>/actions.ts` with Zod input.
4. Write query fetchers in `src/features/<feature>/queries.ts` for RSC.
5. Build UI in `src/features/<feature>/components/`. Keep files ≤300 lines.
6. If new agent tooling needed, add tool in `python-backend/src/quotepro/tools/` + register in `agents/registry.py::_default_tool_registry()`, then add agent entry to `config/agents.yaml`.
7. Add unit tests + a Playwright happy path (Phase 7).
8. Open PR to `rebuild/main`.

## Troubleshooting

- **`supabase db reset` fails on `auth.users` insert** — Supabase's `auth.users` schema drifts between versions; may need to add columns to `seed.sql`. See error output; add columns with sensible defaults.
- **`uv sync` fails on `google-adk`** — ADK requires Python 3.11+; check `python3 --version`. If <3.12, `uv python install 3.12 && uv sync --python 3.12`.
- **`pnpm dev` errors on `@/types/database.types`** — run `just types` after `supabase db reset`.
- **`/api/health` returns 500** — check `.env` values; usually `SUPABASE_SERVICE_ROLE_KEY` typo.
- **CORS preflight failing from frontend** — add `http://localhost:3000` to `QP_ALLOWED_ORIGINS` in `python-backend/.env`.

Full incident runbook: [RUNBOOK.md](RUNBOOK.md).
