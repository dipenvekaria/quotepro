# Pricing — decision of record

Date: 2026-08-21
Status: **Decided** (supersedes the 2026-08-15 $249 recommendation and the 2026-08-18
$39/$99 launch prices)

## The prices

| | Founding — first 100 companies | Full price after |
| --- | --- | --- |
| **Solo** (1 user) | **$49/mo** | $79/mo |
| **Team** | **$99/mo** | $139/mo |

- Founding customers keep their price for as long as they stay subscribed. Grandfathering
  is Stripe's own behaviour — a subscription keeps the price it started on.
- The switch is automatic: `foundingSpotsLeft()` in `src/lib/stripe/billing.ts` counts live
  subscriptions against `FOUNDING_CAP = 100`; a cancelled subscription frees its spot.
  Prices self-provision under amount-carrying lookup keys (`rivet_solo_4900`, …), so no
  Stripe dashboard work exists in any mode.
- 14-day trial on both, card up front. One price, **no add-ons, no gated features, no
  usage SKUs** — the standing rule.
- AI voice answering is bundled when it ships: **100 min/mo on Solo, 300 on Team**, never
  metered. Solo caps near its allowance; Team runs soft. Cost math, margins, and the
  competitor comparison live in [`COST_PER_CUSTOMER.md`](COST_PER_CUSTOMER.md).

## Why a founding ladder instead of launching at full price

Launch optimises traction, not margin: the first hundred customers are worth more as
testimonials, references, and product feedback than as an extra $30–40/month. A price is
easy to raise and damaging to cut, so the full price is published from day one as the
anchor — the landing page shows $79/$139 struck through beside $49/$99 — and "first 100"
gives the discount a reason and a deadline without a coupon code.

Full price holds the premium position (`STRATEGY.md`: charge more, serve fewer): $79 buys
software *plus* what the market sells separately as a $109–$299 AI receptionist, so it
stays a bargain against the real comparison — Jobber/Housecall Pro **plus** a voice
product on top.

## What would change these numbers

- Voice vendor rate is now a pricing input, not just engineering: at a premium
  $0.31/min stack, a founding-price Team maxing 300 minutes is breakeven. The chosen
  Retell-on-Gemini stack (~$0.13–0.15/min) keeps worst-case margin at 49%+; moving voice
  in-house (Gemini Live + Twilio, ~$0.03–0.05/min) lifts every worst case above 80% and is
  the planned post-traction optimisation — app work comes first.
- A future voice-forward tier stays open: Rivet's bundled-minute *cost* sits far below the
  standalone receptionists' *price*, so undercutting them without add-on fees stays
  possible whenever it is worth doing.
