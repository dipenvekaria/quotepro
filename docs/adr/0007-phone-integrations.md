# ADR 0007: Integrate With Contractors' Existing Phone Systems

**Status**: Accepted (direction), not yet scheduled
**Date**: 2026-08-10
**Deciders**: @dipenvekaria

## Context

Missed calls are the largest quantified revenue leak in this category: 20–30% of inbound calls
to home services go unanswered, 85% of callers who reach voicemail never call back, and the
average missed call is worth $285+. [COMPETITIVE_ANALYSIS.md](../COMPETITIVE_ANALYSIS.md) puts
the industry-wide figure at ~$26B/year, and it is why Avoca raised $125M at a $1B valuation.

[STRATEGY.md](../STRATEGY.md) §4c already commits to attacking this asynchronously — missed-call
text-back before anything real-time — on the grounds that a dropped 2am call is business damage a
two-person part-time team cannot carry.

The open question was *how Rivet sees the call*. Three options were considered.

**Rivet-provisioned number with call forwarding.** Rivet buys a Twilio number; the contractor
forwards their line to it on busy/no-answer. Works for everyone regardless of provider. Rejected
as the primary path for one reason: the follow-up text arrives **from an unfamiliar number**. A
homeowner who called ABC Heating and receives a text from a number they have never seen reads it
as a scam. That undercuts the whole feature, and no amount of copy fixes it.

**Twilio Hosted SMS.** Enables SMS on the contractor's existing number while their voice service
stays with their current carrier — so texts come from the number the customer actually dialled.
Genuinely good, and kept as the fallback for contractors on platforms we do not integrate with.
Costs a per-number letter of authorisation and an approval wait.

**Porting their number to Twilio.** Rejected outright. Porting makes Rivet the contractor's phone
company: an outage on our side kills their business line. That is a larger version of exactly the
liability §4c refuses to take on with real-time voice.

## Decision

**Integrate directly with the phone platforms contractors already use, starting with RingCentral,
plus three others. Accept partial market coverage.**

When a contractor already runs a UCaaS platform, that platform can already send SMS from their
business number and already knows about every call. Integrating with it is a shortcut to the
right outcome using infrastructure they already pay for — no forwarding to configure, no number
to provision, no trust problem.

**We are explicitly not chasing full coverage.** Four platforms is enough to serve a large share
of the target segment; contractors on anything else keep using Rivet without automatic lead
creation, and get Hosted SMS later if demand justifies it. Chasing the long tail of phone systems
is the kind of surface-area work [STRATEGY.md](../STRATEGY.md) §5 says to cut.

### Candidate platforms

The fourth slot is deliberately unfilled. **Pick it from what the first ten customers actually
use** — one question in a sales call, "what do you use for your phones?" — rather than from a
spreadsheet. §4 makes the same argument about choosing a trade: as outsiders, our read is worse
than the signal from who responds.

| Platform | Why it's a candidate |
| --- | --- |
| **RingCentral** | Decided. Large installed base, mature API, well-documented webhooks. |
| **OpenPhone** | Rising fast with trades and small teams. Simpler auth than RingCentral, so likely the best effort-to-reward ratio of the set. |
| **CallRail** | Not a phone system — a call-tracking layer that home-services contractors very commonly run for marketing attribution. Straightforward webhooks, and it carries attribution data the others don't. |
| _fourth_ | Dialpad and Nextiva are the obvious contenders. Decide from customer signal. |

**Every API detail must be verified against current vendor documentation before building.** Auth
models, webhook event names, subscription lifetimes and renewal requirements all change, and none
of the above should be treated as settled fact.

## Architecture

The cost of *n* providers is not *n* × the cost of one, provided the normalisation happens once.

```
provider webhook ─▶ /api/phone/[provider]/route.ts
                      │  verify signature, resolve tenant
                      ▼
                   adapter  ─▶  normalised CallEvent
                      │           { companyId, direction, fromNumber,
                      │             toNumber, startedAt, answered,
                      │             durationSec, recordingUrl?, notes? }
                      ▼
              create_work_item_with_customer(...)   ← already exists
                      │
                      ▼
              activity_log  +  optional SMS follow-up
```

The schema already anticipates most of this:

| Need | Already present |
| --- | --- |
| Dedupe callers by phone | `customers_unique_phone_per_company` — a unique index, enforced by the DB |
| Create customer + work item atomically | `create_work_item_with_customer()` — **upserts by phone**, the natural key for a call |
| Mark the origin | `work_items.source` already permits `'phone'` |
| Idempotent webhook replay | `webhooks_inbound` with `UNIQUE (source, event_id)` |
| Call notes and timeline | `activity_log`, append-only |
| SMS preference + quiet hours | `notification_prefs.channels.sms` and `quiet_hours` (22:00–07:00) |

So the happy path — ring, prospect appears in the pipeline — is close to a thin adapter over an
RPC that already does the work.

### What does not exist yet

These are the real cost, and none of them are about telephony:

1. **Per-tenant OAuth token storage.** Each contractor authorises their own account. There is no
   token table, and `companies.settings` is a plain JSONB column read throughout the app — the
   wrong place for a rotating secret. Needs a dedicated table with restricted access.
2. **A scheduler.** Webhook subscriptions on these platforms expire and must be renewed. There is
   no job runner — no `vercel.json`, no cron. If renewal fails silently, calls stop appearing and
   nobody notices. Renewal needs monitoring, not just implementation.
3. **A webhook receiver.** `src/app/api/` currently contains only `vitals`. The architecture is
   Server Actions; a public webhook route is a deliberate exception needing its own signature
   verification and tenant resolution.
4. **`webhooks_inbound.source`** is a CHECK constraint of
   `('stripe','dropbox_sign','twilio','lemonsqueezy','other')`. Needs a migration.

### Effort

| Piece | Estimate |
| --- | --- |
| Shared core — webhook route, normalised event, tenant resolution, token storage, renewal job | ~1.5 weeks |
| Each provider adapter | 2–4 days |
| **Four providers** | **~3.5–4 weeks part-time** |

The shared core dominates. That asymmetry is the whole argument for the adapter layer, and it is
why provider four costs a fraction of provider one.

## Consequences

**Positive**
- Contractors change nothing about their phone setup — no forwarding codes, no new number, no
  porting. Follow-up texts come from the number the customer dialled.
- Attacks the largest quantified leak in the category using infrastructure customers already pay
  for.
- Integrations create switching cost, which is the months 6–24 moat in §7.

**Negative**
- **Partial coverage, accepted deliberately.** Contractors on unsupported platforms get no
  automatic lead creation.
- **Four vendor dependencies.** Each has its own auth model, rate limits, and breaking changes.
  This is ongoing maintenance for a two-person team, not a one-off build.
- Introduces a scheduler and a public webhook surface, both new operational responsibilities.
- Integrations are table stakes, not a moat. Jobber and Housecall Pro can match any of them. The
  defensibility remains references, switching costs, and pricing data — see §7.

**Blocking, before any SMS ships**
- **TCPA.** [GTM_BUSINESS_CHECKLIST.md](../GTM_BUSINESS_CHECKLIST.md) §4.1 calls missed-call
  text-back *"a genuinely great feature that is also the single largest legal risk in the
  product"* — $500–1,500 **per message**, with routine class actions. Needs consent capture and
  logging, STOP/HELP handling, quiet hours, and contract terms making the contractor responsible
  for their own customers' consent. That doc says to get this lawyered specifically, not as part
  of a general ToS review.
- **A2P 10DLC registration** with the messaging provider has days-to-weeks of lead time and
  blocks the whole feature. Start it early; it cannot be rushed at the end.

## Sequencing

Not scheduled. Two things outrank it:

1. **The activation cliff.** A new signup still cannot create a catalog item, so it cannot
   generate a quote. Building phone integration ahead of that is the failure mode §9 names —
   *"spending a year making Rivet feature-complete without ever finding out if someone will
   pay."*
2. **Customer signal on which platforms.** The fourth slot cannot be chosen responsibly without
   it, and the first three should be confirmed the same way.

The trigger that promotes this: **a design-partner customer asking for it.** At that point ~4
weeks to make a reference customer permanently sticky is a good trade, and reference customers
are the only moat available in months 0–12.
