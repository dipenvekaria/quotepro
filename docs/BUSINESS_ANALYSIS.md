# Business analysis — viability and breakeven

Date: 2026-08-15
Prices assumed at $249/month per `docs/PRICING_STRATEGY.md`.

Unit costs are measured against the running system, not estimated. Vendor list prices are marked
as assumptions and should be re-checked before anything is decided on them.

## a) Is it viable?

**Yes on the economics, and the economics are not the risk.** The uncomfortable finding is that
this business is not constrained by cost, price or margin. It is constrained by whether two
part-time people can find and keep customers.

### The unit economics are close to perfect

Measured, not modelled. A quote draft against a real catalog:

| | measured |
| --- | --- |
| Prompt tokens (40-item catalog) | 1,104 |
| Output tokens | 316 |
| Cost per AI quote draft | **$0.00035** |
| At 200 quotes/month | **$0.07 per customer per month** |
| One-off price-book extraction (pro, 41 scanned pages) | ~$0.83 per contractor, once |
| Storage per work item, all ten indexes | 571 bytes → 3M rows ≈ 1.7 GB |

Everything variable — AI, storage, email, address lookups — comes to roughly **$0.24 per customer
per month**. Against $249 that is a rounding error.

| | |
| --- | --- |
| Price | $249 |
| Less Stripe (2.9% + 30¢) | $241.48 |
| Less all variable cost | **$241.24 contribution** |
| **Gross margin** | **96.9%** |

The AI, which intuitively feels like the expensive part, costs about **three hundredths of one
percent** of the subscription. Any instinct to economise on model choice for cost reasons is
misplaced — that is why using `pro` for catalog extraction was the right call at 45 items versus
21, and why using `flash-lite` for drafting is about latency, not money.

### Fixed costs are trivial

| | monthly (assumed list prices) |
| --- | --- |
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Resend | $20 |
| Google Cloud (Vertex, Places) | $10 |
| Sentry | $26 |
| Domain, misc | $10 |
| **Total** | **≈$111** |

**Half a customer covers the entire infrastructure.** There is no scale threshold to reach before
the software pays for itself.

### So what is the actual risk?

Not viability. Three things, in order:

1. **Nobody has paid yet.** Zero connected Stripe accounts in production, and no live payment has
   ever been processed. Every number above is a projection onto a product with no revenue.
2. **Distribution.** At $249 you need ~45 customers to replace one salary. Finding 45 contractors
   who will pay that is a sales problem, and there is no sales motion, no marketing site traffic
   and no channel described anywhere in the docs.
3. **Time.** A two-person part-time team is the binding constraint on both building and
   supporting. This is exactly why `STRATEGY.md` argues for charging more and serving fewer, and
   the maths below confirms it.

## b) Breakeven

"Breakeven" means different things here, and only one of them matters.

| Against | Customers | Equivalent ARR |
| --- | --- | --- |
| Infrastructure only | **1** | $3k |
| Infrastructure + one part-time salary ($60k) | **21** | $63k |
| Infrastructure + one full salary ($130k loaded) | **45** | $134k |
| Infrastructure + two full salaries | **90** | $269k |
| `STRATEGY.md` target of $600k ARR | **200** | $598k |

### The number to hold in your head is 45

**45 customers replaces one full income.** That is the point at which this stops being a side
project and becomes someone's job. It is also small enough to be reachable without a funding
round, a sales team or a marketing budget — which is precisely the shape of business
`STRATEGY.md` argues for.

At 45 customers:
- $134k ARR, ~$130k gross profit
- Infrastructure is $111/month, or 0.1% of revenue
- Support is the real load: 45 contractors calling one part-time person

### Why the price matters more than anything else

Same 45 customers, at different prices:

| Price | ARR at 45 customers | Customers needed for $134k |
| --- | --- | --- |
| $99 | $53k | **113** |
| $199 | $107k | 56 |
| **$249** | **$134k** | **45** |
| $299 | $161k | 37 |

Dropping to $99 nearly triples the customer count for the same income — and triples the support
load, the onboarding hours and the churn surface, for a two-person team. **Price is not a
marketing decision here; it decides whether the business is operable.**

## What would change this analysis

**A live payment.** Everything above assumes contractors will pay $249. Nothing has tested that.
One paying customer is worth more than any further modelling.

**Time-to-first-quote.** Still unmeasured. If it is under five minutes, that is the strongest
argument for the price and the shortest path to a sales pitch. If it is thirty, the onboarding
burden lands on the two people who are the constraint.

**Churn.** Not observable yet, and it is the number that decides whether 45 customers is a
plateau or a floor. At $249, losing three customers a month means acquiring three just to stand
still.

**Payments take-rate.** `STRATEGY.md` notes Housecall Pro runs 1.17% on $62B of volume — the real
money in this category. At 45 contractors doing $500k of annual volume each, a 0.5% take is
$112k a year, comparable to the entire subscription line. **That only exists once contractors
collect through the product, and today none do.** It is the largest unmodelled upside here and
the one most worth proving early.

## The honest summary

The economics are excellent and largely irrelevant. At 97% gross margin with $111 of fixed cost,
the business cannot fail for cost reasons. It will succeed or fail on whether 45 trades
contractors can be found, sold and kept by two part-time people — and on whether they will pay
$249 for something no one has yet paid anything for.

The most valuable next action is not a feature. It is one contractor, paying, collecting through
Stripe, with the time from signup to first sent quote written down.
