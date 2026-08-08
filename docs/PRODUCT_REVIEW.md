# Product Review — Rivet and the Competitive Field

_2026-08-07. Reviewed against the live code on `main`, and against published pricing and
feature information for Jobber, Housecall Pro, ServiceM8, QuoteIQ, xBuild and Deep Lawn._

## The verdict, in three lines

1. **A new customer cannot use Rivet at all.** There is no way to create a catalog item anywhere
   in the product, and AI quote generation returns a 400 without one.
2. **"AI drafts the quote" is no longer a differentiator.** QuoteIQ ships AI photo-to-estimate on
   every plan from $29.99/month. Assuming this is Rivet's wedge is the most dangerous
   assumption in the plan.
3. **The winning pattern among AI-native entrants is vertical depth, not breadth.** Rivet is
   currently broad and late, which is the weakest position available.

The good news: the fix for (1) is also the sharpest available answer to (2) and (3).

---

## 1. The activation cliff

Walk the path a real signup takes today:

| Step | What happens |
| --- | --- |
| Sign up | Works. |
| Onboarding | Company name, phone, email, address. **One screen, then done.** |
| Land on dashboard | Empty. No data, no next step. |
| Go to Catalog | Empty state with two buttons: "Import CSV" and "Add item". |
| Click either | **Nothing.** Both are bare `<button>` elements — no handler, no form, no route. |
| Create a quote → Generate | `400 — No active catalog items for company` |

There is no `catalog/new` route, no import route, and no `insert into catalog_items` anywhere in
live code. `supabase/seed.sql` populates a catalog for the demo company, which is why this has
never surfaced — **every test to date has run against a pre-seeded account.**

The product demos well and cannot be used by a stranger. This outranks everything in the
deployment and cleanup plans.

---

## 2. The competitive field

Rivet is entering a crowded, actively moving market. Two distinct groups matter.

### Incumbents — broad, mature, expensive

| | Entry | Mid | Notes |
| --- | --- | --- | --- |
| **Jobber** | $24–49/mo, **1 user** | Connect $80–199 (5 users) | +$29/user. Marketing Suite +$79, AI Receptionist +$29–99. Four tiers. |
| **Housecall Pro** | $79/mo, 1 user | Essentials $189 (5), MAX $329 (8) | Shipped **trade-specific HVAC/plumbing/electrical packages in July 2026**, plus AI pricing benchmarks and route-based scheduling. |
| **ServiceM8** | ~$29/mo for 30 jobs | pay-as-you-go | Effectively a free tier for solo operators. The low-end floor. |
| **ServiceTitan** | $245–500/tech/mo | — | Enterprise. 6–8 week implementation. Not your competitor. |

Their shared weakness is tier gating. On Jobber, the things a 3-person shop needs daily sit at
$80–199/month: automated quote follow-up (Connect), two-way SMS (Grow), job costing (Grow), lead
pipeline (Plus, or a $49 add-on). Contractors pay for a website builder and a marketing suite to
get quoting and invoicing.

### AI-native entrants — the actual threat

| | Pricing | Shape |
| --- | --- | --- |
| **QuoteIQ** | **$29.99/mo entry, all AI on every plan** | Photos + description + *your own catalog* + local market pricing → line-itemed estimate in 4–7 min. 50+ trades. Also bundles AI call answering, conversational CRM, before/after image generation. Metered by "IQ Credits". |
| **xBuild** | — | **$19M Series A, January 2026.** AI-native estimating, **roofing only.** |
| **Deep Lawn** | from $95/mo | AI quoting, **lawn care only.** |
| **Handoff AI** | from $149/mo | AI estimating. |

**Read QuoteIQ's description carefully: it is Rivet's pitch, already shipped, at a third of
Jobber's price.** Photos, voice input, grounded on the contractor's own catalog. Rivet does not
currently do photos or voice, and does the catalog grounding no better.

Meanwhile xBuild raised $19M this year by doing *one trade* extremely well, and Deep Lawn is
doing the same in lawn care. That is the pattern that's attracting capital and customers: not
"AI for field service," but "AI that understands roofs."

---

## 3. What this means for Rivet

Three honest conclusions.

**Broad + AI-quoting is a crowded box.** Rivet, QuoteIQ, Jobber, and Housecall Pro are all
converging there. Rivet is the smallest and latest entrant in that box with no distribution.

**The remaining differentiators are pricing shape and depth, not "we have AI."**

- **Flat pricing is genuinely open.** Jobber charges per seat ($29/user). QuoteIQ meters AI usage
  through a credit pool. Contractors hate both — per-seat punishes hiring, credits make cost
  unpredictable on the exact feature you want them to use most. *One price, whole team,
  unlimited AI* is a clean, defensible position neither can copy without repricing their book.
- **Vertical depth is where the money is going.** One trade, done properly: the right catalog
  taxonomy, the right upsells, the right quote language, tax handled correctly for that trade's
  jurisdictions.

**The strategic call I'd make: pick one trade for v1.** HVAC is the best candidate — highest
ticket, strongest upsell culture (maintenance agreements, IAQ add-ons, warranties), and the
existing prompt in `python-backend/ai_backend.py` is already written as *"a senior HVAC / trades
estimator."* Being the best HVAC quoting tool in the country is a reachable goal. Being the 5th
best general field-service platform is not.

You can keep the schema and UI trade-agnostic — this is a positioning and content decision
(starter catalogs, prompt tuning, landing page copy, who you sell to), not an architectural one.
Nothing in `work_items` needs to change.

---

## 4. The one feature that fixes all three problems

Building the price book is the worst part of onboarding onto *any* of these tools — QuoteIQ
included, since it also grounds on "your own service catalog." Contractors abandon setup there.
It's why "we'll switch next quarter" becomes never.

**Make catalog ingestion the flagship AI feature, not quote generation.**

Let a contractor upload three old quotes, an invoice, or a supplier price sheet — PDF or phone
photo — and have Gemini extract structured line items with prices. Gemini is natively multimodal;
this is a well-shaped task for it, and you already have the model integration.

Why this is the right first AI investment:

- It fixes the activation cliff, which is currently fatal.
- It turns a 3-hour setup chore into 5 minutes. That's a reason to *switch*, which is a much
  harder thing to earn than a reason to *try*.
- Quote quality is a direct function of catalog quality, so it compounds with everything already
  built.
- **Every competitor has the same cold-start problem and none of them has solved it.** QuoteIQ
  makes you build the catalog. Jobber makes you build the price book. This is the gap.

Pair it with **per-trade starter catalogs** so an empty account is never actually empty. That's a
day of content work.

---

## 5. Feature position against Jobber

Where Rivet stands on the things that matter, ignoring the parts of Jobber worth skipping:

| Capability | Jobber | Rivet today | Call |
| --- | --- | --- | --- |
| Catalog / price book | Manual build | **No way to create one** | **Blocking** |
| AI quote drafting | No (templates) | Yes, text only | QuoteIQ does photos + voice — catch up or differentiate elsewhere |
| Quote → accept → pay | Yes | Yes | Parity |
| Invoice online payment | Yes | **"Coming soon" in the viewer** | **Blocking** |
| Automated quote follow-up | Connect, $80+ | No | **Highest ROI gap** |
| Good/better/best options | Grow, $120+ | Schema exists, no UI | Cheap win, raises ticket |
| Photos on quotes | Yes | No | Expected; half the sales argument |
| Deposits on acceptance | Yes | No | Matters for equipment jobs |
| Two-way SMS | Grow, $120+ | No | Bundle it — real differentiator |
| Scheduling + calendar | Yes, with routing | Calendar, no routing | Fine for v1 |
| Time tracking / job costing | Connect / Grow | No | Skip v1 |
| QuickBooks sync | Connect+ | No | **Will cost deals — v2** |
| Recurring / maintenance agreements | Yes | No | **How HVAC shops make money — v2** |
| Review automation | +$79 | No | v2 |
| Website builder, campaigns, receptionist | Marketing Suite / add-ons | No | **Never build** |

---

## 6. What must be true to charge money

**Blocking — a paying customer notices on day one**

1. **Catalog CRUD + CSV import.** Nothing works without it.
2. **Per-trade starter catalogs.** Removes the empty-state cliff.
3. **Invoice online payment.** `src/app/i/[id]/invoice-viewer.tsx` says *"Online payments coming
   soon."* Stripe Connect is already wired for quotes — this is plumbing an existing path.
   Selling "get paid faster" while invoices can't be paid online is indefensible.
4. **Email deliverability** — SPF, DKIM, DMARC. A quote in spam is a lost job, and it fails
   silently.
5. **Rivet's own billing.** `companies.plan` exists and is enforced nowhere.
6. **Mobile QA on real devices.** Techs work from a driveway.

**High value, low cost — do these before adding anything new**

7. **Automated quote follow-up.** Reminder when a quote is sent and not viewed or accepted in
   3 / 7 / 14 days. You already have `sent_at`, `viewed_at`, `accepted_at` and a working
   reminder path in `src/features/invoices/reminders.ts` to copy. Days of work, directly raises
   the customer's close rate, and Jobber charges $80+/month for it.
8. **Good/better/best options.** `quote_options` is already in the schema with a `tier` column.
   Tiered quotes raise average ticket — the best-known trick in the trades. Jobber gates it at
   $120+.
9. **Photos on quotes.** Supabase Storage is available. Table stakes, and the input for photo-based
   AI estimating later.
10. **Quote expiry.** `expires_at` exists in the schema; nothing sets or shows it. Creates
    urgency, protects against honouring stale pricing.
11. **A landing page.** `/` redirects straight to `/login`. Nowhere to send a prospect, nothing
    for search.

**Deliberately not in v1**

Time tracking · job costing · GPS · route optimisation · QuickBooks · review automation · client
portal beyond token links · recurring agreements · inventory · website builder · marketing
campaigns · AI receptionist.

QuickBooks sync and recurring maintenance agreements are the two that will cost you deals.
Plan them for v2; keep them out of v1.

---

## 7. Other gaps worth fixing in the current build

- **The dashboard reports, it doesn't direct.** A contractor opening this at 7am wants three
  things: what's scheduled today, which quotes need chasing, who owes money. Make it a work
  queue, not a report.
- **Tax is a single company-level default** in `companies.settings`. Correct for a one-state
  contractor, silently wrong the moment they cross a line. The address-based lookup the old
  backend had was dropped in the rebuild.
- **Integrations page is seven "Coming soon" badges.** Two working integrations beats seven
  promises.

---

## 8. Recommended sequence

**Weeks 1–2 — make it usable.** Catalog CRUD, CSV import, starter catalogs, invoice payments.
The difference between a demo and a product.

**Weeks 3–4 — make it worth paying for.** Quote follow-up, good/better/best, photos, expiry.
Every item raises the customer's close rate or average ticket — which is what you actually sell.

**Weeks 5–6 — make it sellable.** Billing and plan gating, landing page, email deliverability,
mobile QA. Pick the vertical and rewrite the copy for it.

**Then — the differentiator.** AI catalog ingestion from existing paperwork. This is where "more
AI features later" should start, because it's the one nobody else has solved and it compounds
with everything before it.

## 9. Positioning

Don't sell "AI-powered field service management" — Jobber, Housecall Pro and QuoteIQ all say
that now, and three of them have more features and more customers.

Sell the two things that are actually yours:

**"Your price book, loaded in five minutes. Quote in the driveway before you leave."**
**One price. Whole team. No per-seat billing, no AI credits.**

The first is a problem every competitor still makes the contractor solve manually. The second is
a pricing shape neither Jobber nor QuoteIQ can copy without repricing their existing book.

---

**Sources:** [Jobber features](https://www.getjobber.com/features/) · [Jobber pricing](https://www.getjobber.com/pricing/) ·
[QuoteIQ AI Estimator](https://myquoteiq.com/ai-estimator/) ·
[Housecall Pro trade-specific packages](https://www.globenewswire.com/news-release/2026/07/15/3327769/0/en/housecall-pro-launches-trade-specific-software-packages-for-hvac-plumbing-and-electrical-businesses.html) ·
[Housecall Pro 2026 redesign](https://www.globenewswire.com/news-release/2026/05/27/3302009/0/en/Housecall-Pro-Unveils-Platform-Redesign-at-Built-to-Last-Spring-Summit-2026.html) ·
[Housecall Pro alternatives / pricing](https://www.g2.com/products/housecall-pro/competitors/alternatives) ·
[AI estimating landscape](https://myquoteiq.com/ai-driven-crm-for-home-service-businesses/) ·
[Field service buyer's guide](https://fieldserviceguide.com/best-field-service-management-software/)
