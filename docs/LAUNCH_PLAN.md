# Launch Plan

The path from "deployed and demoable" to "a stranger pays and succeeds."

Rewritten 2026-08-18 from three independent pre-launch reviews — architecture, product, and
UI/UX — run cold against the live code and a real database, plus direct verification of the
load-bearing findings. Supersedes the previous revision, which predated the Vercel + Supabase
deployment and still referenced the deleted Python AI service.

**Priority:** **P0** blocks taking money from a stranger · **P1** needed for a credible launch ·
**P2** fast-follow, with the trigger that reopens it.

Every code finding carries a `file:line` and is marked **VERIFIED** (someone ran or read it this
session) or **INFERRED** (concluded from code without executing the path). Effort is rough.

---

## Where this stands

The core loop closes end to end — lead → AI draft → send → accept on a phone → invoice → pay —
and a new company reaches a sent quote in about four minutes. Much of the product is better than
its own docs claim. It is **not yet ready for a first paying contractor**, and the gap is not
features: it is a short list of correctness and trust defects, each small in code and large in
what a contractor notices in week one, plus the commercial and account-ownership work that only
the owner can do.

The architecture is sound for launch scale (10–50 companies). The reviews went looking for the
usual killers — vector search collapsing under multi-tenancy, runaway AI cost, single-process
coupling — and **measured that none of them bite**: retrieval is 5.8ms at 30k vectors, AI is
single-digit dollars a month, and the awaited in-request work is cheap on Fluid Compute. What
would have broken it were two invisible defects, both now fixed (below).

---

## Shipped this session

Already merged to `main`; the first is also verified live in production.

- **Closed a cross-tenant data leak (#109, deployed + verified in prod).** Five reporting views
  were granted to `authenticated` but ran as their owner, bypassing RLS — any signed-in user
  could read every other company's quotes, customers, revenue, and public quote tokens through
  the REST API Supabase auto-publishes. All views are now `security_invoker` with no role grants;
  a test guards every future view. **VERIFIED** by proving the endpoint closed in production.
- **Stopped a pool crash (#109).** The `pg` pool had no `error` listener, so a routine Supabase
  pooler restart killing an idle connection crashed the whole process. Added the listener, a 5s
  acquisition timeout, and raised `max` to 10.
- **Stopped an estimate leaking to the customer (#110).** `proposeEstimatedItem` wrote the
  estimate basis — which states the contractor's markup — into `description`, which renders on
  `/q` and the PDF. `description` is now null; the basis stays internal; the guard test was
  widened.
- **Error boundaries for the signed-in app (#111).** A database blip rendered Next's raw crash
  screen. Now recovers with product copy and reports to Sentry.
- **Logged the good/better/best generation (#112).** The tiers generator built quotes and
  recorded nothing, so the per-quote AI audit was blind to the path that most quotes use — found
  on a real production quote. Now logged and costed; a test asserts every generator logs.

---

## P0 — Launch blockers

### Engineering

**1. The AI writes customer-facing copy for work that is not on the quote.** — **VERIFIED**,
~2h
`pipeline/[id]/actions.ts:363` passes both `jobDescription` and `lineItems` to `explainQuote`,
and `prompts/quote-explanation.md` contradicts itself. A quote whose lines carried no duct
sealing got a public summary that told the customer "the work involves sealing your attic
ductwork" — and the customer accepted. The same page renders the **raw internal job description**
(including phrases like "customer also wants…") verbatim on `/q` and `/i`. A hallucinated scope
the customer accepts is a contract the contractor must honour.
**Fix:** stop passing `jobDescription` to the summariser; stop rendering `work_items.description`
on `/q` and `/i`.

**2. Half the price book carries a unit that never reaches the quote — and it breaks
scheduling.** — **VERIFIED**, ~1 day
`quote_items` has no `unit` column. The catalog shows "$1,650 per ton"; the line renders
"3 × $1,650.00", which a homeowner reads as three air conditioners when it was three tons. Worse,
`quotes/new/actions.ts:363` computes `estimated_hours` as `hours × quantity`, so a one-condenser
job booked **26.25 hours** and a per-sq-ft roof books 120. Capacity-honest scheduling from
`labor_hours` is the product's stated structural advantage, and it is currently wrong for the
majority of every seeded catalog (53% of 9,945 starter items use a non-`each` unit).
**Fix:** carry `unit` onto `quote_items`, render it beside quantity everywhere (`/q`, PDF,
editor), and scale hours by quantity only for `each`/`hour` units.

**3. Every date is the server's clock, not the contractor's.** — **VERIFIED** (found
independently by two reviewers), ~half a day
`companies.settings.timezone` is stored and read by nothing. All day-boundary logic uses
server-local time (`dashboard/page.tsx:63-67,281,767`; `calendar/page.tsx:162`), and Vercel runs
UTC. From mid-afternoon onward every US contractor's dashboard shows tomorrow's date, "Today's
schedule" queries tomorrow's jobs, and the greeting is hours off. A technician checking their
route at 5:30pm sees the wrong day.
**Fix:** capture a timezone at onboarding (derive it from the address already geocoded); do
day-boundary maths in it.

**4. There is no password reset, and the sign-in page says there is.** — **VERIFIED**, ~half a
day
`login/page.tsx:178` links to `/forgot-password`; the route does not exist and
`resetPasswordForEmail` appears nowhere. A contractor who forgets their password is locked out
permanently.
**Fix:** build the Supabase reset flow, or replace the link with a support address until it
exists.

**5. An invoice with no line items shows a total and nothing else.** — **VERIFIED**, ~1h
`invoice-viewer.tsx:178` wraps the itemisation **and** the Subtotal/Tax/Total block in
`nonDiscountItems.length > 0`, so an invoice without line items renders a bare "amount due" with
no breakdown. Selected `notes` are never rendered either.
**Fix:** move the totals outside the guard; give the items list a real empty state; render notes.

**6. ~~The AI fabricates a whole quote when no job is described.~~ FIXED — see "Shipped this
session".** Kept for the record: the editor defaulted an empty description to the literal
placeholder `"Quote"` and both generators accepted it, so the model invented a plausible,
catalog-priced job — verified on a real production quote, where the tiers path built a $935
three-option repair from the word "Quote" and the single path built a completely different
refrigerant job from the same input. Fixed at every layer: the editor persists the real job text
and never manufactures a description; the generation prompt refuses non-descriptions and asks;
the tiers path — whose model ignored the same prompt rule — refuses in code (`VagueJobError`)
before any model call, with tests; and per-measure items with no stated measurement now ask for
it instead of defaulting to quantity 1. The mock fallback's own fabrication (it padded unmatched
descriptions with labour lines — $786 for "asdfghjkl qwerty") is also removed. What remains open
is #1, the summary describing off-quote work — same class, still to do.

### Owner (mechanical or a decision — not code)

- **Rotate the two leaked credentials** — a Supabase access token and a Google OAuth secret were
  pasted into transcripts. The repo is public. Mechanical, minutes.
- **Move off personal accounts onto organisation-owned ones and reissue every key** — Google
  Cloud, Vercel, Supabase, Stripe, Resend, and the domain are all on one person's personal
  accounts. This is a single point of failure and non-transferable. Days, needs you. (Security
  review §7.)
- **One real payment through Stripe Connect, in live mode** — zero connected accounts exist in
  production. This is the last thing standing between a projection and a business
  (`GTM_PRODUCT_CHECKLIST` §0.2).
- **Legal minimums live and lawyer-reviewed** — Terms, Privacy, and the AI-output disclaimer
  (the disclaimer already ships in the editor). Plus a trademark knockout search on "Rivet"
  before more is spent on the domain. (Business checklist §1, §3.)
- **Decide billing deliberately: do not build it.** There is no subscription machinery, and that
  is fine — invoice ten hand-onboarded design partners by hand and learn the price. But **delete
  "Free 14-day trial" from `login/page.tsx`** now; it is a promise with nothing behind it.

---

## P1 — Before a credible launch

### The public front door (a stranger's one unguided attempt, on a phone)

- **The quote/invoice hero does not stack at 375px.** `quote-viewer.tsx:224`,
  `invoice-viewer.tsx:147` use `flex justify-between` with no stack breakpoint, so the most
  important paragraph renders in a 127px column and the invoice job description becomes a 15-line
  ribbon before "Work performed". **VERIFIED, measured.** One class:
  `flex-col gap-4 sm:flex-row`. ~15 min, highest visual leverage on the page that matters most.
- **The customer's Approve and Decline steps are hand-rolled `fixed inset-0` divs, not
  dialogs** — no focus trap, no Escape, background stays focusable. Six such modals exist across
  the app while Radix `Dialog` is used in seven other files (and `work-item-detail.tsx` uses
  both). **VERIFIED** on the Approve modal. Swap for the primitive already in the repo.
- **Quote expiry is printed on the PDF, hidden on the page the customer approves from, and not
  enforced.** `acceptQuote` (`q/[id]/actions.ts:29`) gates on status only, so a year-old quote is
  acceptable at last year's prices. **VERIFIED.** Show it under the total; check it in `accept`.
- **Raw phone numbers and machine timestamps on the trust surface** — `/q` renders `5125550142`
  unformatted and "Accepted on 8/18/2026, 3:44:28 AM". The `tel:`/`mailto:` escape-hatch links
  are 15px tall, below the 24px WCAG 2.2 target floor.

### Touch targets and labels (mobile-first is mandatory here)

- **12+ call sites override the correct `Button` height with a bare `h-9`/`h-8`,** including
  **Send quote**, **Send invoice**, **Generate**, Record payment, Connect Stripe, and the qty/
  price fields (32px). This is the exact regression the codebase already fixed once and commented
  at `quote-viewer.tsx:588`. **VERIFIED, measured 36px.** One mechanical sweep.
- **`hidden sm:inline` strips the label from the controls that most need one, on phones only** —
  the global "New quote" becomes a nameless `+` with no `aria-label`; the price-book permission
  toggle renders as an unexplained switch; "Explain for customer" becomes a bare glyph.
  **VERIFIED.**
- **Pipeline search collapses to 74px at 375px** and merges visually with the assignee select
  into one broken-looking control. **VERIFIED, measured.** Put search on its own full-width row
  below `sm:`.
- **The calendar never got its mobile pass** despite the checklist claiming so: a 720px grid
  inside a 451px viewport, five controls under 44px, and it opens at 12am so a tech scrolls past
  six empty hours. **VERIFIED.**

### Dark mode and the design system

- **`StatusBadge` has no dark variants and five of ten states are confusable.** Every variant is
  `bg-*-100 text-*-700`, so in dark mode the status chip is a bright pastel — the loudest element
  on every pipeline card, in a product whose identity is monochrome restraint. `lead`/`quote_draft`/
  `archived` are three states in one grey; `quote_sent`/`quote_viewed` (the "has the customer
  opened it?" distinction) are near-identical. **VERIFIED.** Add `dark:` pairs; separate the
  confusable states by lightness or icon. ~30 lines, high leverage.
- A hardcoded `text-[#2563eb]` blue sits in the orphaned `/q/[id]/sign` route; the dark
  `themeColor` is slate navy against a neutral-black page. The token set itself is excellent and
  just half-applied.

### The half-built workflow — the last two weeks does not join up

The estimated-items feature, the catalog grant, and the agentic editor were built as one story —
*salesperson quotes something the catalog lacks → sees it was estimated → adds it to the price
book* — and **none of the three joins are wired**. (The one part that could hurt a customer, the
basis leaking onto `/q`, was fixed this session in #110.)

- **`is_estimate` is written and never read** (`quote-tools.ts` only). No badge anywhere, so the
  salesperson cannot see which prices the software invented — the entire point of the flag.
- **The catalog grant unlocks no UI.** `catalog/page.tsx:54` computes `canEdit` from role only;
  the grant is never consulted, so a granted salesperson still sees every edit control disabled
  even though the server action honours the grant. **INFERRED** (branch unambiguous).
- **The agent is behind the wrong editor.** Saving lands on `pipeline/[id]`, which uses the
  regenerate path; the agent lives in `quotes/new`, which cannot reopen an existing quote.
- **No "add to price book" nudge** — `estimate.ts:30` returns `comparableId` "for the nudge";
  nothing consumes it.
  **Recommendation:** pick one editor, put the agent behind it, and finish one end of the loop (a
  badge on estimated lines + an "add to price book" button that honours the grant). Until then
  the three PRs are inventory, not features.

### Promotions cannot run across the whole catalog — **owner-requested**

A promotion is forced to target at least one label: `promotionSchema`
(`catalog/actions.ts:716`) validates `labels … .min(1, 'Pick at least one label to discount')`,
and quote-time application is keyed on `promotion_labels`. The picker is already multi-select (up
to 10), so a contractor can span several labels — but there is no way to run a promotion on
**everything** (a seasonal store-wide sale) without labelling every item and selecting every
label. **VERIFIED.**
**Fix:** allow a promotion with no labels — or an explicit "all items" scope — to apply to the
whole active catalog, and surface it as an "apply to all items" toggle in the promotions form.
Small: drop the `min(1)`, treat empty/all-scope as "every active item" in the application query,
and add the toggle. No schema migration needed if empty-labels means all.

### Data the product has and contradicts itself about

- **Analytics shows two different acceptance rates on one screen** (71% headline vs 57%
  leaderboard) because they count different cohorts — and it is the number the sales pitch is
  built on. **VERIFIED.**
- **`profile.full_name` is read in two places and written in none** (schema is `first_name`/
  `last_name`), and there is no field anywhere to enter your own name — so the quote detail says
  "Created by: Unknown", undercutting the attribution the grant feature exists for. **VERIFIED.**
- **Quotes have no number** — five different fallbacks across app/PDF/email/`/q`, and one builds
  `Quote_null_<name>.pdf`. Nobody can reference a quote over the phone. Invoices do get numbers.
- **The dashboard reimplements the metrics library** it claims to share; they agree today and
  will drift (different pipeline windows).

### Observability and journey (you cannot fix what you cannot see)

- **Set `NEXT_PUBLIC_SENTRY_DSN` in production.** Sentry is fully wired and inert without it —
  one variable. (Correction to older docs that call it unwired.)
- **No general user-journey capture.** `activity_log` exists but is written only by the seed, not
  the app; PostHog is referenced in `env.ts` and not installed. You cannot see where onboarding
  or a quote is abandoned. The AI run log is now complete per quote (#112) but is surfaced nowhere
  — `aiRunsForQuote` has zero callers.
- **Alert on `ai_conversations.status = 'degraded'`** — since the fail-hard change (2026-08-18)
  there is no mock mode: an unavailable model errors visibly and records a run with
  `mode: 'unavailable'`. A spike of degraded rows is an outage. The data is recorded; nothing
  watches it yet.
- **Uptime monitoring to a phone**, and a **tested backup restore** (not "backups are on" — an
  actual restore into a scratch project, timed). Decide the Supabase PITR tier.

---

## Speed opportunities that do not trade outcome quality — **owner-requested**

Search first, because the biggest one is a quality bug wearing a latency costume.

- **The generators never use the vector search that was built for them.** Both `generateQuote`
  and `generateTieredQuote` ground the model on `fetchCatalog()` — the catalog **ordered by
  name, first 80 items** (`quote.ts:353`, `tiers.ts:157`, fetch capped at 200). The pgvector +
  RRF `searchCatalog` (measured 5.8ms at 30k vectors) is used only by the agent's tools.
  Consequences, in order: any catalog past 80 items has its alphabetically-last items
  **invisible to the AI** — the 101-item test book quotes blind to 21 items, and a 200-item real
  book to 120; and every request ships ~80 items of prompt when the job needs perhaps 15
  relevant ones. **Fix:** select the grounding set with `searchCatalog(description)` (union the
  top ~40 with the always-relevant labour/fee items), falling back to the current slice when
  embeddings are empty. Better recall on big catalogs *and* roughly half the input tokens —
  which is the token budget, the latency, and the cost, all improved by the same change.
  **VERIFIED** (code read; retrieval numbers measured earlier). ~half a day.
- **The two pre-queries run serially.** `generateQuote` awaits `fetchCatalog` then
  `fetchTaxRate` (`quote.ts:432-435`) — independent reads, one `Promise.all`, one round-trip
  saved. Minutes of work; keep the tenancy scanner's shape rules in mind (it cannot parse
  `Promise.all` — see the scanner gap in P2).
- **Draft latency today is ~2s** (measured on a real production run: 2,026ms, 3,094 input
  tokens) and the agent edit path is 2–3 model calls. Both are fine; do not chase model-side
  speed before the retrieval change above, which cuts input tokens as a side effect.
- **What not to do:** cache generated quotes (every job differs), raise temperature-0, or move
  to a smaller model than flash-lite — each trades the determinism or grounding that makes the
  quotes trustworthy.

## P2 — Accept for now (with the trigger that reopens it)

- **Vector search** — exact KNN over the tenant's own slice; 5.8ms at 30k vectors. Cost scales
  per-tenant, not globally. The unused HNSW index is dead weight, not risk. *Trigger: one
  catalog past ~20,000 items.*
- **AI cost** — a draft is one model call; an agent turn is 2–3 plus embeddings. ~$5–10/month at
  50 tenants against $12k+ revenue. Do not optimise. *Trigger: any month above $100.*
- **Single-process coupling** — PDF, email, and AI run in-request; cheap on Fluid Compute, and
  ADR 0009 removed a process for good reasons. *Trigger: the nightly follow-up cron loops all
  companies serially with no `maxDuration` — fine at 50 tenants, not at ~150.*
- **`ai_conversations.messages` grows unbounded** and ADK replays it each turn (quadratic per
  conversation). Fine for a long time at ~2KB/turn. *Trigger: any session past ~30 turns, or p95
  agent latency climbing.*
- **RLS is not in force** — the pool connects as a bypass-RLS superuser; tenancy rests on
  hand-written predicates and the scanner. This is the deliberate design and is safe as long as
  the scanner holds. The stronger design (connect as `authenticated` per request; `withUser()`
  already proves the mechanism) is a large change deferred on team size. **Write the ADR** so it
  is a recorded decision, not a silent gap.
- **The tenancy scanner misses ~12% of query shapes** (`Promise.all([query…])`, `return query…`,
  double-quoted SQL) — all safe today, but the AI tool files that dodge it are where new queries
  land. Cheap to fix: drop `await\s+` from the regex and add `"` to the string alternation, and
  assert the captured count against a broad count. ~1h — worth doing before launch.

---

## Cut or hide for v1

- **Integrations** — a full nav slot with two working cards and six "Coming soon" (Xero, Google
  Calendar, Twilio, Zapier, Slack, Webhooks). A prospect counts six gaps you advertised. Move
  Stripe to Settings → Payments and drop the nav item.
- **SignNow e-signature** — not configured, defaults to the sandbox host, and `/q/[id]/sign` is
  orphaned (nothing links to it; its confirmation page is therefore unreachable). The GTM
  checklist marks it ✅; it is not. **Cut it.** The typed-name acceptance is what this audience
  needs; spend the effort on the accept-confirmation instead.
- **PWA manifest** — `/icon-192.png` and `/icon-512.png` 404, the shortcut points at a wrong
  route, and `/manifest.json` 307s to `/login`. Fix (~10 min, a home-screen icon genuinely helps
  this audience) or unlink.
- **Team leaderboard** — one anonymous row at 3–15 techs, on a metric that disagrees with the
  tile above it.
- **`webhooks_inbound`** — referenced nowhere in `src/`. Dead schema.
- **`/brand`** — still a publicly routable scratch page in the build.

---

## Cleanup and doc corrections (Cleanup Phase 5)

Safe to delete — nothing in `src/` imports them: `lefthook.yml` (configures nothing),
`sentry.{client,server}.config.ts` (stale, say "not installed" while it is), the tunnel scripts,
`cleanup.sh`, `start-frontend.sh`, the Postman collection, `thefieldgenie.png` (tracked twice),
`product.csv`, `tsconfig.ci.tsbuildinfo`. Unused dependencies: `groq-sdk` (a non-Google model SDK
in a Gemini-only repo), `zustand`, `hellosign-sdk`, `@supabase/auth-helpers-nextjs` (deprecated),
`@lemonsqueezy/lemonsqueezy.js`. `k8s/` and `docker-compose.yml` are already gone — trim the
CLAUDE.md trap that still warns about them.

Docs that mislead a new engineer on day one:

- `docs/adr/0011` is marked **Proposed**; the agent is shipped and wired.
- `docs/adr/0003` describes the deleted Python backend while marked **Accepted**.
- `docs/ARCHITECTURE.md`'s "Known debt" still claims `ignoreBuildErrors`, "no tests", and
  scratch routes — all three stale.
- Pricing numbers drift across `STRATEGY.md` ($199–299), `PRICING_STRATEGY.md` ($99/$249/$499),
  and the GTM checklist. Reconcile to one source.
- `GTM_PRODUCT_CHECKLIST` §0.1 marks the 139-second send-from-editor friction open; it is fixed
  (saving now lands on the detail page with "Send quote" at the top).

---

## What is genuinely strong — do not trade it away

Said plainly, because a plan that only lists problems misrepresents where this stands. The
"Not in your price book" honesty that refuses to substitute; option-tier totals recomputed from
line items rather than a stored figure; drive-time "won't make it" chips; the degraded-AI banner
that names the failure instead of shipping a bad quote as if it were good; strong 128-bit public
tokens; a tenancy scanner that has caught real mistakes; `/q` at true 375px with near-zero
overflow and a typed-name accept. These are things a parity-chasing competitor does not build.
The thinking clears the best-in-class bar; the execution has a focused week of gaps in front of
it.

---

## Sequencing

**Days 1–3 — the five P0 engineering blockers.** Timezone and password reset first (they lose a
customer their day or their account), then the AI-summary scope leak, the `unit` column, and the
empty-invoice totals. None is deep; together they are the difference between "works in a demo" and
"survives a contractor's first week." In parallel, the owner starts key rotation and the
org-account migration, which block nothing else and only get more expensive to defer.

**Days 4–7 — the front door and the mobile sweep.** The two hero stack classes, the `StatusBadge`
dark variants, the `h-9`/`h-8` and `hidden sm:inline` sweeps, the modal-to-Dialog swap on the
customer accept, and the calendar mobile pass. This is the "best in class" week, and most of it is
mechanical.

**Week 2 — make it observable and chargeable.** Set the Sentry DSN, add the `mock`-mode alert and
uptime monitoring, run a real restore drill, and take one live Stripe payment. Decide billing (do
not build it) and delete the trial promise. Cut/hide the v1 items and run the cleanup.

**Then — sell.** Ten hand-onboarded design partners, invoiced by hand, spoken to weekly. Build
only what those ten ask for twice. The half-built estimate/grant/agent workflow and the metrics
duplication are real but survivable while you learn from real use.

---

## Launch gate

Do not take money from a stranger until every one of these is true.

- [ ] Dashboard and calendar show the contractor's own day (timezone)
- [ ] Password reset works on the production domain
- [ ] The AI customer summary describes only what is on the quote; the internal description is not
      on `/q` or `/i`
- [ ] The AI refuses to generate a quote from an empty/placeholder job description
- [ ] Line quantities show their unit; `estimated_hours` is honest
- [ ] An invoice with no line items renders sensibly
- [ ] The public quote/invoice hero lays out at 375px; the accept step is a real dialog
- [ ] Every key rotated; production runs on organisation-owned accounts
- [ ] An invoice has actually been paid online, once, in live mode
- [ ] Terms, Privacy, and the AI disclaimer are live; "Rivet" trademark cleared
- [ ] "Free 14-day trial" copy is removed (or the machinery exists)
- [ ] Sentry DSN set; a `mock`-mode alert fires; a backup restore has actually been tested
- [x] No cross-tenant read is reachable — closed and verified in production (#109)
- [x] Every AI generation on a quote is logged and costed (#112)
- [ ] Ten contractors have used it and at least three said they would pay
