# Prototype Deployment Plan

Getting Rivet off a laptop and onto a URL two engineers can share, without pretending it's a
product launch. Roughly **three to four days of focused work**, one person, mostly waiting on
DNS and dashboards.

This is deliberately narrower than [LAUNCH_PLAN.md](LAUNCH_PLAN.md). That document is the path
to a paying contractor. This one gets you a working deployed prototype, a second engineer who
can contribute, and a rhythm for continuing the build.

## What "done" looks like

- A URL you can open on a phone that runs the real app against a real hosted database.
- Only you and your engineers can reach it.
- Both of you can develop locally without stepping on each other.
- The engineer can open a PR, get a preview deploy, and merge it.
- Nothing in the stack is a disposable tunnel or a hardcoded laptop path.

## Decisions taken

| | |
| --- | --- |
| **Access** | Internal only. Vercel Authentication, no public signup, demo data is fine. |
| **Databases** | Local Supabase per engineer + one shared hosted `rivet-staging`. |
| **Hosting** | Vercel (frontend) + Railway (AI backend) + Supabase Cloud — [ADR 0005](adr/0005-hosting-vercel-railway-supabase.md). |
| **Stripe** | Stays in test mode. |
| **First engineer task** | Cleanup Phase 1 — delete the dead tree. |

---

## Step 0 — Move the AI call server-side

**Blocking. Do this before anything is deployed.** Half a day.

`src/app/app/(shell)/quotes/new/quote-editor.tsx:130` is a `'use client'` component that
`fetch`es the Python backend **directly from the browser**, passing `company_id` from a
client-side variable:

```ts
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const res = await fetch(`${backendUrl}/api/ai/generate-quote`, {
  method: 'POST',
  body: JSON.stringify({ company_id: companyId, description: prompt, ... }),
})
```

Three consequences, and the first one is why this blocks the deploy:

1. **Vercel Authentication cannot protect it.** Railway is a different origin. Password-protect
   the frontend all you like — the backend URL sits on the open internet regardless.
2. **`ai_backend.py` has no authentication and `allow_origins=["*"]`.** Anyone who finds the
   URL can call it.
3. **`company_id` is supplied by the client.** Change one value in devtools and you get another
   company's catalog-derived pricing back. This is a cross-tenant read with no exploit required.

The fix is smaller than adding JWT verification to Python, and it removes the spoofing problem
entirely rather than mitigating it.

**Frontend** — add a server action alongside the existing ones in
`src/app/app/(shell)/quotes/new/actions.ts`:

```ts
'use server'

export async function generateQuoteItems(input: { description: string; customer_name?: string; address?: string }) {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const res = await fetch(`${envServer().BACKEND_INTERNAL_URL}/api/ai/generate-quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rivet-Key': envServer().RIVET_BACKEND_SECRET,
    },
    // company_id comes from the session — never from the caller.
    body: JSON.stringify({ company_id: session.companyId, ...input }),
    cache: 'no-store',
  })
  if (!res.ok) return { ok: false as const, error: 'Quote generation failed' }
  return { ok: true as const, data: await res.json() }
}
```

Then replace the `fetch` in `quote-editor.tsx` with a call to that action. The response shape
is unchanged, so the rest of the component stays as it is.

**Backend** — in `ai_backend.py`, reject anything without the shared secret and stop allowing
browser origins (nothing calls it from a browser any more):

```python
BACKEND_SECRET = os.getenv("RIVET_BACKEND_SECRET", "")

@app.middleware("http")
async def require_secret(request, call_next):
    if request.url.path.startswith("/api/") and request.headers.get("x-rivet-key") != BACKEND_SECRET:
        return JSONResponse({"detail": "unauthorized"}, status_code=401)
    return await call_next(request)
```

Keep `/health` open so Railway's health check works.

**Then:** delete `NEXT_PUBLIC_BACKEND_URL` from the Vercel environment. It should not exist in
a browser bundle again. Local dev keeps working via `BACKEND_INTERNAL_URL=http://localhost:8000`.

Verify: `curl -X POST https://<railway>/api/ai/generate-quote -d '{}'` returns 401.

> Full JWT verification and per-user rate limiting are still worth doing before any public
> deployment. They're in [LAUNCH_PLAN.md](LAUNCH_PLAN.md). This step is what makes an
> *internal* deploy safe.

---

## Step 1 — Accounts and access

Half a day, mostly clicking.

1. **GitHub** — add the engineer as a collaborator on `dipenvekaria/quotepro`.
2. **Set `rebuild/main` as the default branch.** It is the live branch; `main` is pre-rebuild
   and a new collaborator will otherwise branch off the wrong one on day one.
3. **Protect `rebuild/main`** — require a PR, require CI to pass once CI actually works
   (Cleanup Phase 3). For two people, one approval is enough; don't make it heavier than that.
4. **Vercel, Railway, Supabase** — invite the engineer to each. All three have free-tier seats
   that cover this.
5. **Secrets** — put every key in a shared 1Password vault (or Bitwarden). Not Slack, not
   `.env` files over email. This is also the moment to **rotate everything**: the Gemini,
   Supabase, Resend, Stripe and SignNow keys have all lived in tunnel-facing dev configs.

---

## Step 2 — Hosted Supabase

Half a day.

Create one project, `rivet-staging`, in the region nearest your users.

```bash
supabase link --project-ref <ref>
supabase db push          # applies the four migrations in supabase/migrations/
```

**Do not run `supabase/seed.sql` against it.** It creates demo users with the password
`demo1234`. Instead, sign up through the app once and let `handle_new_auth_user()` and
`bootstrap_company()` create your company the way a real user would — that also tests the
onboarding path.

Also configure:

- **Auth redirect URLs** for the Vercel domain, and Google OAuth authorised origins.
- **Point-in-time recovery on.** Cheap insurance even for a prototype.
- **Connection pooling.** `src/lib/db/index.ts` opens a pool with `max: 5` per instance, and
  Vercel multiplies that by concurrency. `DATABASE_URL` in production must be the **transaction-mode
  pooler on port 6543**, not the direct 5432 connection, or you will exhaust connections under
  trivial load.

Local development is unaffected — everyone keeps running `supabase start` with the demo seed.

---

## Step 3 — Deploy the AI backend

Two hours.

Railway, root directory `python-backend`, start command:

```
uvicorn ai_backend:app --host 0.0.0.0 --port $PORT
```

Environment:

```
SUPABASE_URL                 https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY    <staging service role>
GEMINI_API_KEY               <rotated key>
GEMINI_MODELS                gemini-2.5-flash,gemini-flash-latest,gemini-2.5-flash-lite
RIVET_BACKEND_SECRET         <generate: openssl rand -hex 32>
```

Health check `/health`. The response includes `ai_mode` — `gemini`, `vertex:<region>`, or
`mock`. **If it ever says `mock` in a deployed environment, quotes are being generated by a
keyword matcher.** Set an alert on it.

---

## Step 4 — Deploy the frontend

Two hours.

Vercel project, production branch `rebuild/main`, framework preset Next.js.

```
NEXT_PUBLIC_SUPABASE_URL       https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  <anon>
NEXT_PUBLIC_APP_URL            https://<your-vercel-domain>
SUPABASE_SERVICE_ROLE_KEY      <service role>
DATABASE_URL                   <pooler connection string, port 6543>
BACKEND_INTERNAL_URL           https://<railway-app>.up.railway.app
RIVET_BACKEND_SECRET           <same value as Railway>
RESEND_API_KEY                 <rotated>
RESEND_FROM_EMAIL              no-reply@<your-domain>
STRIPE_SECRET_KEY              <test mode>
STRIPE_WEBHOOK_SECRET          <test mode>
```

Note what's absent: **no `NEXT_PUBLIC_BACKEND_URL`.** Step 0 removed the need for it, and
leaving it would put the backend URL back in the browser bundle.

`src/lib/env.ts` validates all of this with Zod at boot and fails loudly on anything missing.
That's the behaviour you want — don't work around it.

**Turn on Deployment Protection → Vercel Authentication (Standard).** This covers production
*and* every preview deploy, and only your Vercel team members get through. That is the whole
access-control story for an internal prototype, and it's one toggle.

A custom domain is optional at this stage; `*.vercel.app` is fine until you're showing it to
someone outside the team.

---

## Step 5 — Verify

An hour, on a real phone as well as a desktop.

- Sign up fresh → onboarding creates a company → land on the dashboard.
- Add catalog items (CSV import or by hand). **Quote quality is a function of catalog quality**
  — an empty catalog makes the AI look broken when it isn't.
- Create a quote, run AI generation, confirm real line items with real prices.
- Send the quote; check the email arrives (Resend logs will tell you if it's being dropped).
- Open `/q/<public_token>` in a private window. Accept it.
- Schedule the job, complete it, convert to invoice, record a test payment.
- Confirm `curl` against the Railway backend without the secret header returns **401**.
- Confirm a logged-out visitor to the Vercel URL hits the Vercel Authentication wall.

If any step fails, fix it before onboarding anyone — debugging a broken deploy is a much worse
first day than a working one.

---

## Step 6 — Onboard the engineer

Half a day of theirs, an hour of yours.

Point them at [ONBOARDING.md](ONBOARDING.md) and
[CLAUDE_CODE_SETUP.md](CLAUDE_CODE_SETUP.md). They cover the machine setup, the local stack,
and getting Claude Code loaded with the project context.

The three things worth saying out loud, because they're the ones that cost real time:

1. **Clone outside iCloud Drive.** `~/code/rivet`.
2. **`rebuild/main`, not `main`.**
3. **Half the repo is dead code.** [CODEBASE_MAP.md](CODEBASE_MAP.md) says which half. This is
   the single highest-value thing they can read.

Then walk them through one quote end to end in the deployed app, and one in their local stack.
Twenty minutes, and it makes the architecture concrete in a way the docs can't.

---

## Step 7 — Continue the build

**Their first task: Cleanup Phase 1 — delete the dead tree.**
See [CLEANUP_PLAN.md](CLEANUP_PLAN.md).

It's the right first task for reasons beyond the cleanup itself: it's low-risk, it's obviously
verifiable (`tsc --noEmit` gets cleaner with each PR), it forces them to trace what's actually
reachable, and it ends with `ignoreBuildErrors` coming off `next.config.ts` — which means every
subsequent change is type-checked for real. One PR per numbered item in that plan, not one
giant delete.

**Meanwhile, you take the infrastructure track.** The two barely touch the same files, which is
the point:

| You | Them |
| --- | --- |
| Steps 0–5 above | Cleanup Phase 1 |
| Then: full JWT auth on the AI backend | Then: Phase 3 — pnpm/biome/vitest, make CI real |
| Then: Stripe live-mode prep, email domain auth | Then: Phase 4 — tenancy and money tests |

**Rhythm.** Small PRs off `rebuild/main`, each with a preview deploy Vercel generates
automatically. `npx tsc --noEmit` clean before opening — the `rivet-ship` skill has the full
gate. Anything non-obvious becomes an ADR in `docs/adr/`.

**Keep the docs true.** When behaviour changes, the doc describing it changes in the same PR.
This matters more than usual here because the docs are also the agent's context — a stale
`CLAUDE.md` doesn't just mislead a person, it misleads every Claude session either of you runs.

---

## Rollback

- **Frontend** — Vercel, promote the previous deployment. Instant.
- **Backend** — Railway, redeploy the previous image.
- **Database** — migrations are forward-only. A bad one needs a compensating migration, not a
  revert. Test every migration against a local `supabase db reset` first. PITR is the last
  resort and it costs data.

## Deliberately not in this plan

All of it lives in [LAUNCH_PLAN.md](LAUNCH_PLAN.md) and matters before real customers, not
before your engineer's first PR:

Stripe live mode · Rivet's own billing and entitlements · SPF/DKIM/DMARC · a landing page ·
per-jurisdiction tax · Sentry, uptime monitoring, PostHog · Terms and Privacy · GDPR/CCPA
export and delete · load testing · a production database separate from staging.

One caveat on that last point: the moment you show this to someone outside the team, `staging`
stops being staging. Add the production project then, not before.
