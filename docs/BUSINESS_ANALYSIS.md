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

## Customer acquisition — paid influencers

Acquisition is paid: trade creators promoting Rivet to their audience. That is the one real cost
in this model, and it dwarfs everything measured above. Infrastructure is $111 a month; acquiring
a single customer plausibly costs more than a year of it.

Two payment shapes, and they behave very differently.

### Model A — flat sponsorship, i.e. a cost per acquired customer

| CAC | Payback | LTV at 3%/mo churn | LTV:CAC | LTV at 5%/mo churn | LTV:CAC |
| --- | --- | --- | --- | --- | --- |
| $250 | 1.0 month | $8,041 | 32 | $4,825 | 19 |
| $500 | 2.1 months | $8,041 | 16 | $4,825 | 10 |
| $1,000 | 4.1 months | $8,041 | 8.0 | $4,825 | 4.8 |
| $2,000 | 8.3 months | $8,041 | 4.0 | $4,825 | 2.4 |
| $3,000 | 12.4 months | $8,041 | 2.7 | $4,825 | **1.6** |

The conventional bars are LTV:CAC above 3 and payback under 12 months. **Anything up to about
$2,000 per acquired customer clears both, even at 5% monthly churn.** That is an unusually wide
tolerance, and it is a direct consequence of the 97% margin — there is simply a lot of room
between $249 and what it costs to serve.

Read the bottom row as the warning: at $3,000 CAC and 5% churn the ratio collapses to 1.6 and the
business stops working. The variable that breaks it is churn, not price.

### Model B — affiliate revenue share, paid for as long as the customer stays

| Share | Contribution per month | Margin |
| --- | --- | --- |
| 10% | $216.34 | 86.9% |
| 20% | $191.44 | 76.9% |
| 30% | $166.54 | 66.9% |

A permanent 20–30% share still leaves a margin most software businesses would take. But it is a
permanent claim on revenue, and it converts a fixed acquisition cost into one that grows with
success.

**Prefer Model A where the creator will accept it.** A flat fee is bounded, it is cheapest exactly
when a campaign works well, and it does not encumber the revenue line if the business is ever
sold. Use revenue share only to get a creator to take a risk they otherwise would not — and cap
it in time, twelve months rather than for life, so a good customer stops paying rent forever.

### Breakeven, with acquisition included

Replacing churn is a permanent cost: at 3% monthly churn, a customer base of *N* needs 0.03 × *N*
new customers every month just to stand still.

| CAC | Customers to cover one full salary | Monthly churn-replacement spend |
| --- | --- | --- |
| $0 | 45 | — |
| $500 | **48** | $726 |
| $1,000 | **52** | $1,554 |
| $2,000 | **60** | $3,623 |

**Acquisition cost barely moves the breakeven point.** At $1,000 per customer it rises from 45 to
52. This is the clearest evidence that the model is sound: even expensive acquisition changes the
target by a seventh.

What it does change is **cash timing**. Forty-five customers at $1,000 CAC is $45,000 spent before
the revenue arrives, and at 4.1 months payback that money is out of the account for a third of a
year. With no funding round, the constraint is not whether influencer marketing pays — it is
whether there is cash to run it at any pace worth having.

### What to measure from the first campaign

- **Cost per signup and cost per paying customer**, separately. The gap between them is the
  onboarding conversion rate, and it is the number most likely to disappoint.
- **Churn by acquisition source.** Influencer-acquired customers frequently churn faster than
  referrals, and every figure above is far more sensitive to churn than to CAC.
- **Whether the audience is the buyer.** A creator's audience is often technicians; the buyer is
  the owner. That mismatch is the most common way trade-influencer spend produces attention and
  no revenue.

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
the business cannot fail on cost of service — and acquisition, the one real cost, barely moves
the breakeven point: 45 customers becomes 52 even at $1,000 per customer. It will succeed or fail on whether 45 trades
contractors can be found, sold and kept by two part-time people — and on whether they will pay
$249 for something no one has yet paid anything for.

The most valuable next action is not a feature. It is one contractor, paying, collecting through
Stripe, with the time from signup to first sent quote written down.
