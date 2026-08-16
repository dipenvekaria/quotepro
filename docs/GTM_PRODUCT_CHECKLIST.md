# Go-To-Market Checklist — Product

_What Rivet must do to be a viable business against Jobber, Housecall Pro and QuoteIQ.
Companion to [GTM_BUSINESS_CHECKLIST.md](GTM_BUSINESS_CHECKLIST.md)._

**Reviewed 2026-08-16.** Every status below was checked against the code or the database on that
date, not carried forward. Where something could not be checked it says so. The previous revision
had four items marked ❌ that had shipped and a price that no longer matched
[PRICING_STRATEGY.md](PRICING_STRATEGY.md) — statuses rot faster than plans, so re-verify rather
than trust this file.

**Target customer:** multi-truck HVAC shops (3–15 techs). Not solo operators — that is where
QuoteIQ's 1.3M-subscriber audience already lives and you cannot win there. See
[STRATEGY.md](STRATEGY.md) §3b.

**Pricing:** Starter $99 · **Core $249** · Scale $499 when multi-crew lands. Flat, whole team, no
per-seat, no AI credits. Per [PRICING_STRATEGY.md](PRICING_STRATEGY.md).

**Viability bar:** 45 customers replaces one full income; 200 ≈ $600K ARR. See
[BUSINESS_ANALYSIS.md](BUSINESS_ANALYSIS.md). You do not need feature parity with anyone — you
need a contractor obviously better off choosing you for *their* situation.

Priority key: **P0** cannot sell without · **P1** needed for a credible launch · **P2**
fast-follow · **Never** deliberately out of scope.

---

## 0. The two things nothing else can substitute for

Both are unresolved, and every projection in `BUSINESS_ANALYSIS.md` rests on them.

| # | Item | Status | Priority |
| --- | --- | --- | --- |
| 0.1 | **Signup → first sent quote, timed** | ✅ **4m 25s measured 2026-08-16** — clears the 10-minute gate | — |
| 0.2 | **One live payment through Stripe Connect** | ❌ zero connected accounts in production | **P0** |

### 0.1 — the measurement

Walked end to end on 2026-08-16: real signup form, real onboarding, real Gemini draft, quote
saved and sent. Timed from `auth.users.created_at` to `work_items.sent_at`, both read from the
database rather than a stopwatch.

| Segment | Seconds |
| --- | --- |
| Signup → workspace with a 101-item priced catalog | **37** |
| Workspace → draft saved (includes a ~20s AI generation) | **89** |
| Draft saved → sent | **139** |
| **Signup → sent quote** | **265 (4m 25s)** |

**The claim survives contact with the product.** The under-ten-minutes gate is met with more than
half the budget to spare, and that is with a real AI call against a real catalog rather than a
rehearsed demo.

Three honest caveats. This was driven by an agent, so decision time is zero and typing is instant
— a contractor reading each screen for the first time will be slower, though they will also be
typing a job they already understand. It was run against local Postgres, so page loads are
faster than production. And it is one run, of one trade, by someone who knows the app.

**The third segment is the finding.** 139 seconds to go from a saved draft to a sent quote is
longer than drafting it, and the reason is that sending is not reachable from the editor: saving
drops you on the pipeline, and you have to know to open the quote to find "Send quote". That is
the single largest piece of avoidable friction on the activation path, and unlike the rest of the
number it is not an artefact of the measurement.

**Now measured continuously.** `company_activation` (migration `20260823000000`) computes this per
company from timestamps that already existed — no instrumentation was needed. Read it once real
signups land; a median above ten minutes means the onboarding burden falls on the two people who
are the binding constraint, and the price argument gets harder. Negative intervals are nulled,
because seeded and backfilled rows carry a `sent_at` older than their own account and would
otherwise drag the median.

0.2 remains the difference between a business and a projection — and the payments take-rate,
plausibly comparable to the entire subscription line, does not exist until a contractor collects
through the product.

---

## 1. Blocking — can a new customer use the product at all

| # | Item | Status |
| --- | --- | --- |
| 1.1 | Catalog CRUD | ✅ 2026-08-11 |
| 1.2 | CSV import for price books | ✅ 2026-08-11 |
| 1.3 | Per-trade starter catalogs | ✅ 2026-08-12 — 100 trades, 9,945 items, priced from the contractor's own rates at onboarding |
| 1.4 | Invoice online payment | ✅ built — Stripe Connect checkout from the public invoice viewer |
| 1.5 | AI backend authentication | ✅ dissolved 2026-08-11 — AI runs in-process in the authenticated server action ([ADR 0009](adr/0009-ai-in-process.md)) |
| 1.6 | Onboarding cannot corrupt the account | ✅ 2026-08-16 — a second submit no longer re-seeds the price book (#80); duplicates archived and removed (#81) |

**Section 1 is complete.** The timing measurement that used to live here is 0.1, because it is a
go-to-market claim rather than a functional gap.

---

## 2. Quote-to-cash core — table stakes

Every competitor has these. Missing one is a lost deal.

| Capability | Rivet | Jobber | Housecall Pro | QuoteIQ | Priority |
| --- | --- | --- | --- | --- | --- |
| Create/send quotes | ✅ | ✅ | ✅ | ✅ | — |
| AI-drafted quotes | ✅ text | ❌ | ⚠️ benchmarks | ✅ photo + voice | — |
| Public quote viewer, no login | ✅ | ✅ | ✅ | ✅ | — |
| Customer accept online | ✅ | ✅ | ✅ | ✅ | — |
| E-signature | ✅ SignNow | ✅ | ✅ | ✅ | — |
| PDF quote/invoice | ✅ | ✅ | ✅ | ✅ | — |
| Invoicing | ✅ | ✅ | ✅ | ✅ | — |
| Online invoice payment | ✅ | ✅ | ✅ | ✅ | — |
| Scheduling + calendar | ✅ drag-and-drop, time grid, assignee filter | ✅ | ✅ | ✅ | — |
| Customer records | ✅ | ✅ | ✅ | ✅ | — |
| Team roles/permissions | ✅ 4 roles | ✅ | ✅ | ✅ | — |
| **Photos on quotes/jobs** | ✅ per line item, private bucket + signed URLs | ✅ | ✅ | ✅ | — |
| **Quote expiry** | ⚠️ **half-built** | ✅ | ✅ | ✅ | **P1** |
| **Deposits on acceptance** | ❌ no schema | ✅ | ✅ | ✅ | **P1** |

**Quote expiry is the sharp edge here.** `work_items.expires_at` is honoured everywhere it is
read — the public viewer shows it, the PDF prints it, and follow-ups stop chasing an expired
quote — but **there is no way for a contractor to set it.** The feature looks finished from the
inside and is unreachable from the outside. Adding a date field to the quote editor completes it;
this is the cheapest ✅ on the page.

---

## 3. Revenue features — where you win

These make the contractor money rather than saving them time. **Jobber gates the first two behind
$80–120/month tiers.** Putting them in the base tier is both better product and a marketing
weapon.

| Capability | Rivet | Jobber tier | Priority |
| --- | --- | --- | --- |
| **Automated quote follow-up** | ✅ 2026-08-13 | Connect $80+ | — |
| **Good/better/best options** | ✅ 2026-08-15 — generated in one action | Grow $120+ | — |
| Overdue invoice reminders | ✅ | ✅ | — |
| **Consumer financing at quote time** | ❌ | ✅ Wisetack | **P1** |
| **Missed-call text-back** | ❌ | ❌ | **P1** — read [business checklist §4.1](GTM_BUSINESS_CHECKLIST.md) first; TCPA is the largest legal exposure in the product |

**Sales line this unlocks:** *"You sent 40 quotes last month. Twelve were never followed up.
That's roughly $48,000 you left on the table."* A different conversation from "our software is
easier to use."

Good/better/best is the worked example of the product philosophy: both incumbents ship it, and
adoption is low because building three options by hand is three times the work. Removing the
tedium is the differentiator, not the feature.

---

## 4. Where you must be visibly better

Parity loses to incumbents. These are the reasons to switch.

| # | Item | Status | Priority |
| --- | --- | --- | --- |
| 4.1 | **AI catalog ingestion** — read a price book off an old quote, invoice or supplier sheet | ✅ 2026-08-15 — measured against a real Housecall Pro book: 45 items and labour rates in ~1 minute for $0.83 | — |
| 4.2 | **Flat pricing, unlimited AI** | ✅ decided — no credits, no per-seat | — |
| 4.3 | **Mobile at 375px** | ⚠️ substantial work done; no full sweep | **P1** |
| 4.4 | **Public quote viewer polish** | ⚠️ works; not audited against the Stripe-Checkout bar | **P1** |
| 4.5 | **Dashboard as a work queue** | ✅ already is one — today's schedule, quotes worth chasing, overdue invoices | — |
| 4.6 | **Installable PWA** — camera, offline read, push | ⚠️ `manifest.json` exists and is linked from the layout; nothing else built | **P2** |
| 4.7 | Bundled AI voice minutes | ❌ | **P2** — in tension with §6; do not start before missed-call text-back proves the demand |

**4.1 is the moat.** Re-keying a price book is the single biggest reason contractors do not
switch, and it is the one thing that is now a one-minute job. It is also the mechanism that
closes a sale — see the acquisition section of `BUSINESS_ANALYSIS.md`.

**On 4.3:** mobile-first is a standing requirement, not a polish pass. The catalog, pipeline,
calendar, customers and onboarding screens have been through it; the rest have not been looked at
at 375px with touch. Assume a screen is non-compliant until seen.

---

## 5. Will cost you deals — plan for v2

| Capability | Status | Priority |
| --- | --- | --- |
| **QuickBooks** | ⚠️ CSV exports for invoices, payments and customers ✅; live sync ❌ | **P2** for sync |
| **Recurring / maintenance agreements** | ❌ | **P2** — how HVAC shops actually make money; 40%+ recurring raises the owner's exit multiple by 0.5–1.0× EBITDA |
| **Two-way SMS** | ❌ `ComingSoon` placeholder on the integrations page | **P2** — TCPA first |
| Job costing | ❌ | P2 |
| Time tracking | ❌ | P2 |
| Review request automation | ❌ | P2 |
| Client portal beyond token links | ❌ | P2 |
| Per-jurisdiction tax | ❌ single company-level default — silently wrong across state lines | P2 |
| Route optimisation | **declined** — needs geocoding and a solver, pays off at a fleet size this product is not aimed at | Never |

Exports were chosen over an Intuit API sync deliberately: no OAuth, no per-tenant token to
refresh, no exposure to an API that changes on Intuit's schedule, and it works for a product that
has not yet taken a live payment. Build the sync when enough contractors ask twice.

---

## 6. Deliberately never

Building these makes Rivet worse. They are incumbents padding their tiers.

Website builder · marketing campaign suite · AI receptionist as a full real-time voice product
(start with text-back) · inventory management · GPS crew tracking · payroll · aerial measurement ·
before/after image generation · serving 50+ trades

---

## 7. Launch gate

Do not take money from a stranger until every one of these is true.

- [x] A brand-new signup lands on a priced catalog and can generate a quote
- [x] **That path timed end to end, under 10 minutes** — 4m 25s on 2026-08-16
- [x] An invoice can be paid online
- [ ] **An invoice has actually been paid online, once** ← 0.2
- [x] The AI derives `company_id` from the session, not the caller
- [x] Quote follow-up fires automatically
- [x] Good/better/best is usable in the quote editor
- [x] Photos attach to quotes
- [ ] Quote expiry is settable, not just honoured
- [ ] Works properly on a phone at 375px across **every** screen, on a real device
- [x] A second company cannot read the first company's data — enforced by hand and guarded by a static scanner in `tests/tenancy.test.ts`
- [x] `npm run typecheck` passes with `ignoreBuildErrors` off
- [ ] Ten contractors have used it and at least three said they would pay

---

## 8. Sequence from here

Sections 1–3 are substantially done, which changes what comes next. The remaining work is not
features.

**First — prove the remaining claim.** Signup → first sent quote is measured and clears the gate
at 4m 25s. Connect one Stripe account and take one real payment; that is the last thing standing
between a projection and a business.

**Second — close the half-built edges.** Quote expiry needs a date field. Deposits need schema.
Sending needs to be reachable from the editor rather than only from the pipeline — that is 139 of
the 265 activation seconds, and the cheapest of the three to fix.

**Third — sell.** Ten paying customers, personally onboarded. Build only what those ten ask for
twice.

The failure mode remains spending a year reaching feature parity with Jobber. You will not get
there and it is not what wins. The product is now good enough to sell; the unproven parts are
commercial, not technical.
