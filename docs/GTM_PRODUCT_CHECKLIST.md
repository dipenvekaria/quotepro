# Go-To-Market Checklist — Product

_What Rivet must do to be a viable business against Jobber, Housecall Pro and QuoteIQ.
Companion to [GTM_BUSINESS_CHECKLIST.md](GTM_BUSINESS_CHECKLIST.md)._

**Target customer:** multi-truck HVAC shops (3–15 techs). Not solo operators — that's where
QuoteIQ's 1.3M-subscriber audience already lives and you cannot win there. See
[STRATEGY.md](STRATEGY.md) §3b.

**Pricing:** Core $199/mo, Pro $349/mo. Flat, whole team, no per-seat, no AI credits.

**Viability bar:** 200 customers ≈ $600K ARR. You do not need feature parity with anyone — you
need a contractor to be obviously better off choosing you for *their* specific situation.

Priority key: **P0** cannot sell without · **P1** needed for a credible launch · **P2**
fast-follow · **Never** deliberately out of scope.

---

## 1. Blocking — the product does not currently work for a new customer

| # | Item | Status | Priority |
| --- | --- | --- | --- |
| 1.1 | **Catalog CRUD** — create/edit/delete price book items | ❌ **No insert path exists anywhere.** Catalog page buttons are inert. | **P0** |
| 1.2 | **CSV import** for price books | ❌ Button exists, does nothing | **P0** |
| 1.3 | **Per-trade starter catalogs** (HVAC first) so a new account is never empty | ❌ | **P0** |
| 1.4 | **Invoice online payment** | ❌ Viewer says *"Online payments coming soon"* while you sell "get paid faster" | **P0** |
| 1.5 | **AI backend authentication** — currently no auth, CORS `*`, `company_id` from request body | ❌ Cross-tenant read with no exploit required | **P0** |
| 1.6 | Signup → first real quote in **under 10 minutes**, timed | ❌ | **P0** |

**Nothing else on this page matters until section 1 is done.** A new account cannot generate a
quote today — AI generation returns `400 No active catalog items`.

---

## 2. Quote-to-cash core — table stakes

Every competitor has these. Missing any one is a lost deal.

| Capability | Rivet | Jobber | Housecall Pro | QuoteIQ | Priority |
| --- | --- | --- | --- | --- | --- |
| Create/send quotes | ✅ | ✅ | ✅ | ✅ | — |
| AI-drafted quotes | ✅ text only | ❌ | ⚠️ pricing benchmarks | ✅ photo + voice | — |
| Public quote viewer, no login | ✅ | ✅ | ✅ | ✅ | — |
| Customer accept online | ✅ | ✅ | ✅ | ✅ | — |
| E-signature | ✅ SignNow | ✅ | ✅ | ✅ | — |
| PDF quote/invoice | ✅ | ✅ | ✅ | ✅ | — |
| Invoicing | ✅ | ✅ | ✅ | ✅ | — |
| **Online invoice payment** | ❌ | ✅ | ✅ | ✅ | **P0** |
| Scheduling + calendar | ✅ | ✅ | ✅ | ✅ | — |
| Customer records | ✅ | ✅ | ✅ | ✅ | — |
| Team roles/permissions | ✅ 4 roles | ✅ | ✅ | ✅ | — |
| **Photos on quotes/jobs** | ❌ | ✅ | ✅ | ✅ | **P1** |
| **Deposits on acceptance** | ❌ | ✅ | ✅ | ✅ | **P1** |
| **Quote expiry** | ❌ `expires_at` exists unused | ✅ | ✅ | ✅ | **P1** |

---

## 3. Revenue features — where you win

These make the contractor money rather than saving them time. **Jobber gates all three behind
$80–120/month tiers.** Putting them in your base tier is both better product and a marketing
weapon.

| Capability | Rivet | Jobber tier | Priority | Why it matters |
| --- | --- | --- | --- | --- |
| **Automated quote follow-up** | ❌ | Connect $80+ | **P1** | Biggest revenue lever in the category. A quote sent and never chased is a lost job. You already have `sent_at`/`viewed_at`/`accepted_at` and a working reminder path in `src/features/invoices/reminders.ts`. |
| **Good/better/best options** | ❌ schema exists | Grow $120+ | **P1** | Raises average ticket. `quote_options` table with `tier` column already built, no UI. |
| **Consumer financing at quote time** | ❌ | ✅ Wisetack | **P1** | Biggest single lever for HVAC. A $12k system closes far more often with monthly payments in the quote. Raises close rate *and* ticket, pays you a referral fee. |
| **Missed-call text-back** | ❌ | ❌ | **P1** | 20–30% of contractor calls go unanswered; 85% of voicemail callers never ring back. Async, cheap, reliable — the 80/20 of an AI receptionist without 24/7 voice risk. |
| Overdue invoice reminders | ✅ | ✅ | — | Already built |

**Sales line this unlocks:** *"You sent 40 quotes last month. Twelve were never followed up.
That's roughly $48,000 you left on the table."* That is a different conversation from "our
software is easier to use."

---

## 4. Where you must be visibly better

Parity loses to incumbents. These are the reasons to switch.

| # | Item | Target | Priority |
| --- | --- | --- | --- |
| 4.1 | **AI catalog ingestion** — upload old quotes/invoices/price sheets, Gemini extracts a structured price book | Nobody has solved this. It's where onboarding dies across the whole category. | **P1** |
| 4.2 | **Flat pricing, unlimited AI** | No credits, no per-seat. QuoteIQ meters AI; Jobber charges $29/user. Neither can copy without repricing their book. | **P1** |
| 4.3 | **Bundled AI minutes** | Core 200 / Pro 750. At 500 min/mo you are **2.7× cheaper than QuoteIQ** at 82% gross margin. | **P2** |
| 4.4 | **Mobile-quality PWA** — installable, camera, offline read, push | Techs work from a driveway. Don't rewrite native — see [STRATEGY.md](STRATEGY.md) §4b. | **P1** |
| 4.5 | **Public quote viewer polish** | The one screen the homeowner sees. Should feel like Stripe Checkout. | **P1** |
| 4.6 | **Dashboard as a work queue** | Today it reports KPIs. A contractor at 7am wants: scheduled today, quotes to chase, who owes money. | **P2** |

---

## 5. Will cost you deals — plan for v2

Not launch blockers, but every established contractor asks.

| Capability | Priority | Note |
| --- | --- | --- |
| **QuickBooks Online sync** | **P2** | Jobber gates at Connect $80+. Bookkeepers demand it. |
| **Recurring / maintenance agreements** | **P2** | How HVAC shops actually make money. 40%+ recurring revenue raises the owner's exit multiple by 0.5–1.0× EBITDA — a genuinely compelling pitch. |
| **Two-way SMS** | **P2** | Jobber gates at Grow $120+. Needs TCPA consent handling first — see the business checklist. |
| Job costing | P2 | Jobber Grow $120+ |
| Time tracking | P2 | Jobber Connect $80+ |
| Route optimisation | P2 | Housecall Pro shipped 2026 |
| Review request automation | P2 | Jobber +$79/mo add-on |
| Client portal beyond token links | P2 | |
| Per-jurisdiction tax | P2 | Currently a single company-level default — silently wrong across state lines |

---

## 6. Deliberately never

Building these makes Rivet worse, not better. They are incumbents padding their tiers.

Website builder · marketing campaign suite · AI receptionist as a full real-time voice product
(start with text-back; Avoca has $125M) · inventory management · GPS crew tracking · payroll ·
aerial measurement · before/after image generation · serving 50+ trades

---

## 7. Launch gate

Do not take money from a stranger until every one of these is true.

- [ ] A brand-new signup can create a catalog and generate a real quote in under 10 minutes
- [ ] An invoice can be paid online
- [ ] The AI backend rejects unauthenticated requests and derives `company_id` from the session
- [ ] Quote follow-up fires automatically
- [ ] Good/better/best is usable in the quote editor
- [ ] Photos attach to quotes
- [ ] Works properly on a phone at 375px, tested on real devices
- [ ] A second company cannot read the first company's data (manually verified)
- [ ] `npm run typecheck` passes and `ignoreBuildErrors` is off
- [ ] Ten contractors have used it and at least three said they would pay

---

## 8. Sequence

**Weeks 1–2 — make it usable.** Section 1 in full. This is the difference between a demo and a
product.

**Weeks 3–4 — make it worth paying for.** Quote follow-up, good/better/best, photos, expiry,
deposits.

**Weeks 5–6 — make it demoable.** AI catalog ingestion, HVAC starter catalog, PWA polish,
public viewer polish, mobile QA.

**Weeks 7–12 — sell it.** Ten paying customers. Build only what those ten ask for twice.

The failure mode is spending a year reaching feature parity with Jobber. You will not get there,
and it is not what wins. Ship section 1, then sell.
