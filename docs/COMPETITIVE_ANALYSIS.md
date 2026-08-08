# Competitive Analysis — Home Services Software, 2026

_Research date 2026-08-07. Sources listed at the end. Figures are as published; treat pricing as
indicative since these vendors change tiers frequently._

## Market shape in one paragraph

Home services software is a proven, large, and rapidly consolidating market. ServiceTitan went
public and now runs **$727M revenue on $62B of gross transaction volume** — a 1.17% blended take
rate, of which **25% is usage-based fintech revenue**. Below it sit Jobber, Housecall Pro and
ServiceM8 fighting for the SMB contractor. Alongside them, a new class of AI-native entrants has
appeared in the last 18 months, at least one of which (**Avoca AI, $125M at a $1B valuation,
April 2026**) is already a unicorn. Meanwhile private equity has bought roughly **800 HVAC,
plumbing and electrical companies since 2022** and now accounts for about half of all HVAC
deals — which is quietly reshaping who the customer even is.

---

## Tier 1 — Enterprise

### ServiceTitan (NASDAQ: TTAN)

The reference model for what this market can become, and the clearest statement of where the
money actually is.

| | |
| --- | --- |
| Pricing | $245–500 per technician / month |
| Implementation | 6–8 weeks |
| Revenue | $727M on $62B GTV |
| Take rate | 1.17% blended; **usage-based is 25% of revenue** |
| Payments | ~0.25% of GTV as revenue; management says only **50% of take-rate opportunity is penetrated** |

**What to learn from it:** ServiceTitan is not really a software company — it's a payments
company with a workflow front-end. Software subscription is the wedge that earns the right to
sit in the money flow. Its own management frames fintech revenue as having room to double
without adding a single customer. Any serious plan in this market has to answer "how does money
flow through us," not just "what features do we ship."

**Not your competitor.** Different segment, different sales motion, 6–8 week implementations.

---

## Tier 2 — SMB incumbents

### Jobber

| Tier | Price | Users | Gates |
| --- | --- | --- | --- |
| Core | $24–49/mo | **1** | Quotes, invoicing, payments, booking, website builder |
| Connect | $80–199/mo | 5 | + automated reminders, **quote follow-up**, QuickBooks, time tracking |
| Grow | $120–299/mo | 10 | + visual quotes, upsells, **job costing**, **two-way SMS** |
| Plus | $320–499/mo | 15 | + **lead pipeline**, Marketing Suite, AI Receptionist |

Extra users $29/month. Marketing Suite +$79. AI Receptionist +$29–99.

**Strengths:** mature, broad, well-reviewed, strong onboarding, genuine time savings (users cite
~40 hours/month on paperwork).

**Weaknesses to attack:**
- **Per-seat pricing punishes growth.** A 5-person shop on Connect pays $199/month monthly.
- **The highest-ROI features are gated highest.** Automated quote follow-up — the single biggest
  revenue lever in the category — sits at $80+. Two-way SMS at $120+. Lead pipeline at $320+ or a
  $49 add-on.
- **Quoting is still manual template work.** No AI drafting.
- Contractors pay for a website builder and marketing suite they didn't want, to get quoting.

### Housecall Pro

| Tier | Price | Users |
| --- | --- | --- |
| Basic | $79/mo | 1 |
| Essentials | $189/mo | 5 |
| MAX | $329/mo | 8 |

**Moving fast in 2026.** Platform redesign in May (rebuilt mobile app, route-based scheduling,
job photo reporting). **Trade-specific packages for HVAC, plumbing and electrical launched July
2026**, including AI-driven pricing benchmarks for price book items. Also shipping Accountant AI
and CSR chat answering.

**Read this carefully:** Housecall Pro is executing the exact two strategies most available to a
newcomer — vertical specialisation and AI pricing intelligence — with far more resources and an
existing customer base. The window on "trade-specific + AI pricing" as a novel position is
closing.

### ServiceM8

~$29/month for 30 jobs, pay-as-you-go. Effectively a free tier for solo operators. Sets the price
floor and is the natural home for one-truck operations. Simpler and lighter than Housecall Pro.

---

## Tier 3 — AI-native entrants (the actual threat)

### QuoteIQ — read this section twice

**The product is not why they won.** Understand this before deciding anything.

| | |
| --- | --- |
| Founded | 2023, Savannah GA. Launched October 2023. |
| Funding | **Zero. Completely bootstrapped, no VC.** ~$30M valuation. |
| Users | **40,000+ across 50–100 trades** in under three years |
| Ratings | 4.7 iOS (2,900+ reviews) · 4.7 Android (1,100+) · 4.8 Google |
| Pricing | **$29.99/mo** (Essentials) → $74.99 → $149.99 → $299 → $699 |
| AI access | **Entire AI suite on every plan.** Tiers differ by "IQ Credits" and team features. |

**The founders:**

- **Mike Vidan** — 20+ years in service businesses, built seven-figure lawn care and pressure
  washing companies. **YouTube channel with 580,000+ subscribers** teaching contractors.
- **Justin Rogers** — pressure washing business owner, Facebook ads strategist for service
  businesses. **YouTube channel with 744,000+ subscribers and half a billion views.**

**Combined: ~1.3 million contractor subscribers and over a billion views — before they wrote a
line of code.**

Their own about page states the growth to 40,000 users came *"all through organic reach from
their YouTube channels, without spending a dollar on ads."*

**What this means:** QuoteIQ is a media business that sells software. Two contractors spent a
decade earning an audience, then launched a product into it at zero customer-acquisition cost.
The AI estimator is good, but it is not the reason they have 40,000 users — the audience is.

Any analysis that treats QuoteIQ as a product competitor is measuring the wrong thing.

**What it does:** upload up to 5 photos, describe the job by typing or voice, answer AI-generated
trade-specific questions, receive a line-itemed quote **priced from your own service catalog**
with local market analysis applied. Claims 4–7 minutes versus 20–34 manual.

Also bundles: AI CoPilot (in-document editing), AI Autopilot (35 CRM tools via conversation),
24/7 virtual call answering, before/after image generation.

**This is Rivet's stated wedge, already shipped, at a third of Jobber's price.** Rivet currently
does text-only input, no photos, no voice, and no market pricing layer.

**Weakness 1 — metered AI, and the meter is tight.**

Top-up packs are 2,500 credits for $25 up to 25,000 for $250 — so **1 credit = $0.01**. That
prices the included allowance:

| Plan | Price | Credits | Value at their own rate | As % of plan |
| --- | --- | --- | --- | --- |
| Essentials | $29.99 | 500 | $5.00 | 17% |
| Beginner | $74.99 | 1,500 | $15.00 | 20% |
| Pro | $149.99 | 3,000 | $30.00 | 20% |
| Elite | $299.00 | 5,000 | $50.00 | 17% |
| Max | $699.00 | 8,000 | $80.00 | 11% |

Every AI action displays its credit cost **before it runs** — which is the problem. The
contractor is asked to make a spending decision at the exact moment you want them forming a
habit. Run out and AI pauses until the next cycle; scheduling and invoicing keep working.
Credits don't roll over. The AI receptionist burns 125 credits per minute — **$1.25/minute**.

If an AI estimate costs ~50 credits, Essentials buys about **10 estimates a month**. At ~25
credits, about 20. Either way a contractor quoting daily will ration the headline feature or be
pushed up a tier — which is the design intent, and also the opening.

**Rivet's counter is cheap to offer.** Flash-class model calls for catalog-grounded quoting cost
cents per generation, so unlimited AI at $299/month costs a few dollars per customer per month
even under heavy use. QuoteIQ cannot match "unlimited" without dismantling a monetisation lever
built into all five of their tiers. Verify the current Gemini rates before publishing any
margin claim, but the direction is not close.

**Weakness 2 — their audience has a shape, and it isn't every contractor.** Both founders come
from pressure washing and lawn care; one channel is literally called *ForeverSelfEmployed*. That
audience is owner-operators and solo pros in low-ticket, high-volume trades. A 12-truck HVAC
company with a dispatcher and a service manager is not watching those channels, and $29.99
software with 100 trades' worth of surface area is not built for them.

**Weakness 3 — a mile wide.** 100+ trades, and modules spanning payroll, GPS, inventory, aerial
measurement, website building and an AI receptionist. Nothing at that surface area is deep. A
product built properly for one trade will beat it for that trade.

### How much is QuoteIQ actually making?

Estimated, not disclosed. The reasoning matters more than the number.

**Their pricing** (Feb 2026), flat-rate with no per-seat fees, 14-day trial, **no free tier**:

| Tier | Monthly | Annual (per mo) | Users | AI credits |
| --- | --- | --- | --- | --- |
| Essentials | $29.99 | $25.00 | 1 | 500 |
| Beginner | $74.99 | $62.50 | 2 | 1,500 |
| Pro | $149.99 | $125.00 | 4 | 3,000 |
| Elite | $299.00 | $249.00 | 10 | 5,000 |
| Max | $699.00 | $582.50 | Unlimited | 8,000 |

**"40,000+ users" is not 40,000 subscribers.** There is no free plan, so that figure is
cumulative signups including trials and churn. The sanity check proves it: 40,000 paying at a
blended ~$70/month would be **$33.6M ARR**, which against their cited ~$30M valuation implies
0.89x revenue — implausibly low for a fast-growing bootstrapped SaaS. The number is marketing.

**Blended ARPU:** weighting the mix toward the bottom (their audience is owner-operators and
solo pros) gives roughly **$70–84/month**, lower with annual billing.

**Working back from the ~$30M valuation:**

| Multiple | Implied ARR | Paying customers @ $70/mo | Trial→paid conversion |
| --- | --- | --- | --- |
| 4x | $7.5M | ~8,900 | 22% |
| 5x | $6.0M | ~7,100 | 18% |
| 6x | $5.0M | ~6,000 | 15% |
| 8x | $3.75M | ~4,500 | 11% |

**Best estimate: roughly $4–7M ARR, most likely around $5M, from ~5,000–8,000 paying customers.**
The implied 11–22% trial-to-paid conversion is normal for SMB SaaS, which is a good sign the
model hangs together.

Treat the $30M valuation with caution — there was no funding round, so it is self-reported or a
media estimate rather than a priced number.

### The conclusion that matters

**Two contractors with 1.3 million subscribers, working full-time for 2.5 years, built a ~$5M
ARR business.**

That is an excellent outcome, and it is also the ceiling evidence for the low-price end of this
market. With the best distribution anyone in this category has ever had, $29.99–$75 pricing gets
you to about $5M. Volume at low ARPU is capped, and it is a game that requires an audience to
play at all.

Compare the shapes:

| | QuoteIQ | Rivet's target |
| --- | --- | --- |
| ARPU | ~$70/mo | $299/mo |
| Customers for the goal | ~6,000 | **200** |
| Distribution required | 1.3M subscribers | ~200 referrals in one trade |
| Support model | Self-serve, must be | High-touch, can be |

**Rivet's customer-acquisition problem is roughly 30x smaller than QuoteIQ's was** — and QuoteIQ
had 1.3 million subscribers to solve theirs. That asymmetry is the entire case for going
upmarket rather than competing on price.

### xBuild

**$19M Series A, January 2026 (N47).** AI-native estimating, **roofing only.**

### Deep Lawn

From $95/month. AI quoting, **lawn care only.**

### Avoca AI

**$125M at a $1B valuation, April 2026 (Kleiner Perkins).** AI voice for home services — call
answering and intake. The missed-call category is now funded and consolidating.

### Handoff AI

From $149/month. AI estimating.

**The pattern that matters:** the funded AI-native players are winning by going *deep in one
trade* (xBuild roofing, Deep Lawn lawn) or *deep in one workflow* (Avoca calls) — not by being
"AI for field service." Breadth is where the incumbents already are.

---

## The economics nobody advertises

### Payments is the business model

ServiceTitan: 25% of revenue is usage-based, ~55bps on penetrated payment volume, only half the
opportunity captured. Analysts estimate platforms that successfully embed financial products
**multiply revenue per customer by 3–4x**.

Rivet already has Stripe Connect wired. That's the foundation; the question is volume.

### Consumer financing is the next attach

Wisetack (pay-over-time for in-person services) embeds into vertical SaaS by API. Jobber offers
it. ServiceTitan added Affirm BNPL in September 2025.

For HVAC this matters more than anywhere else: a $12,000 system replacement closes far more often
when the homeowner can be approved for monthly payments inside the quote. It raises the
contractor's close rate *and* their average ticket, and pays the platform a referral fee. It is
one of the few features that makes the contractor money rather than saving them time.

### The missed-call leak

- **20–30% of inbound calls to home services go unanswered**, rising to 40–50% at seasonal peaks.
- **85% of callers who reach voicemail never call back**; fewer than 3% leave a message.
- Average cost of a missed call: **$285+**, ranging $100–1,200 for high-ticket work.
- The industry loses roughly **$26B/year** to missed calls.

This is the largest single quantified revenue leak in the category — and it is why Avoca is worth
$1B. Capital-intensive and now crowded, but the number explains where attention is going.

---

## The structural shift: who the customer is becoming

- Private equity has acquired **~800 HVAC/plumbing/electrical companies since 2022**, about half
  of all HVAC-services deals, with **$50B+ deployed since 2018**.
- Active platforms: Apex Service Partners (Alpine), Wrench Group (Leonard Green), Sila Services
  (Goldman Sachs), ARS/Rescue Rooter (GI Partners), TurnPoint (OMERS), plus public strategic
  Comfort Systems USA. At least a dozen platforms competing for the same fragmented pool.
- **Silver tsunami:** 10,000 baby boomers retire daily; ~$10T in business assets change hands by
  2030. Trades have unusually high concentrations of retirement-age owners.
- Valuations: 4–8x EBITDA below $2M, **6–11x at $2M+ with strong recurring revenue**, platform
  recaps 17–20x.

Two consequences worth sitting with:

**1. Recurring revenue is worth real money to the owner.** Companies with 40%+ of revenue from
service agreements command **0.5–1.0x higher EBITDA multiples**. Target range is 30–50% recurring.
Each maintenance-agreement dollar generates $1–3 in additional pull-through work.

For a $2M EBITDA shop, moving from 20% to 40% recurring is worth roughly **$1–2M at exit**.
Software that provably drives maintenance-agreement attachment isn't a productivity tool — it's a
lever on the owner's largest financial event.

**2. Consolidators are an underserved buyer.** When a platform acquires 8–15 regional operators,
it must standardise pricing across all of them — PE platforms raise prices 10–15% post-acquisition
in non-competitive markets, and consistent flat-rate pricing is how that gets executed. Every
acquired shop arrives with its own price book in its own format. Nobody sells a tool for that
migration. The buyer list is roughly a dozen firms rather than 10,000 contractors.

---

## Where the gaps actually are

| Gap | Who has solved it |
| --- | --- |
| **Getting the price book in** — every platform makes the contractor build it manually | **Nobody.** QuoteIQ, Jobber, Housecall Pro all require manual setup. This is where onboarding dies. |
| Flat, unlimited AI pricing | Nobody. Jobber charges per seat; QuoteIQ meters credits. |
| Price-book standardisation across acquired shops | Nobody. |
| Positioning software on exit value rather than time saved | Nobody. |
| AI quote drafting | QuoteIQ (photos + voice), Housecall Pro (pricing benchmarks) |
| AI call answering | Avoca ($1B), QuoteIQ, Jobber Receptionist |
| Vertical depth | xBuild (roofing), Deep Lawn (lawn), Housecall Pro (HVAC/plumbing/electrical packages) |

---

## Honest assessment of Rivet's position

**What is genuinely competitive:** the quote-to-cash workflow is built and coherent; the unified
`work_items` model is cleaner than most; Stripe Connect is wired; the design is materially better
than the category norm, which is worth something in a market of cluttered software.

**What is not defensible:** "AI drafts the quote." QuoteIQ ships more of it for less. Housecall
Pro is adding pricing intelligence with a customer base to train on. This cannot be the moat.

**What is fatal right now:** no way to create a catalog item, so a new account cannot generate a
quote at all. See [PRODUCT_REVIEW.md](PRODUCT_REVIEW.md).

**The realistic read:** Rivet cannot win broad SMB field-service management on features. It is the
smallest and latest entrant in that box with no distribution. It can win a narrow, high-value
wedge — and the research points at three candidates, evaluated in
[STRATEGY.md](STRATEGY.md).

---

## Sources

- [Jobber features](https://www.getjobber.com/features/) · [Jobber pricing](https://www.getjobber.com/pricing/)
- [QuoteIQ AI Estimator](https://myquoteiq.com/ai-estimator/)
- [Housecall Pro trade-specific packages, July 2026](https://www.globenewswire.com/news-release/2026/07/15/3327769/0/en/housecall-pro-launches-trade-specific-software-packages-for-hvac-plumbing-and-electrical-businesses.html)
- [Housecall Pro platform redesign, May 2026](https://www.globenewswire.com/news-release/2026/05/27/3302009/0/en/Housecall-Pro-Unveils-Platform-Redesign-at-Built-to-Last-Spring-Summit-2026.html)
- [ServiceTitan S-1 breakdown — Meritech](https://www.meritechcapital.com/blog/servicetitan-s-1-breakdown)
- [ServiceTitan IPO analysis — Flagship Advisory](https://flagshipadvisorypartners.com/insights/attractive-field-services-vertical-propels-servicetitan-to-successful-ipo/)
- [Home services phone statistics](https://agentzap.ai/blog/home-services-phone-statistics) · [Missed call statistics 2026](https://thecontentlabs.ai/resources/missed-call-statistics-2026)
- [Embedded finance for vertical SaaS](https://www.apideck.com/blog/embedded-finance-vertical-saas) · [Wisetack interview](https://medium.com/@verticalsaas/consumer-lending-for-vertical-saas-an-interview-with-wisetack-ceo-bobby-tzekin-95e70c5a9cfc)
- [PE roll-ups in HVAC and plumbing](https://beancount.io/blog/2026/07/11/hvac-plumbing-private-equity-roll-up-guide) · [HVAC PE roll-up tracker 2026](https://dealseam.com/hvac-pe-rollup-tracker-2026)
- [HVAC valuation multiples 2026](https://www.breakwaterma.com/blog/hvac-business-valuation-multiples-2026) · [HVAC service agreement programs](https://fieldedge.com/blog/hvac-service-agreement-programs/)
- [Silver tsunami](https://www.clearlyacquired.com/blog/silver-tsunami-what-it-means-for-buyers)
