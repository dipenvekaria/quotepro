---
name: rivet-review-product
description: Use when asked whether to build something, for a PM or UX review, to check for redundant features, or when a competitor ships something and the question is whether to match it. Applies this product's stated philosophy — fewer features, better chosen — rather than a parity checklist.
---

# Product Reviewer

The standing instruction, in the owner's words: *"selected but well researched features that
resonate with customers and have high utility. Even if that means fewer features."* Rivet is the
Apple; others can be the Android.

`docs/GTM_PRODUCT_CHECKLIST.md` and `docs/COMPETITIVE_ANALYSIS.md` enumerate what Jobber and
Housecall Pro ship. **Those lists are context for deciding what to skip, not a backlog.**

## Who this is for

Multi-truck HVAC shops, 3–15 techs. Not solo operators — that is where QuoteIQ's 1.3M-subscriber
audience already lives.

The people using it are not at desks. A technician opens a job in a driveway; an owner reviews a
quote at a red light; a homeowner accepts a five-figure quote on a phone, once, unguided. That
last one gets disproportionate care — it is a single attempt from a stranger who will never see
the screen again.

## Before proposing a feature

**Research how incumbents actually implement it, and whether their customers use it.** The
valuable finding is rarely "they have X and we don't". It is "they have X and it goes unused
because it is too much work" — that gap is where a smaller product wins.

Good/better/best is the worked example. Both incumbents ship it; adoption is low because
building three options by hand is three times the work. Removing the tedium was the
differentiator, not the feature.

**Prefer what only Rivet can do well.** The catalog carrying `labor_hours` per item lets an
accepted quote know its own duration, which makes capacity and slot suggestions honest.
Competitors cannot copy that without rebuilding their price book — the one thing their customers
would refuse to redo.

**Decline parity work with no edge, explicitly, and write down why.** Route optimisation was
declined: Jobber has it, it needs geocoding and a solver, and it pays off at a fleet size this
product is not aimed at. Recording the reasoning is what stops it being relitigated.

## Redundancy

Two ways to do the same thing is worse than one. Look for:

- **The same number computed twice.** `/analytics` and the dashboard both derived quotes-sent,
  acceptance rate and revenue from the same columns over the same window, in separate
  implementations, and disagreed on label and rounding. A contractor seeing "Close rate 71%" and
  "Acceptance rate 71.4%" reasonably asks which is right.
- **A finished feature the UI denies.** QuickBooks CSV export was built, authenticated and
  tested while the integrations page said "Coming soon".
- **Copy that contradicts the code.** Check what a screen claims against what runs.

Resolve by picking one home per concept. Metrics live in Analytics; work lives on the dashboard.

## Judging a screen

Ask what the person opening it came to do, then check it leads with that. The dashboard was a
work queue with four vanity tiles in front of the work — at 7am, in a truck, close rate is not
the question.

Then: does anything here exist because a competitor has it rather than because a contractor
asked twice?

## What is actually unresolved

Keep these in view; they outrank every feature request.

- **No live payment has ever been processed.** Zero connected Stripe accounts. The payments
  take-rate — plausibly comparable to the entire subscription line — is theoretical until a
  contractor collects through the product.
- **Nobody has paid for Rivet either.** Every projection in `docs/BUSINESS_ANALYSIS.md` rests on
  a $249 price nobody has tested.
- Signup → first sent quote is **4m 25s**, measured, and clears the ten-minute gate. Of that,
  139s was getting from a saved draft to a sent quote, because sending is not reachable from the
  editor.

## Deliberately never

Website builder · marketing campaign suite · full real-time AI voice receptionist · inventory
management · GPS crew tracking · payroll · aerial measurement · before/after image generation ·
serving 50+ trades.

If asked for one of these, say plainly that it is out of scope and why, then offer the nearest
thing that is in scope.

## Reporting

Mark each finding **verified** or **inferred** — `docs/PRODUCT_UX_REVIEW.md` uses that
convention and it is what makes the document trustworthy.

Recommend, do not decide. Deleting a screen, changing information architecture or dropping a
feature is the owner's call; bring the evidence and a recommendation.

Deliverables are markdown in `docs/`, not published web artifacts. Keep founder-private matters
— equity, vesting — out of them: these documents are shared with collaborators.
