# Session Log — 2026-08-07/08

A record of what was decided, what was found, and what's still open, so anyone joining can
reconstruct the reasoning without the transcript.

---

## 1. What this session produced

**The canonical documentation set**, replacing ~140 largely stale markdown files that described
a system which no longer exists:

| Doc | Purpose |
| --- | --- |
| `CLAUDE.md` | Agent context, loads automatically |
| `CONTRIBUTING.md` | Standards, PR flow |
| `docs/ENGINEER_RUNBOOK.md` | Fresh machine → merged PR |
| `docs/ONBOARDING.md` | Longer-form onboarding |
| `docs/CLAUDE_CODE_SETUP.md` | Shared agent context across machines |
| `docs/CODEBASE_MAP.md` | Every directory classified live or dead |
| `docs/ARCHITECTURE.md`, `DATA_MODEL.md`, `CONVENTIONS.md` | How it works, how we write it |
| `docs/DEPLOYMENT.md`, `PROTOTYPE_DEPLOYMENT.md` | Hosting + the runbook to go live |
| `docs/LAUNCH_PLAN.md`, `CLEANUP_PLAN.md` | Sequenced work |
| `docs/PRODUCT_REVIEW.md`, `COMPETITIVE_ANALYSIS.md`, `STRATEGY.md` | Direction |
| `docs/GTM_PRODUCT_CHECKLIST.md`, `GTM_BUSINESS_CHECKLIST.md` | Go-to-market |
| `docs/adr/0004–0006` | Decisions with rationale |
| `.claude/settings.json` + six `rivet-*` skills | Committed, so a clone brings them |

**Setup path fixes.** The repo could not be set up from a clean clone: `railway.json` and
`Procfile` started `main:app` (a dead file) and health-checked a nonexistent route;
`requirements.txt` was a 100+ package freeze for backends that never ran; `start-*.sh` had
hardcoded `/Users/dipen` paths; `.env.example` was gitignored so there was no template to copy.
Added real `package.json` scripts and `tsconfig.ci.json`.

---

## 2. Decisions taken

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | **Product is Rivet**, not QuotePro | Outgrew "quoting"; QuotePro effectively unregistrable. [adr/0004](adr/0004-product-name-rivet.md) |
| 2 | **Vercel + Railway + Supabase Cloud** | Not GCP. The schema is welded to Supabase Auth — leaving means rewriting authentication, not moving a database. [adr/0005](adr/0005-hosting-vercel-railway-supabase.md) |
| 3 | **Target: pnpm + biome + vitest + uv + ruff** | Config already assumes it; migration is Cleanup Phase 3. [adr/0006](adr/0006-toolchain-pnpm-biome-vitest.md) |
| 4 | **Single `main` branch** | `rebuild/main` fast-forwarded onto `main` and deleted. Old HEAD tagged `pre-rebuild-main`. |
| 5 | **Repo moved to `~/code/rivet`** | iCloud was actively corrupting it — see §3. |
| 6 | **Build Rivet as a platform**, not a standalone utility | A price-book extraction tool has no recurring revenue and no retention, and document extraction is commoditised. |
| 7 | **Go upmarket: multi-truck shops, one trade (HVAC)** | QuoteIQ owns the solo-operator segment through distribution that can't be matched. |
| 8 | **Pricing: Core $199 / Pro $349, flat** | No per-seat, no AI credits. 200 customers ≈ $600K ARR. |
| 9 | **Don't raise venture money** | We are building a profitable independent company; a seed round forecloses that outcome. |
| 10 | **Missed-call text-back before AI voice** | Same $26B problem, async and reliable, no 24/7 uptime obligation. |

---

## 3. Findings that changed the plan

### The product cannot be used by a new customer

**There is no way to create a catalog item anywhere in Rivet.** The Catalog page's "Import CSV"
and "Add item" buttons are bare `<button>` elements with no handler, and there is no
`insert into catalog_items` in live code. A new signup therefore gets
`400 No active catalog items` when generating a quote.

This never surfaced because `seed.sql` populates a catalog for the demo company — **every test
to date ran against a pre-seeded account.** Highest-priority product bug.

### The AI backend is an open door

`ai_backend.py` has no authentication, sets `allow_origins=["*"]`, and takes `company_id` from
the request body. Worse, `quote-editor.tsx` is a `'use client'` component that calls it
**directly from the browser** — so Vercel's password protection cannot cover it, and changing
one value in devtools returns another company's catalog-derived pricing. Fix is §0 of
[PROTOTYPE_DEPLOYMENT.md](PROTOTYPE_DEPLOYMENT.md): move the call into a server action that
derives `company_id` from the session.

### iCloud was corrupting the repository

Not slow — corrupting. In one session: a successful 778-package `npm install` vanished within
minutes; `rsync` copied `src/lib/email/senders.ts` as **0 bytes** and skipped another file
entirely; a `git commit` sat at **0% CPU in `S` state for 15 minutes** holding `index.lock`,
blocked on I/O while iCloud re-downloaded evicted objects.

After moving to `~/code/rivet`, the identical commit took **0.058 seconds**.

### `rebuild/main` had never been pushed

The entire rebuilt application existed only on one laptop, inside that iCloud folder. Only
pre-rebuild `main` was on GitHub. Now fixed.

### QuoteIQ's moat is distribution, not product

Founded 2023, **40,000+ users, zero VC, zero ad spend**. Founders Mike Vidan (580K YouTube
subscribers, 20 years in the trades) and Justin Rogers (744K subscribers, half a billion views)
had **~1.3 million contractor subscribers before writing a line of code**.

This reframes everything: QuoteIQ is a media business that sells software. "AI drafts the quote"
is not a differentiator — they ship photo + voice estimating on every plan from $29.99.
Estimated revenue **$4–7M ARR from ~5,000–8,000 paying customers** (40,000 "users" is cumulative
signups; there is no free tier).

**The consequence:** out-featuring them is not possible and not necessary. They have 40,000
customers; the plan needs 200.

### Type-checking was cleaner than assumed

`npm run typecheck` (scoped via `tsconfig.ci.json`) passes with **0 errors**. 34 files carry
`@ts-nocheck` and **32 are dead code**. Three orphaned files have real defects — `src/lib/toast.tsx`
(misuses the sonner promise API), `src/lib/web-vitals.ts` (imports a package not in
`package.json`), `src/components/dashboard-nav.tsx`. Nothing imports any of them: delete, don't
repair.

---

## 4. Corrections made during the session

Recorded because the reasoning matters more than the conclusions:

- **"Rivet wins on AI quoting"** — wrong. QuoteIQ ships more of it for less.
- **"Ship a price-book utility instead of the platform"** — wrong. Document extraction is
  commoditised, and a one-time tool contradicts the recurring-revenue model in the same document.
- **"No contractor will trust two strangers"** — overstated. Written when the assumption was zero
  industry access; warm introductions largely solve it.
- **"Flat pricing around $99"** — wrong. $600K ARR at $99 is 500 customers; at $299 it's 168.
  For a small part-time team that difference decides whether the business is operable.
- **"`npm run typecheck` passes"** (first claim) — was meaningless. The verification copy
  contained **zero `.ts` files** because iCloud had evicted them. Re-verified properly afterwards.

---

## 5. Open items

**Blocking any customer**
1. Catalog CRUD + CSV import + per-trade starter catalogs
2. Invoice online payment (viewer says "coming soon")
3. AI backend authentication
4. Rivet's own subscription billing (`companies.plan` is enforced nowhere)

**Blocking a public launch**
5. Remove the "SOC 2" claim from the login page — not true
6. Delete the publicly-routable scratch routes (`/theme-test`, `/logo-test`, `/preview`, …)
7. Rotate every key; manual tenancy audit; tested backup restore
8. Trademark clearance on "Rivet" — a common word, likely conflicts
9. TCPA consent flow before any SMS ships ($500–1,500 per message exposure)
10. Tested backup restore, not just backups enabled

**Decisions still to make**
- Which trade to specialise in — let the contractors who respond decide, not a spreadsheet
- Whether to adopt or delete `python-backend/src/quotepro/` (a complete, tested, never-wired
  ADK/RAG backend)
- Whether to delete the ~16 stale pre-existing docs and `docs/archive/` (112 files) that still
  ship as agent context

**Housekeeping**
- Copy `.env.local` and `python-backend/.env` from the old iCloud copy — gitignored, exist only
  there — then delete that copy
- Set up `gh` collaborator confirmation once Rajat accepts (invite sent, pending)
- Default branch on GitHub is `main` and is now the only branch

---

## 6. Where things stand

| | |
| --- | --- |
| Working repo | `~/code/rivet` |
| Branch | `main` (only branch) |
| Tag | `pre-rebuild-main` preserves pre-rebuild HEAD |
| Remote | `github.com/dipenvekaria/quotepro` |
| Collaborator | `rajatbaid710`, write, invite pending |
| Deployed | Nothing, anywhere |
| Paying customers | Zero |

The immediate next step is §1 of [GTM_PRODUCT_CHECKLIST.md](GTM_PRODUCT_CHECKLIST.md): make the
product usable by someone who isn't the demo company.
