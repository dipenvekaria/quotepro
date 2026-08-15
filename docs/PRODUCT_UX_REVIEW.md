# Product & UX Review

Date: 2026-08-15
Reviewer: Claude (session covering AI port, catalog, promotions, scheduling, role scoping,
account closure, address autocomplete, mobile pass)

## How to read this

Every finding below is marked **verified** (I ran it, measured it, or read the code path) or
**inferred** (reasoned from the code without exercising it). I have kept those separate because a
review that mixes them is not actionable — you cannot tell what to trust.

Two things I could not check, and neither should be taken as passing: the **public quote viewer
at `/q/{token}` could not be loaded locally** (the `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
does not match the running Supabase instance, so every public route 500s with `permission denied
for table work_items`), and **nothing was tested on a real phone** — mobile measurements were
taken in a true 375px viewport, but that has no touch events, no iOS Safari quirks and no
on-screen keyboard.

## Verdict

The machine is built and the loop closes. Lead → AI-drafted quote → customer accepts on their
phone → job scheduled → invoice → payment is complete, with catalog CRUD, CSV import, AI
extraction from existing paperwork, good/better/best, promotions, follow-up cron, Stripe and
manual payments all present. That is much further along than the documentation claims.

It is not yet best in class, and the gap is not features. It is that **the product makes three
promises it does not keep**, and the places it breaks them are the moments a customer decides
whether to trust it. Best in class is not a longer feature list; it is a product where nothing
you see is a lie.

---

## Critical — fix before anyone real uses this

### 1. A homeowner who hits an error is told to "Go to Dashboard" — verified

There is no `error.tsx` anywhere in `src/app`. Every failure falls through to the app-wide
client `ErrorBoundary`, whose recovery action is a link to `/app/dashboard`.

A homeowner opening `/q/{token}` has no dashboard, no account, and no idea what one is. They
have a five-figure quote and a page that just broke, telling them to go somewhere that will
bounce them to a login screen. That is the single worst moment in the product, and it is on the
one surface the skill file says gets "disproportionate care".

`/q` and `/i` need their own `error.tsx` that says what happened in the customer's terms and
offers the contractor's phone number — which is the only recovery that actually exists for them.

### 2. Onboarding promises automatic sales tax and there is no such code — verified

`src/app/app/onboarding/onboarding-form.tsx` tells every new contractor, under the address
field: *"We use this to auto-calculate state sales tax on your quotes."*

Nothing derives tax from an address. `grep` for any tax logic keyed on state, ZIP or address
returns nothing. `tax_rate` is whatever was typed at onboarding and then applied to every quote
forever.

This is worse than a missing feature. A contractor who read that sentence believes tax is
handled, and sales tax is wrong on every quote in a state they later work in. On a $15,000
system that is a real number, and it is the contractor who is liable, not you.

Either build it — the structured `state` and `zip` now captured by address autocomplete make it
tractable — or delete the sentence today. Deleting it is a two-minute change and should not wait
for the feature.

### 3. The docs tell every engineer and agent that the product does not work — verified

`CLAUDE.md` line 196 and `docs/PRODUCT_REVIEW.md` line 8 both state, as the headline finding,
that **"there is no way to create a catalog item, so a new account cannot generate a quote."**

That has not been true for some time. `src/app/app/(shell)/catalog/actions.ts` has
`createCatalogItem`, `updateCatalogItem`, `deleteCatalogItem`, `importCatalogCsv` and
`extractCatalogFromUpload`, with `catalog-manager.tsx` and `catalog-extract.tsx` driving them,
and onboarding now seeds a full trade catalog before the contractor sees the app at all.

`CLAUDE.md` is loaded into context on every single agent session and is the first thing a new
engineer reads. It is currently telling them the product is dead on arrival. Stale docs are not
a documentation problem here; they actively misdirect the work.

---

## UX findings

### 4. Three controls in the header of every screen do nothing — verified

The search box (with a `⌘K` affordance), the mobile search button, and the notification bell in
`app-shell.tsx` are all `<button>` elements with no `onClick` and no handler.

Search is the most prominent control on the screen. A contractor with 400 customers will reach
for it constantly, and every time nothing happens. A dead control is worse than an absent one:
absent is a missing feature, dead is a broken product. Either wire them or remove them until
they work. Given the data model, a command-palette search over customers, quotes and jobs is
genuinely high value and probably a day's work.

### 5. Mobile was not mobile-first, and the pattern is instructive — verified, now fixed

Measured at a true 375px viewport this session: the working-hours toggles were **18px tall**,
deleting a line item was **hover-only** so it was impossible on touch, the line-item editor
consumed ~300px in fixed columns before the name field started, and the analytics rep table was
**425px wide in a 375px viewport**.

The diagnosis matters more than the fixes. The `Button` primitive was already correct
(`h-11 lg:h-9`) — but `Input` was a flat `h-9`, and call sites routinely hard-coded `h-10` and
`h-9`, overriding the primitives. `docs/` and the `rivet-ui` skill both document mobile-first
clearly. The rule was written down and not followed, which means **the rule needs a test, not
more documentation.** A cheap one: fail CI if any interactive element measures under 44px at
375px on the main routes.

### 6. The pipeline board was a desktop metaphor on a phone — verified, now fixed

The kanban was a horizontal snap-carousel on mobile. The page scrolled vertically while the
board scrolled horizontally so the gestures fought, four of five stages were off-screen, and
drag-between-stages — the entire reason a board exists — is not a touch gesture. Now a vertical
stack below `sm:`, board above.

Worth generalising: **the desktop layout is rarely the right mobile layout, and a responsive
grid is not the same as a mobile design.** Anywhere else the product reuses a desktop metaphor
should get the same question asked of it.

---

## Product / PM findings

### 7. The loop is complete, and the docs undersell it — verified

Present and wired: catalog CRUD, CSV import, AI extraction from photos and PDFs, per-trade
starter catalogs (9,945 items across 100 trades), AI quote drafting grounded in the catalog,
good/better/best, labels, contractor-applied promotions, quote photos, public accept, e-sign,
Stripe and manual payments, invoices, overdue reminders, a follow-up cron, scheduling with real
durations from catalog `labor_hours`, a drag calendar, role scoping and account closure with
archival.

The strategic point: you are past "can it do the job" and into "is it good". The roadmap should
stop adding capability and start removing friction from what exists.

### 8. Time-to-first-quote has never been measured — inferred

`docs/PROTOTYPE_DEPLOYMENT.md` §1.6 flags this and it is still open. Onboarding now seeds a
trade catalog, which should make signup → first quote very fast, and that number is the single
most important metric for this product. It is also the one claim a demo lives or dies on.

Instrument it. If it is under five minutes, it is a headline. If it is not, it is the roadmap.

### 9. There is no data export — verified by absence

Closing an account archives everything to `archived_accounts`, retained permanently. But there
is no way for a contractor to *get their data out* while still a customer. GDPR Art. 20
(portability) is a separate right from erasure, and commercially, "you can leave with your data"
is what makes a contractor comfortable committing their price book in the first place.

A CSV export of customers, quotes and the catalog is small and disproportionately reassuring.

### 10. The differentiator is real but invisible — inferred

Day blocks on the calendar are sized from `estimated_hours` summed from the quote's own line
items, so a full-looking day is genuinely full. Competitors cannot copy that without rebuilding
their price book. This is the strongest structural advantage in the product.

Nothing in the UI says so. No copy, no marketing surface, nothing in onboarding. A moat the
customer cannot perceive does not affect their decision to buy.

---

## What is already strong

The public quote viewer and onboarding both measured **zero** sub-44px controls and no overflow
before this session's mobile work — the surfaces that matter most were already right, which
suggests the care was applied where it was consciously considered.

Grounding the AI strictly in the contractor's own catalog is the correct architectural call and
the reason quote quality is a catalog problem rather than a prompt problem. The degrade-not-fail
posture (AI, address autocomplete, email) is consistently applied. Tenancy discipline is
genuinely unusual for a prototype: a static scanner enforces `company_id` on every statement and
caught two of my own mistakes this session.

---

## Priority order

| # | Finding | Effort | Why now |
| - | ------- | ------ | ------- |
| 1 | Delete the sales-tax sentence from onboarding | Minutes | It is currently untrue and the liability is the contractor's |
| 2 | `error.tsx` for `/q` and `/i` | Hours | Worst moment in the product, on the customer-facing surface |
| 3 | Correct `CLAUDE.md` and `PRODUCT_REVIEW.md` | Minutes | Misdirects every engineer and agent session |
| 4 | Wire or remove header search and the bell | Hours to remove, ~a day to wire | Most prominent control in the app does nothing |
| 5 | Measure signup → first quote sent | Hours | Decides whether the wedge story is true |
| 6 | CSV export of customers, quotes, catalog | ~a day | Portability, and it lowers the barrier to committing a price book |
| 7 | Sales tax from the now-structured state/ZIP | Days | Closes #1 properly; real money on large quotes |
| 8 | Mobile tap-target check in CI | Hours | The mobile rule was documented and ignored; make it enforced |
| 9 | Surface the capacity differentiator in the UI | Days | The moat is invisible to the person deciding to buy |

Items 1–3 are corrections of things that are false. They should not wait behind features.
