---
name: rivet-dev
description: Use when starting, running, or debugging the Rivet local stack — "run the app", "start the dev server", "the app won't boot", "supabase won't start", screenshotting or manually testing a change in the real app. Covers the two processes, environment setup, demo logins, and the failure modes specific to this repo.
---

# Running Rivet Locally

Two processes. Both are required.

| Process | Command | Port |
| --- | --- | --- |
| Postgres + Auth | `supabase start` | 54321 API, 54322 DB, 54323 Studio, 54324 mail |
| Next.js | `npm run dev` | 3000 |

There is no separate AI service. Gemini is called in-process from the server actions
(`src/lib/ai/`) — see `docs/adr/0009-ai-in-process.md`. Anything telling you to start
`uvicorn` or `python-backend` is out of date.

## Cold start

```bash
npm install                  # see "node_modules symlink" below if this looks wrong
supabase start               # needs Docker Desktop running
supabase db reset            # migrations + seed
npm run dev
```

Sign in at http://localhost:3000/login:

- `owner@acme.demo` / `demo1234` — full access
- `office@acme.demo` / `demo1234` — no settings/team
- `tech@acme.demo` / `demo1234` — assigned jobs only

Test with more than one role. Permission bugs only show up when you do.

## Environment

`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase status>
SUPABASE_SERVICE_ROLE_KEY=<supabase status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=<optional — mock fallback without it>
```

`src/lib/env.ts` validates with Zod and throws on a missing required var. The error names the
variable — read it rather than guessing.

Without `GEMINI_API_KEY` the app still runs: quote generation keyword-matches the catalog and
reports `mode: "mock"`, and the customer summary comes back empty. Nothing errors, so if quotes
look mechanical, check `mode` before blaming the prompt.

## Failure modes, in the order you'll hit them

**`node_modules` is a broken symlink.** It points at `node_modules.nosync`, which may not exist.
This is an iCloud-avoidance workaround. Fix:

```bash
rm -f node_modules && npm install
```

If the repo is still inside iCloud Drive, run `just relink` after every install to move deps
back out of sync. If you've moved the repo to `~/code/rivet`, delete the symlink dance entirely.

**`NEXT_PUBLIC_SUPABASE_URL` is a `*.trycloudflare.com` address.** Expired throwaway tunnels
from mobile testing. Replace with `http://127.0.0.1:54321`. Tunnels are only for opening the app
on a real phone — `scripts/sync-tunnels.sh` regenerates them and rewrites `.env.local`.

**`supabase start` hangs or errors.** Docker Desktop isn't running, or ports are taken.
`supabase stop --no-backup && supabase start`.

**Login succeeds then bounces back to `/login`.** The Supabase URL in `.env.local` doesn't match
the one that issued the cookie — usually a stale tunnel URL. Fix the env, clear cookies,
restart `next dev`.

**Redirected to `/app/onboarding` unexpectedly.** `requireSession()` sends you there when the
`users` row has no `company_id`. Either you signed up fresh (correct behaviour) or the seed
didn't apply — re-run `supabase db reset`.

**Quote generation returns nothing.** Check the backend is up and `ai_mode` in `/health`. If
it's `mock`, Gemini is unavailable and you're getting keyword matches — that's the intended
fallback, not a bug. Also: generation requires active `catalog_items` for the company, and
returns a 400 without them.

**`tsc` reports errors in `src/app/(dashboard)/**`.** That's the dead pre-rebuild tree. Ignore
it and check only live paths — see `docs/CODEBASE_MAP.md`.

**Git commands hang for minutes.** The repo is in iCloud Drive. Move it to `~/code/rivet`.

## Verifying a change

Don't stop at "it compiles."

- Exercise the actual flow in the browser at 375px and desktop width. Techs use this on a phone.
- Check the data landed: `psql "$DATABASE_URL" -c "select id, status, total from work_items order by updated_at desc limit 5"`
- Outbound mail goes to Inbucket at http://localhost:54324.
- Stripe is test mode — card `4242 4242 4242 4242`.
- Public quote link: `select public_token from work_items where id = '<id>'`, then open
  `/q/<token>` in a private window. That's the customer's view and it's the one that sells.

## Useful

```bash
supabase status                    # keys and ports
supabase db reset                  # nuke and reseed
psql "$DATABASE_URL"               # direct SQL
open http://localhost:54323        # Supabase Studio
npx tsc --noEmit                   # the real quality gate
```
