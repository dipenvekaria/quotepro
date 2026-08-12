# Rivet

**Quote the job before you leave the driveway.**

Rivet is field-service software for trades contractors — HVAC, plumbing, electrical, roofing,
landscaping. A lead comes in, AI drafts a quote from the contractor's own price catalog in
seconds, the customer accepts and pays from a link on their phone, and the same record becomes
the scheduled job and the invoice.

The thesis is one record for the whole lifecycle. A lead becomes a quote becomes a job becomes
an invoice without ever being copied to a new row — so the link you sent the customer keeps
working, the audit trail stays intact, and reporting is one query instead of three.

> Formerly QuotePro. The repository and git remote still carry the old name; see
> [`docs/adr/0004`](docs/adr/0004-product-name-rivet.md).

## Status

**Pre-launch.** The application works end to end against a local database. It is not deployed,
there is no production database, and Stripe is in test mode. See
[`docs/LAUNCH_PLAN.md`](docs/LAUNCH_PLAN.md) for the path to live.

The repository also contains a full pre-rebuild version of the app that still compiles.
[`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) says which half is real — read it before
editing anything.

## Stack

Next.js 16 (App Router, React 19, TypeScript strict) · Tailwind 4 + shadcn/ui · Postgres via
raw `pg` and parameterized SQL, no ORM · Supabase for auth · Google Gemini for quote
generation · Resend, Stripe Connect, SignNow.

## Quick start

```bash
git switch main
npm install
supabase start               # needs Docker
supabase db reset            # migrations + demo seed
npm run dev                  # → http://localhost:3000
```

That is the whole stack — Gemini runs in-process. Quote generation works without a
`GEMINI_API_KEY`, falling back to keyword-matching the catalog.

Demo logins: `owner@acme.demo`, `office@acme.demo`, `tech@acme.demo` — all `demo1234`.

Environment setup and the failure modes you'll hit are in
[`docs/ONBOARDING.md`](docs/ONBOARDING.md).

## Documentation

| | |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Agent context — rules, live/dead map, conventions |
| [`docs/ENGINEER_RUNBOOK.md`](docs/ENGINEER_RUNBOOK.md) | **Start here if you're joining.** Fresh machine to merged PR. |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | Longer-form onboarding with product context |
| [`docs/CLAUDE_CODE_SETUP.md`](docs/CLAUDE_CODE_SETUP.md) | Claude Code setup so every machine shares the same context |
| [`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) | What runs and what's dead |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How it fits together and why |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Schema and the work-item lifecycle |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | How code is written here |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel + Supabase Cloud |
| [`docs/PROTOTYPE_DEPLOYMENT.md`](docs/PROTOTYPE_DEPLOYMENT.md) | Current focus — deploy the prototype, onboard a second engineer |
| [`docs/LAUNCH_PLAN.md`](docs/LAUNCH_PLAN.md) | Sequenced path to production |
| [`docs/GTM_PRODUCT_CHECKLIST.md`](docs/GTM_PRODUCT_CHECKLIST.md) | Feature gaps vs competitors; the launch gate |
| [`docs/GTM_BUSINESS_CHECKLIST.md`](docs/GTM_BUSINESS_CHECKLIST.md) | Legal, compliance, marketing, billing, support |
| [`docs/CLEANUP_PLAN.md`](docs/CLEANUP_PLAN.md) | Debt paydown, in order |
| [`docs/adr/`](docs/adr/) | Decisions and rationale |
| [`docs/SESSION_LOG_2026-08-07.md`](docs/SESSION_LOG_2026-08-07.md) | Decisions, findings and open items from the handover session |
| [`docs/Rivet-Engineering-Primer.pdf`](docs/Rivet-Engineering-Primer.pdf) | The above, condensed into one shareable 12-page document |

The primer is generated from [`docs/primer/rivet-primer.html`](docs/primer/rivet-primer.html).
After editing it, regenerate with `python3 docs/primer/build-pdf.py --verify`.

Anything under `docs/archive/`, `docs/rebuild/`, or `REBUILD.md` describes a system that no
longer exists. History, not instruction.

## Contributing

Branch off `main`. Small PRs, one concern each. `npx tsc --noEmit` clean on live code
before you open one. Terse commits. Non-obvious decisions get an ADR.

Working with Claude Code: `CLAUDE.md` loads automatically, and `.claude/skills/` holds six
project skills — `rivet-dev`, `rivet-data`, `rivet-migration`, `rivet-ui`, `rivet-ai`,
`rivet-ship`.

## The one rule

The `pg` pool connects as superuser and **bypasses Row Level Security**. Every query touching
company data carries `where company_id = $n`; every mutation verifies ownership first. Nothing
catches a missed scope.
