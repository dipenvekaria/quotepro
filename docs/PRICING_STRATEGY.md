# Pricing strategy

Date: 2026-08-15
Status: Recommendation

Built on what is actually shipped, not on what is planned. `docs/STRATEGY.md` already argues for
charging more and serving fewer; this decides the specific numbers and, more importantly, what
each tier gates.

## The recommendation in one line

**One plan at $249/month, flat, whole team, unlimited AI — plus a $99 starter for solo operators
and a $499 tier when multi-crew scheduling lands.** No per-seat pricing at any tier, because that
is the thing every competitor does and the thing every customer complains about.

## What the shipped product actually justifies

Honest inventory, because a price has to be defensible against a demo.

**Strong enough to charge for today**

- AI quote drafting grounded in the contractor's own price book, which now asks a clarifying
  question rather than inventing a five-figure quote for work the catalog cannot cover
- Per-trade starter catalogs — 9,945 items across 100 trades — so a new account can quote on day
  one instead of spending a weekend typing a price book
- Price-book import from a scanned PDF, measured against a real Housecall Pro book: 45 items and
  the labour rates, extracted in about a minute
- Good/better/best in one action, where the competition makes you build three quotes by hand
- Public quote and invoice links with e-signature and Stripe payment, no customer login
- Scheduling where the block length comes from the catalog's own `labor_hours`
- QuickBooks-shaped exports for invoices, payments and customers

**Not yet true, and must not be sold**

- No live payment has ever been processed. Zero connected Stripe accounts in production.
- The e-signature path was broken until today and has never been run end to end against SignNow.
- No customer portal, no route optimisation, no marketing suite, no AI receptionist.
- Signup → first quote sent has never been measured, so the core activation claim is unproven.

That second list is why the answer is not "charge $299 immediately".

## What the competition charges, and where it hurts

| | Entry | Mid | Top |
| --- | --- | --- | --- |
| Jobber | $79 (1 user) | $189 (5) | $329 (8) |
| Housecall Pro | $24–49 (1) | $80–199 (5) | $320–499 (15) |
| ServiceTitan | — | — | $245–500 **per technician** |

Two structural weaknesses worth pricing against.

**Per-seat pricing punishes growth.** A five-person shop that hires a sixth technician gets a
bill increase for the privilege. Every contractor notices this, and it is the single most common
complaint about both platforms.

**The features that make money are held behind the top tiers.** Quote follow-up — the highest-ROI
lever in the category — sits at $80+ on Housecall Pro. Two-way SMS at $120+. Lead pipeline at
$320+ or a $49 add-on. A contractor pays three times to assemble what one job needs.

## The tiers

### Starter — $99/month, 1 user

For the solo operator, and deliberately not a good deal per feature. It exists to make $249 look
obvious and to catch the contractor who is not ready. Everything in the product except multi-user.

The trap to avoid: do not make this generous. Housecall Pro's $24 entry tier trains the market
that this software is cheap, and a cheap tool reads as unserious to someone running a $2M
business.

### Core — $249/month, whole team, unlimited AI ← **the plan**

Every feature. Every user. Unlimited quote drafting, tiers, catalog extraction, follow-ups.

$249 sits deliberately between Jobber's $189-for-5 and its $329-for-8. Against Jobber the pitch
is one sentence: *at six people you are already paying more, and you are still counting seats.*

The justification is not a feature list, it is arithmetic the contractor does instantly. An HVAC
average job is several thousand dollars. One extra job a year covers the subscription several
times over. Contractors do not buy on price — they buy on whether it makes or saves money.

### Scale — $499/month, when multi-crew lands

Not sellable yet. It becomes real when the calendar does crew or unit scheduling, which is the
feature already asked for: five units of three to five people. That is the natural boundary
between a shop and an operation, and it is a boundary the customer recognises rather than one
invented to segment them.

## What each tier gates, and what it must not

**Gate on scale, never on outcome.** Users, crews, locations — all fine. Nobody resents paying
more as they grow, as long as the growth is theirs.

**Never gate quote follow-up, AI drafting, or payment collection.** These are the features that
make the contractor money. Charging extra for the thing that pays for the subscription is what
makes Housecall Pro's tiering feel extractive, and copying it would forfeit the clearest
differentiator available.

**The white-label badge is the one legitimate cosmetic gate.** It costs nothing to give, it is
the most-requested white-label feature, and removing it feels like a real upgrade. It is already
implemented as a plan flag.

## Payments

Take a platform fee on card payments, which is already built (`STRIPE_PLATFORM_FEE_BPS`), and
keep it small — 0.5% or less on top of Stripe. Housecall Pro runs a 1.17% blended take rate on
$62B of volume, and that is where the real money in this category is. But it only becomes revenue
after contractors actually collect through the product, and today none do.

Do not discount the subscription in exchange for a higher take rate. It reads as a bargain and
converts a predictable line into one that moves with someone else's season.

## What would change this

**If signup → first quote is under five minutes**, that is the strongest pricing argument
available and it justifies holding at $249 with no discounting. It has never been measured, and
measuring it is cheap.

**If contractors keep asking for QuickBooks sync** rather than exports, that is a $499-tier
feature — it takes real work and is the kind of integration a larger shop pays to avoid doing by
hand.

**If nobody connects Stripe**, the payments take-rate strategy is theoretical and the
subscription has to carry everything alone. Watch that number before planning around it.

## What not to do

**Do not race to $29.99.** QuoteIQ is there. Low price demands volume, volume demands
distribution, and there is none.

**Do not price per technician.** It is ServiceTitan's model and it is why contractors describe
ServiceTitan as something they graduate into and resent.

**Do not offer an annual discount yet.** Annual prepayment hides churn for twelve months, and at
this stage churn is the most useful signal available.

**Do not launch with three tiers if only one is real.** Ship Starter and Core. Add Scale when the
feature that justifies it exists — a tier whose differentiator is a roadmap item teaches
customers that the pricing page is aspirational.
