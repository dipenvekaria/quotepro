# Pre-launch QA — process-flow verification

Run 2026-08-19 against local (fresh seed + migrations) and, where noted, production.
Method per flow: exercise the real path, then verify the database changed. Automated
integration tests now pin the fragile ones permanently (380 pass in CI).

## Verified end to end

| Flow | How verified |
| --- | --- |
| AI quote drafting (incl. vague-job questions) | 12-case eval 12/12 on both models; live prod run ("Deep cleaning" → question chips → answer → drafted) |
| Quote editing via chat (discount, rename, add) | Live prod runs in the AI run log; session-scoped |
| Save → send → customer view → **accept with e-signature** | Live: accepted as "QA Homeowner"; DB shows status, timestamp, signer, IP, terms flag; activity logged viewed + accepted |
| Edit-and-resend on a sent quote (price match) | Live: $556.50 → $499, resent, customer link showed new total; expiry never shortened |
| Company terms + tax # on /q and PDF; consent copy at accept | Live render + PDF 200 with terms; audit trail carries terms_agreed |
| Invoice convert → send → record payment | Live earlier sessions + payment path re-verified via QBO sync run |
| **QuickBooks sync** (customer → invoice → payment) | Live on prod sandbox: INV-2026-2144 → QBO #145; payment applied |
| Recurring visits (spawn, items, auto-invoice, idempotence, tz math) | 6 integration tests incl. DST + month-end clamp |
| Review request (gating, dedupe, email, activity) | Live: real delivery, button locks, second send refused |
| Notes + @mention email | Live: note stored with author, "emailed Sam" |
| Customer import wizard (Jobber headers, dedupe, addresses) | 3 integration tests |
| Price book import upsert + starter cleanup | 3 integration tests — **caught a real bug** (type-cast regression that broke all CSV imports; fixed same day) |
| Billing: checkout session, price self-provisioning, webhook sync | Harness against Stripe test mode: real checkout URL; sync writes status/plan/trial end |
| Waitlist (idempotent, validation) | Harness: insert, dedupe, reject invalid |
| Public surfaces (/, /privacy, /terms, robots, sitemap) | 200 locally and on prod |
| Domains, TLS, canonical redirects, favicon, manifest | Verified on prod during rollout |
| Mobile calendar agenda, pipeline search, CTA passes | Verified at phone width during their rollouts |

## Not yet verified — needs a human or a later step

1. **Signup → onboarding → starter book** on production. The local browser bridge
   cannot complete form flows reliably. Two-minute phone test: create a throwaway
   account (invite it via Supabase while signups stay closed), pick a trade, confirm
   the starter book appears and a first quote drafts.
2. **QBO tax fix (#147)** on the sandbox: delete the earlier $540 test invoice, run one
   new invoice + payment, confirm QBO total matches Rivet to the cent and tax posts as
   the "Sales Tax (Rivet)" liability line.
3. **Stripe checkout completion → webhook → trialing** as one live loop. The engine
   halves are verified separately; completing checkout with a test card and receiving
   the webhook needs either the deployed webhook (already registered for Connect —
   confirm the endpoint's events include `customer.subscription.*` in the Stripe
   dashboard) or `stripe listen` locally.
4. **Trial-expiry lock-out** is deliberately not built: existing companies predate
   billing and must not be locked out. Decision needed on grandfathering before
   enforcement ships.
5. **Email rendering across clients** (Gmail/Outlook/Apple Mail) for the rebranded
   templates — send one quote to each and eyeball.

## Coverage classes added after the first pass

The first pass tested flows that exist end to end. Two failure classes it could
not catch were found the hard way (the dead SignNow page; the signature record
that was captured but not shown anywhere) and are now standing audits:

1. **Route inventory** — enumerate every page and API route; each must be
   linked from somewhere, deliberately deep-linked (documented), or deleted.
   Findings this pass: `/q/[id]/sign` + `/api/quotes/sign` + `signnow.ts`
   (removed in #162), `/q/[id]/accepted` and `/api/vitals` (orphans, removed
   here). `/brand` is kept deliberately: auth-gated design kit, referenced by
   the rivet-ui skill.
2. **Capture → retrieval** — anything the system records must be visible
   somewhere a user can reach: signature record (now the Acceptance record
   card), AI runs (timeline), activity (timeline), payments (invoice card),
   QBO sync state (integrations card), archived items (inactive view).

## Known environmental caveats

- Local browser automation degrades over long sessions (input events stop landing);
  flows above marked "live" were captured while it worked or on production.
- `supabase db reset --no-seed` was run mid-session and wiped local demo data once;
  a full reseed restored it. Local-only; production untouched.
