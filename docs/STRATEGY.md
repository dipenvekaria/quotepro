# Strategy — How Rivet Wins

_2026-08-07. Written against the research in [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md)
and the product state in [PRODUCT_REVIEW.md](PRODUCT_REVIEW.md)._

**Our constraints:** a two-person team working part-time, a small budget, no distribution, and a
handful of contractors we can call for feedback. **We are building a profitable, independent
business — not raising venture capital.**

Those constraints are not a footnote — they determine the answer. Most of what the research turns
up is unavailable to a team this size, and pretending otherwise wastes the budget.

One distinction to hold onto throughout: **a few contractors we can call is validation access,
not distribution.** It is enough to find out whether a wedge is real, which is worth more than
anything else we have. It is not enough to build a business on — five friendly contractors will
not become 500 customers, and treating early enthusiasm from people who know us as market demand
is the most common way this goes wrong. Use them to learn, not to project.

---

## 1. What the constraints rule out

Being direct, because each of these is a plausible-sounding plan that would fail from here.

**Selling to PE consolidators.** The most interesting gap in the research — roughly a dozen
platforms rolling up ~800 shops since 2022, all facing a price-book standardisation problem
nobody serves. It needs warm introductions to private equity operating partners, six-month
enterprise sales cycles, and a track record. A few contractor friends is the wrong kind of access
for this — it validates a product, it doesn't open an institutional door. Genuinely good idea,
wrong founders for it today.

**Competing on AI voice / missed calls.** $26B/year leak, the biggest quantified pain in the
category. Avoca raised $125M at a $1B valuation in April. Not enterable at our scale.

**Payments or fintech as the moat.** This is how ServiceTitan actually makes money — 25% of
revenue, ~55bps on volume. But a take rate on payments only matters at volume. At 20 customers
it's a rounding error. It's an outcome of scale, not a path to it.

**A pricing-data network effect.** Real, defensible, and exactly what Housecall Pro is starting
to build. It requires thousands of contractors first. Chicken and egg, and we don't have the egg.

**Venture money at all.** We are building a profitable independent company, and raising forecloses
that — see §2. This one isn't ruled out by our constraints; it's ruled out by the kind of company
we want, which is a better reason.

### The one real risk we are choosing to accept

Not ruled out — but eyes open, because it's the thing most likely to kill this.

A contractor moving to Rivet is handing over their money, their schedule and their customer list
to software built by two people they don't know, working evenings. Jobber has thousands of
reviews and years of operating history. That is a trust gap, not a feature gap, and no amount of
building closes it.

**What makes it survivable is your warm introductions.** Trust transfers through referral in the
trades far more than through marketing. Ten contractors who will take a phone call from a
prospect is worth more than any feature you could ship. That is why §6 ends with "get ten
customers and turn them into references" rather than "launch."

Treat referenceability as a product requirement, not a marketing afterthought.

---

## 2. The business model

We are building a profitable independent company rather than chasing scale. Three consequences
follow, and two of them contradict conventional startup advice.

### Do not raise venture money

This is the most important structural decision in the document, and it's easy to get wrong
because raising feels like progress.

A seed round forecloses the outcome we actually want. Investors underwrite a $100M+ outcome; a
modest sale returns nothing to a fund and they will block it. Liquidation preferences mean that in
a small exit, preferred shareholders are paid first.

Bootstrapping keeps every option open: sell small, sell large, or never sell and take the profit.
Raising keeps exactly one.

A small budget and part-time hours are enough to find out whether this works. Keep it that way
until the answer is yes.

### The revenue math

Customers needed to reach a given ARR, by price point:

| ARR | at $99/mo | at $199/mo | at $299/mo |
| --- | --- | --- | --- |
| $300K | 250 | 125 | 84 |
| $600K | 500 | 250 | **168** |
| $1M | 840 | 420 | 280 |

**Read the right-hand column.** $600K ARR is 500 customers at $99 or **168 at $299**. Same
revenue, a third of the support load, a third of the churn surface, a third of the onboarding.

For a two-person part-time team that difference is not an optimisation — it decides whether the
business is operable at all. Small vertical SaaS is typically valued at 3–6x ARR, so the same
revenue also builds the same asset either way.

### So: charge more, serve fewer

Price at **$199–299/month, flat, whole team, unlimited AI** — not $99.

The justification is easy: an HVAC contractor's average job is several thousand dollars. If the
software wins them one extra job a year it has paid for itself many times over. Contractors do
not buy on price; they buy on whether it makes or saves them money, and cheap software reads as
unserious to someone running a $2M business.

Racing QuoteIQ to $29.99 is unwinnable — low price demands volume, and volume demands
distribution we do not have. Competing at $299 against Jobber's $199-for-5-users, with flat
pricing and no per-seat maths, is a fight we can win.

### Who buys you

Worth knowing early, because it shapes what you build. This market has real acquirers: Jobber,
Housecall Pro, ServiceTitan (public and acquisitive), FieldPulse, plus the PE platforms rolling
up the trades. They buy niche tools with genuine usage to fill product gaps.

Building for acquisition means: one thing done exceptionally well, clean recurring revenue, low
churn, and **not being dependent on any one person**. It does not mean building a broad platform
— a broad, mediocre platform is the least acquirable thing we could make, because every potential
buyer already has one.

**Realistic timeline: 3–5 years**, which is another argument for a product with a low support
burden.

---
## 3. The decision: build Rivet

You considered the utility wedge and rejected it, correctly. Recording why, so nobody
relitigates it in three months:

**Document extraction is commoditised.** Anyone can upload a PDF to ChatGPT and get structured
data back. There is no defensible technology there, and foundation models keep eating that layer.

**And the deeper flaw:** a one-time extraction tool has no recurring revenue and no retention,
which contradicts the whole $199–299/month model in §2. It could not have become the business the
math describes.

So: **Rivet stays a platform.** That decision brings back one real risk from §1 — a contractor
switching their business onto software from two unknown people. But you have warm introductions,
and warm intros are exactly how the first ten customers of every vertical SaaS company are won.
The trust problem is solved by references, not by product. Ten happy contractors who will take a
phone call from a prospect *is* the moat, early on.

### What this means you're accepting

You are entering a market with four funded incumbents and choosing to compete on execution rather
than novelty. That's a legitimate strategy — Jobber isn't novel, Housecall Pro isn't novel. They
won on focus and execution. But it sets the bar:

> **You cannot out-feature them. You have to out-focus them.**

Jobber has hundreds of features and most are mediocre. Rivet should have thirty and all of them
should be excellent. Every hour spent adding surface area is an hour not spent making the core
loop faster than anything else on the market.

---

## 3b. What you cannot beat QuoteIQ at

You asked the right question. Here is the honest answer, and it has nothing to do with features.

**QuoteIQ's founders had ~1.3 million YouTube subscribers before they wrote any code.** Mike
Vidan (580K subs, 20 years in the trades, seven-figure lawn care and pressure washing companies)
and Justin Rogers (744K subs, half a billion views, Facebook ads strategist). They launched in
October 2023 and reached 40,000 users **with zero venture capital and zero ad spend** — entirely
organic reach into an audience they had spent a decade building.

So the four things you cannot out-build:

1. **Their distribution.** 1.3M contractors who already trust them. They ship a feature and
   announce it to an audience at no cost. We have no list and no ad budget. This is not a gap
   closed with product.
2. **Their credibility.** They *are* contractors — two decades in the field. In the trades that
   is worth more than any feature, and you cannot acquire it. When Mike Vidan says software is
   good, contractors believe him because he ran their business.
3. **Feature surface at $29.99.** 40,000 users amortises development across a base you don't
   have. They ship payroll, GPS, inventory, aerial measurement, an AI receptionist and a website
   builder at that price. You cannot match that breadth, and **you should stop trying** — see §5.
4. **Pace.** A full-time company versus two people on evenings. On any race where the finish line
   is "more features," you lose by default.

### Why this is survivable anyway

**They have 40,000 users. You need 200.**

That's the whole reframe. $600K ARR at $299/month is 200 contractors. You are not competing for
QuoteIQ's market — you need 0.5% of the number of customers they already have, from a segment
their audience doesn't reach.

Three places their distribution does not go:

- **Bigger shops.** Both founders come from pressure washing and lawn care; one channel is
  literally *ForeverSelfEmployed*. That audience is solo operators and owner-operators in
  low-ticket, high-volume trades. A 12-truck HVAC company with a dispatcher and a service manager
  is not watching those channels.
- **High-ticket trades.** $29.99 software built for 100 trades is not designed for someone
  quoting $15,000 system replacements.
- **Anywhere local.** Their reach is national and thin. A metro area worked through referrals is
  invisible to them and completely winnable.

### The one advantage you have that they structurally cannot copy

**You can be high-touch. They cannot.**

At 200 customers you can personally onboard every single one — set up their catalog, sit with
them on their first quote, answer the phone when they call. A bootstrapped company with 40,000
users at $29.99 physically cannot do that; their economics forbid it.

For a contractor deciding whether to trust software with their business, "the founder set it up
with me and answers my texts" beats any feature list. It is also exactly the thing that produces
the references that solve your trust problem.

So the strategy is not to out-build QuoteIQ. It is to be **narrow, deep, higher-priced and
high-touch** in a segment their audience doesn't reach — and to accept that 200 customers is a
completely different goal from 40,000.

---

## 4. How Rivet actually wins

Four levers. In order of how much they matter.

### Lever 1 — Make the contractor money, don't save them time

Every competitor sells time savings. It's a weak pitch: contractors are busy but they're not
paying $300/month to reclaim an evening. They will pay for revenue.

Three features do this directly, and Jobber gates all three behind $80–120/month tiers:

- **Automated quote follow-up.** The single largest revenue lever in the category. A quote sent
  and never chased is a lost job. You already have `sent_at`, `viewed_at`, `accepted_at` and a
  working reminder path in `src/features/invoices/reminders.ts` to copy.
- **Good/better/best options.** Tiered quotes raise average ticket — the oldest trick in the
  trades. `quote_options` is already in the schema with a `tier` column and no UI.
- **Consumer financing at quote time.** For HVAC this is the biggest one. A $12,000 system
  replacement closes far more often when the homeowner can be approved for monthly payments
  inside the quote. Wisetack embeds by API. It raises their close rate *and* their ticket, and it
  pays you a referral fee.

The sales conversation becomes: *"You sent 40 quotes last month. Twelve were never followed up.
That's roughly $48,000 you left on the table. Rivet chases them automatically."* That is a
different conversation from "our software is easier to use."

### Lever 2 — Ten minutes to value

Onboarding is where every competitor is weak and where you can be dramatically better. Their
setup takes hours; contractors abandon it.

- **AI catalog ingestion belongs here.** Your instinct was right that it's not a *business*. As
  an onboarding step inside Rivet it's excellent — it fixes the fatal activation bug, it's a
  genuine wow moment in a demo, and nobody has to trust a stranger with anything to experience it.
  Same technology, correct placement.
- **Per-trade starter catalogs** so a new account is never empty.
- **Target: signup to first real quote in under ten minutes.** Time it. Make it a number you
  track.

Then say it out loud in marketing, because it's a claim none of them can make.

### Lever 3 — Flat pricing, and say it loudly

$199–299/month, whole team, unlimited AI. No per-seat, no credits.

Jobber charges $29 per extra user — it punishes hiring, which contractors notice. QuoteIQ meters
AI through a credit pool, so contractors ration the feature you most want them using. Neither can
match flat pricing without repricing their entire existing book, which is the definition of a
position a small competitor can hold.

Put a pricing comparison on the landing page. "A 5-person shop pays $199/month on Jobber Connect
and $299 on Rivet — but Rivet includes quote follow-up, SMS and tiered quotes, which cost $299 on
Jobber Grow."

### Lever 4 — Be obviously built for one trade

Pick HVAC. Highest ticket, strongest upsell culture, maintenance agreements, and the existing
prompt already says *"a senior HVAC / trades estimator."*

This is positioning and content, not architecture — starter catalogs, prompt tuning, landing page
copy, the screenshots you show. Nothing in the schema changes.

**Let the data pick, though.** You have contractors to call. If three of them are plumbers and
they're enthusiastic, be a plumbing company. As an outsider, your read on which trade to serve is
worse than the signal from who actually responds.

### Which trades, and how many there are

The useful fact is not how many trades exist — it's how concentrated the addressable market is.

| Trade (NAICS) | US businesses | Annual revenue |
| --- | --- | --- |
| **Plumbing + HVAC (238220)** | ~89,000–105,000 establishments | HVAC alone **$156.2B** — the largest single trade |
| **Electrical (238210)** | ~56,000–82,000 firms | — |
| Roofing | — | $53B |
| Painting | — | $45B |
| All US home services | — | $543B–842B depending on definition |

_Counts vary by source depending on whether non-employer businesses are included; treat them as
orders of magnitude, not precise figures._

**The single most useful thing in that table:** plumbing and HVAC share one NAICS code (238220)
because so many companies do both. Targeting HVAC captures a large share of plumbing for free —
the same business, the same buyer, the same price book. We do not have to choose between them.

Add electrical and you have **MEP** (mechanical, electrical, plumbing), the natural cluster the
industry already recognises — and the segment RIVET Work explicitly sells to.

**Recommended sequence:**

1. **HVAC first.** Largest trade by revenue, highest ticket, strongest flat-rate price-book
   culture, and maintenance agreements are already how these businesses make money.
2. **Plumbing follows automatically** — same NAICS code, frequently the same company.
3. **Electrical third.** Same MEP cluster, similar quoting workflow, minimal product change.

**Deliberately not first:**

- **Landscaping / lawn** — several hundred thousand businesses but overwhelmingly one- and
  two-person operations at low ticket. This is QuoteIQ's home turf and their founders' own
  background. Attacking it means fighting their distribution on their ground.
- **Roofing** — measurement- and aerial-imagery-driven rather than price-book-driven, and xBuild
  raised $19M there in January 2026.
- **Cleaning, pest control** — recurring-visit businesses with a different core workflow. Quoting
  is not their bottleneck.

### The number that puts this in perspective

MEP is roughly **175,000 US businesses**. Most are one- or two-person operations, too small for
a $199–349/month product. The 5–19 employee band — the multi-truck shops we are targeting — is
plausibly **40,000–50,000 businesses**.

We need **200**. That is around **0.4% of the addressable segment**, in one trade, and we can
reach it through referrals in a single metro area.

The market is not the constraint. Distribution is.

---

## 4b. Should Rivet become a mobile app?

Short answer: **not now, and probably not as a rewrite ever.**

### Why QuoteIQ is app-first

Because of who their customer is. Their audience is solo operators and owner-operators in
pressure washing and lawn care — one channel is called *ForeverSelfEmployed*. For that customer
the owner **is** the technician and the office **is** the truck. There is no desk. App-first is
obviously correct for them.

That is a fact about their segment, not a law about this market.

### Why it's a different shape for Rivet

If Rivet goes upmarket — bigger shops, higher ticket, one trade deep, per §3b — the buyer is an
owner or office manager who has a desk, and the technician in the field is a *second* persona.
That's a web-primary product with excellent mobile, not an app-primary one.

Jobber and Housecall Pro both have apps and both remain heavily web-used, for exactly this
reason.

### Why rewriting now would be the worst possible move

You have **zero paying customers**. Rebuilding a working Next.js application as native
iOS + Android with two people on evenings is six-plus months during which you learn nothing about
whether anyone will pay. That is the textbook way to spend a year and a runway on a guess.

The technology is not what's stopping you from getting ten customers.

### What to actually do

1. **Make the web app genuinely excellent on mobile.** It is already mobile-first in CSS —
   16px inputs, responsive type, no horizontal scroll. Push it further: a real PWA that installs
   to the home screen, works offline for viewing, uses the camera for job photos, and sends push
   notifications. On modern iOS and Android that covers most of what a native app gives a product
   like this.
2. **Get ten paying customers on it.** If mobile quality is genuinely blocking sales, you will
   hear it in the first five conversations — and then you'll be solving a known problem instead
   of an imagined one.
3. **Then buy store presence cheaply.** Wrap the existing web app (Capacitor or similar) to ship
   to the App Store and Play Store without a rewrite. Weeks, not quarters.

### The part of "app-first" that genuinely matters

It isn't the technology — it's the **reviews**. QuoteIQ has 2,900+ iOS and 1,100+ Android reviews
at 4.7 stars. That is social proof a web app structurally cannot accumulate, and for a contractor
deciding whether to trust unknown software it carries real weight.

But note the ordering: reviews come *from* customers. You cannot use the app store as a shortcut
to your first ten. And a thin wrapper shipped before the mobile experience is good will earn
one-star reviews, which is worse than having none.

Store presence is a month-twelve move, not a month-one move.

---

## 4c. How to actually be cheaper AND better

You were right about the receptionist. Here is the version of "cheaper" that survives scrutiny.

### The margin you spotted is real

QuoteIQ's Virtual Call Team costs **125 credits per minute = $1.25/min**. A voice stack costs
roughly:

| Component | Indicative cost |
| --- | --- |
| Telephony (Twilio inbound) | $0.014/min |
| Speech-to-text (Deepgram-class) | $0.004/min |
| LLM turns (Flash-class) | $0.020/min |
| Text-to-speech (Cartesia/ElevenLabs-class) | $0.050/min |
| **Total** | **~$0.09/min** |

That is roughly a **14x markup**. At $0.25/min you would be 5x cheaper and still hold 65% gross
margin. _Verify current vendor rates before publishing any number — these are indicative._

### But "cheaper" doesn't come from the subscription price

Modelling real usage against their tiers (assuming ~50 credits per AI estimate — not published,
so test it):

| Usage | Cheapest real QuoteIQ cost | Rivet at $299 flat |
| --- | --- | --- |
| 15 quotes, 0 call-min | $32 | $299 — **QuoteIQ wins** |
| 40 quotes, 60 call-min | $120 | $299 — **QuoteIQ wins** |
| 80 quotes, 200 call-min | $315 | $299 — Rivet wins |

A light user can sit on Essentials at $29.99 and pay small overages. **You cannot beat that on
sticker price, and you shouldn't try.** Undercutting a $29.99 plan means volume, and volume needs
distribution you don't have.

**Quotes are the wrong lever.** They cost about 2 cents each to serve, so "unlimited quotes" is
nearly free for both of you — it differentiates on principle, not on money.

**Calls are the lever.** That's where their meter bites hardest, and where your cost advantage is
real.

### The pricing that makes the claim true

**$249/month flat. Unlimited quotes. 500 AI-answered minutes included.**

| AI minutes/mo | QuoteIQ real cost | Rivet $249 | Your cost to serve | Your margin |
| --- | --- | --- | --- | --- |
| 60 | $120 | $249 | $6 | 98% |
| 120 | $195 | $249 | $11 | 95% |
| 300 | $420 | $249 | $27 | **89%** |
| 500 | $670 | $249 | $45 | **82%** |
| 1,000 | $1,295 | $249 | $89 | 64% |

**At 500 answered minutes a month you are 2.7x cheaper than QuoteIQ and still hold 82% gross
margin.** That is a headline you can put on a landing page and defend with arithmetic.

It also self-selects the right customer. Nobody needing 500 answered minutes is a solo operator —
that's a multi-truck shop, exactly the segment §3b says QuoteIQ's audience doesn't reach.

### Sequence it — do not build voice first

The economics are right; the operational risk is what will hurt you.

A quote generator that fails is annoying. **A receptionist that drops a customer's call at 2am is
business damage**, and the contractor will blame you correctly. Real-time voice means latency
budgets, interruption handling, background noise on a job site, accents, call recording consent
by state, and emergency-call handling. Two people with day jobs cannot carry 24/7 uptime on a
real-time voice system, and Avoca has $125M to spend on the same problem.

**Start with missed-call text-back instead.** Call comes in unanswered → automatic SMS within
seconds: *"Sorry we missed you — what do you need? We'll call right back."*

- Captures a large share of the 85% who reach voicemail and never call back.
- **Asynchronous.** No latency budget, retryable, a 10-second delay is fine.
- Costs a fraction of a cent per message.
- Buildable in days, not months. Twilio is already a dependency.
- Fails safe. A late text is a minor bug; a dropped call is a lost customer.

Then evolve along the same rail as revenue arrives: text-back → AI qualifies over SMS → AI books
the appointment → **then** voice, once you can afford to support it.

Each step is independently sellable, and every one of them attacks the same $26B missed-call
problem that makes the receptionist valuable in the first place.

---

## 4d. The pricing model

Two tiers. No credits, no per-seat. The simplicity **is** the positioning — the moment you ship
five tiers and a credit meter you have become QuoteIQ with less distribution.

### Core — $199/month

Unlimited users. Unlimited quotes. **200 AI-answered minutes.** Missed-call text-back.
Automated quote follow-up. Good/better/best options. Payments. Invoicing. Scheduling.

### Pro — $349/month

Everything in Core, plus **750 AI-answered minutes**, consumer financing at quote time,
same-day support, and onboarding done for you.

### Rules that matter more than the numbers

**Never gate a revenue feature.** Quote follow-up and tiered quotes go in the base tier. Jobber
puts follow-up at $80+ and tiered quotes at $120+ — those are the two features that make the
contractor money, and gating them is their biggest weakness. Attack it, don't copy it.

**The tier difference is minutes and support, not capability.** Nobody should ever be unable to
do something because of their plan.

**Overage on minutes only, at $0.25/min.** Five times cheaper than QuoteIQ's $1.25 and still
~65% gross margin. Never meter quotes — they cost about 2 cents to serve and metering them
destroys the whole story.

**Annual = two months free.** Improves cash flow and cuts churn, which matters when you're
part-time.

**Founding price for the first 10–20: $149/month, locked forever**, in exchange for feedback and
a testimonial. This is also the easiest thing you will ever have to say to a prospect — see §4e.

### The economics

Cost to serve a real multi-truck shop:

| Profile | Direct AI + comms cost |
| --- | --- |
| Core (200 min, 40 quotes, 150 SMS) | ~$20/mo |
| Pro (600 min, 80 quotes, 400 SMS) | ~$58/mo |
| Heavy (1,000 min, 120 quotes, 800 SMS) | ~$97/mo |

At **200 customers on a 60/40 Core/Pro mix**:

| | |
| --- | --- |
| MRR | $51,800 |
| **ARR** | **$621,600** |
| AI + comms | −$6,977 |
| Stripe fees | −$1,562 |
| **Gross profit** | **$43,261/mo — 84% margin** |
| Infra + tools | −$1,900 |
| **Net** | **$41,361/mo → ~$496K/year** |
| Business value at 4–6x ARR | **$2.5M–3.7M** |

A profitable, independent business at 200 customers. The whole plan is arithmetic from here.

### The number that actually matters

| Price | Customers for $600K ARR | New customers/month over 3 years |
| --- | --- | --- |
| $149 | 336 | 9.3 |
| $199 | 251 | 7.0 |
| $249 | 201 | 5.6 |
| $349 | 143 | **4.0** |

**Four to seven new customers a month.** That's the entire sales challenge — not a thousand
users, not a funnel. Roughly one a week. Frame it that way and it stops being frightening.

Every $50 you add to the price removes about one sale a month from the job. That is the
strongest argument for pricing high, and it connects directly to §4e.

---

## 4e. How we sell

Neither of us is a salesperson, and we don't need to become one. Engineers sell B2B software
successfully all the time — but the process has to be designed for it rather than improvised.

### What selling actually is here

We are not persuading a stranger to buy something they don't want. We are talking to a contractor
who already loses jobs to slow quotes, and showing them software that fixes it.

The job is **diagnosis, not performance.** Ask about their business, listen, then show. Charisma
is irrelevant to that.

The most effective sentence in the entire process is *"Can you walk me through the last quote you
sent?"* — and then silence.

### Design the process so it doesn't need charisma

- **Record the demo once.** Script it, record it thirty times, ship the best take. Send that link
  instead of doing live demos. All the anxiety of live performance disappears, and it scales
  infinitely. This is the single highest-leverage thing you can do given your constraint.
- **Sell in writing.** Email and follow-ups, not calls. You can draft, edit and reread writing —
  most non-native speakers are markedly stronger in writing than in live speech. Lean into it.
- **Screen-share instead of pitching.** "Let me just show you" turns a performance into operating
  software, which is what you're actually good at.
- **Let the product do the talking.** If catalog import turns their old quotes into a working
  price book in three minutes while they watch, that moment sells better than any script.
- **Write the scripts down.** Ten questions, and prepared answers to the five objections you'll
  hear repeatedly (price, switching cost, "I already use X", trust, "who else uses this"). For a
  non-native speaker, having exact words prepared removes most of the difficulty.

### The referral engine is the real answer

You need 4–7 customers a month. If every happy customer refers one, you halve the cold work
permanently — and contractors trust other contractors far more than they'll ever trust a pitch.

So make referrals a product feature, not an afterthought: a free month for both sides, asked for
automatically after a customer's third successful quote. Ask every single customer for one
introduction and one testimonial. This is how a two-person team with no sales skill reaches 200
customers.

### The founding-customer ask

For the first ten, you never have to sell at all. You say:

> *"I'm building quoting software for HVAC contractors and I'm looking for ten to help me get it
> right. You'd get $149/month locked in permanently, and I'll set the whole thing up for you
> myself. In exchange I'd like your honest feedback and, if you end up liking it, a
> testimonial."*

That is an invitation, not a pitch. It is easy to say, and it is true.

### Two things worth considering

**Split the roles deliberately.** If one of us is more comfortable talking to customers, that
person should own the conversations while the other builds. It is the most common and most
effective split on a two-person team.

**Language as a wedge.** The US trades employ an enormous number of non-native English speakers,
many of them business owners, and essentially all field-service software is English-only. If we
can serve a language community natively — Spanish above all — that is an underserved segment and
a distribution advantage no competitor can easily copy. Worth considering before we settle on a
target segment.

---

## 5. What to cut

Making Rivet better means removing things, not only adding them.

- **The integrations page is seven "Coming soon" badges.** Two working integrations beats seven
  promises. Ship it with Stripe and email only.
- **Analytics is premature.** A contractor with 20 jobs doesn't need charts. Replace the
  dashboard's KPI tiles with a work queue: what's scheduled today, which quotes need chasing, who
  owes money. That's what someone opening the app at 7am actually wants.
- **Everything in the dead tree.** Cleanup Phase 1.
- **Any feature neither you nor a customer has asked for twice.**

---

## 6. Sequence

### Weeks 1–2 — make it usable

Catalog CRUD and CSV import. Invoice online payments. Onboarding that ends with a working
catalog. Deploy it ([PROTOTYPE_DEPLOYMENT.md](PROTOTYPE_DEPLOYMENT.md)) including the AI-backend
lockdown, which is a real security hole.

Right now a new account cannot generate a quote at all. Nothing else matters until that's false.

### Weeks 3–4 — make it worth paying for

Automated quote follow-up. Good/better/best. Photos on quotes. Quote expiry. Deposits.

Every item raises the customer's close rate or average ticket. That's what you're selling.

### Weeks 5–6 — make it demoable and sellable

AI catalog ingestion as the onboarding step. Per-trade starter catalog. Mobile QA on real
devices. Rivet's own billing and plan gating. A landing page with the pricing comparison.

### Weeks 7–12 — get ten paying customers

Start with your warm contacts. Charge from the first one — free pilots teach you nothing about
willingness to pay. Ask every single one for a referral and a testimonial; those two things are
how the trust problem in §1 actually gets solved.

**Ten paying customers at $199–299 is roughly $30K ARR.** Small, but it proves the model, and
everything in §2 is arithmetic from there.

---

## 7. Where the moat comes from

You're not going to have a technology moat. Accept that and build the ones available to a focused
operator:

1. **References and reputation (months 0–12).** In the trades, contractors buy what other
   contractors use. Ten happy customers in one trade in one region is a genuine, compounding
   advantage — and it's the only moat available to you early. Treat testimonials as a product
   feature.
2. **Switching costs (months 6–24).** Once quotes, jobs, invoices and customer history live in
   Rivet, leaving hurts. This is the ordinary vertical-SaaS moat and it's real.
3. **Proprietary pricing data (months 12–36).** Every catalog and every won/lost quote teaches you
   what contractors actually charge by trade and region. Eventually you can tell someone *"you're
   18% under market for this job in your zip."* This is the durable one — as models commoditise,
   proprietary operational data is what's left.
4. **Payments and financing attach (months 18–36).** The actual business model. ServiceTitan earns
   25% of revenue from usage-based fintech. Stripe Connect is already wired; you need volume.

---

## 8. What to do with the existing codebase

Keep building it — but finish before you extend.

- **Finish the catalog work.** Blocking everything.
- **Deploy and lock down the AI backend.** Currently unauthenticated with `company_id` from the
  request body.
- **Cleanup Phase 1** — a good first task for a new contributor, and it makes everything after
  it faster.
- **Then stop adding surface area** and start adding revenue features from §4.

---

## 9. The honest summary

We are competing on execution against four funded companies, in a market where we have no
distribution and limited hours. That is genuinely hard and the odds should not be oversold.

But the target is a profitable independent business, not category dominance. $600K ARR needs
roughly **200 contractors** at $299/month. Two hundred customers is a reachable number for a
focused product with warm referrals in one trade. It does not require beating Jobber; it requires
being obviously better for a specific contractor than the alternative they'd otherwise pick.

The three things that decide it:

1. **Fix the activation cliff.** Today the product cannot be used by a new customer at all.
2. **Sell revenue, not time.** Follow-up, tiered quotes, financing.
3. **Get ten warm customers and turn them into references.** That's your only real early moat.

The failure mode is spending a year making Rivet feature-complete without ever finding out if
someone will pay $299 for it. Get to that answer in 90 days.
