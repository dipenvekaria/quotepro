# Feature Strategy — v1 vs Housecall Pro

_2026-08-14. Written to decide what v1 contains, and — more importantly — what it does not._

Housecall Pro advertises roughly **forty features**. This document exists because matching that
list is the failure mode `docs/STRATEGY.md` names explicitly: *you will not get there, and it is
not what wins.*

The working principle is fewer features, better chosen. Their feature list is context for
deciding what to skip.

---

## 1. Where Rivet stands against Housecall Pro

Their surface area, honestly compared. ✅ shipped, 🟡 partial, ❌ absent.

### Quote to cash — the core loop

| Capability | HCP | Rivet | Verdict |
| --- | --- | --- | --- |
| Estimates / quotes | ✅ | ✅ | Parity |
| **AI-drafted quotes from your own catalog** | ❌ | ✅ | **We win** |
| **Catalog built by AI from your paperwork** | ❌ | ✅ | **We win** |
| Price book | ✅ | ✅ | Parity |
| Public quote viewer, no login | ✅ | ✅ | Parity |
| Customer accepts online | ✅ | ✅ | Parity |
| Good/better/best options | ✅ Sales Proposal Tool | ❌ schema only | **Gap — build** |
| Photos on quotes | ✅ | ❌ | Gap — build |
| Invoicing | ✅ | ✅ | Parity |
| Online payment | ✅ | ✅ | Parity |
| Card reader (in person) | ✅ | ❌ | Skip for v1 |
| Consumer financing | ✅ | ❌ | Later — high value |
| Instant payout (30 min) | ✅ Instapay | ❌ | Skip |

### Scheduling

| Capability | HCP | Rivet | Verdict |
| --- | --- | --- | --- |
| Calendar + scheduling | ✅ | ✅ | Parity |
| **Duration derived from the quote** | ❌ | ✅ | **We win** |
| **Slot suggestions that fit the job** | ❌ | ✅ | **We win** |
| Drag-and-drop calendar | ✅ | ❌ | Gap — build |
| Route optimisation / GPS | ✅ | ❌ | **Deliberately skip** |
| Dispatch board, live tech tracking | ✅ | ❌ | Skip for v1 |

### Everything else they sell

| Capability | HCP | Rivet | Verdict |
| --- | --- | --- | --- |
| Automated quote follow-up | ✅ | ✅ | Parity |
| Review management | ✅ | ❌ | Later — real revenue |
| Online booking (24/7) | ✅ | ❌ | Later |
| "On my way" texts | ✅ | ❌ | Cheap, high perceived value |
| Email/SMS campaigns | ✅ | ❌ | Skip |
| **Direct mail postcards** | ✅ | ❌ | **Never** |
| Built-in VoIP / call answering | ✅ | ❌ | Skip — see ADR 0007 |
| CSR AI answering calls 24/7 | ✅ | ❌ | Skip |
| Websites for contractors | ✅ | ❌ | **Never** |
| QuickBooks sync | ✅ | ❌ | Later — will cost deals |
| Payroll, time tracking, job costing | ✅ | ❌ | Skip |
| Recurring service plans | ✅ | ❌ | Later |
| Reporting dashboards | ✅ | 🟡 analytics | Adequate |

**The honest read.** They beat us comprehensively on breadth. We beat them on exactly one axis —
*the quote is intelligent because the catalog is structured* — and that axis is the one they
cannot copy without rebuilding their price book, which is the one thing their customers would
refuse to redo.

---

## 2. What v1 should contain

Four things. Each either extends the axis we already win on, or removes a reason to say no.

### 2.1 Good/better/best — the highest-value gap

Both HCP and Jobber ship it, and HCP's framing is the sharpest articulation of why it works: it
*"shifts the conversation from whether to proceed to which version to proceed with."* Jobber
gates it at their $120/month tier.

**But adoption is low everywhere, because building three options by hand is three times the
work.** That is the gap. Rivet already generates one grounded quote; generating three costs the
contractor nothing.

How to be better than HCP:

- **Generated, not authored.** One description in, three tiers out, all grounded in the catalog
  with the same reconciliation that stops the model inventing a price.
- **Middle tier recommended by default.** A choice between three, not a yes/no on one.
- **Show what changes between tiers**, not three opaque totals. The customer should see that
  Complete adds a warranty and a surge protector.

Schema already exists and is completely unused: `quote_options` (tier, name, description, total,
is_selected) and `quote_items.option_tier`.

### 2.2 Photos on quotes

Table stakes, and cheap. HCP explicitly sells "estimates with photos to improve conversion."
For a homeowner deciding on a five-figure job, a photo of *their* failing unit is worth more
than any amount of copy.

Ours should differ in one way: photos attach to **line items**, not just the quote. "This is the
compressor we're replacing" next to the compressor line.

### 2.3 Drag-and-drop calendar

The one scheduling gap that matters. We have something better underneath — real durations — but
a contractor moving a job expects to drag it. Blocks sized to actual estimated hours will look
correct in a way theirs cannot, because theirs are guesses.

### 2.4 Trade tools

Section 4. This is the differentiator.

---

## 3. What to deliberately skip, and why

Recording these so they are not relitigated every time someone reads a competitor's page.

**Route optimisation.** Jobber has it, HCP doesn't. Needs geocoding and a solver, and pays off at
5+ trucks. Our wedge is smaller shops.

**VoIP, call answering, CSR AI.** A phone system is a different business. ADR 0007 already
settled the integration approach.

**Websites and direct mail.** These are agency services with software attached. They fit HCP's
200K-user scale and they would define Rivet as something it is not.

**Payroll, time tracking, job costing.** Real work, no edge, and it competes with QuickBooks
rather than integrating with it.

**Instant payout.** A financing product, not a feature.

---

## 4. The Tools section — the actual differentiator

**The idea:** a Tools area holding small, high-utility programs specific to the contractor's
trade. A roofer sees satellite roof measurement. An HVAC contractor sees a Manual J load
calculation. A plumber sees pipe sizing. **Nobody sees another trade's tools.**

This is the mechanism for `STRATEGY.md`'s Lever 4 — *be obviously built for one trade* — and we
now have the thing that makes it possible: `companies.trade`, set at onboarding, already used to
scope the catalog.

### Why this is strong

**Horizontal software feels bloated to every individual user.** HCP shows forty features to
everyone, so a two-truck roofer wades past payroll and VoIP to reach the four things they need.
Trade-gating inverts that: the same product feels custom-built. This is the Apple position
applied to a vertical.

**It is defensible.** HCP cannot ship roof measurement without cluttering every plumber's
screen, and their scale means every feature must serve 50+ trades to be worth building. Being
small is the advantage.

**It compounds with what exists.** `companies.trade` is already set and already scopes the
catalog. Tools are one more consumer of it.

### The part that makes it more than a calculator

Every calculator on the market is a **dead end**. You get a number, you read it, you type it
somewhere else. A search for these turns up dozens: [ServiceTitan's Manual J
tool](https://www.servicetitan.com/tools/hvac-load-calculator), FieldPromax's, FieldCamp's —
all free, all lead magnets, all terminating in a number on a screen.

**A Rivet tool outputs into the quote.** Measure a roof, get 32 squares, and it becomes the
quantity on a per-square catalog line — priced at the contractor's own rate, with labour hours,
which then feeds the scheduler's duration estimate.

Tool → quantity → priced line → job duration → calendar slot. Nobody else can close that loop,
because nobody else has a catalog that carries `unit` and `labor_hours` per item.

**That is the pitch:** *"Measure the roof, and the quote writes itself."*

### First tools, in build order

**1. Satellite area measurement.** One engine, four trades: roofing, landscaping, paving,
fencing. Highest leverage build available.

The market proves demand and price tolerance: [Roofr charges $13–19 per
report](https://roofingsoftwareguide.com/comparisons/roofr-vs-eagleview/), [EagleView $15–87 and
claims 98.77% accuracy](https://roofingsoftwareguide.com/reviews/eagleview-review/), and
[Hover relaunched in January 2026 at $99/month plus per-scan
fees](https://roofingsoftwareguide.com/comparisons/eagleview-vs-hover/). Contractors already pay
per measurement. Bundling it flat is both a better deal and a marketing weapon — it fits
`GTM_PRODUCT_CHECKLIST.md` §4.2 exactly.

Build vs buy: integrate first. Roof geometry from imagery is a hard computer-vision problem and
EagleView has spent a decade on it. Wrapping a provider and feeding the result into the quote is
the differentiated part; re-deriving their measurements is not.

**2. Manual J load calculation (HVAC).** The strongest utility of any tool on this list, because
[ACCA Manual J 8th Edition is ANSI-recognised and required by the IRC, IECC and California Title
24 before a mechanical permit is issued](https://www.servicetitan.com/tools/hvac-load-calculator).
It is not a convenience — it is a compliance step the contractor must complete anyway.

Ours should end by sizing the equipment *from their catalog* and putting it on the quote.

**3. Trade calculators.** Cheap to build, genuinely used: voltage drop and conduit fill
(electrical), pipe and water-heater sizing (plumbing), paint coverage (painting).

Individually small. Collectively they are the reason a contractor says *"this was built for
me."*

### Scope discipline

Ship **one** tool for **one** trade first, end to end, including the flow into the quote. Sell it
to roofers. If it works, the pattern extends to a second trade cheaply. Six half-tools across
six trades is exactly the breadth-over-depth mistake this document exists to avoid.

---

## 5. Recommended order

1. **Good/better/best** — largest revenue lever, schema exists, extends our winning axis
2. **Photos on quotes** — table stakes, cheap, real conversion effect
3. **Tools: satellite measurement for roofing** — the differentiator, end to end into the quote
4. **Drag-and-drop calendar** — parity, made better by real durations
5. **Manual J for HVAC** — second trade, proves the Tools pattern generalises

Then stop and sell. `STRATEGY.md`: ten paying customers, and build only what those ten ask for
twice.
