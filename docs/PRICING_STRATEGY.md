# Pricing — decision of record

Date: 2026-08-21 (promotional framing removed the same day)
Status: **Decided** (supersedes the 2026-08-15 $249 recommendation and the 2026-08-18
$39/$99 launch prices)

## The prices

**Solo $49/mo** (1 user) · **Team $99/mo** — displayed plain, no promotional framing.

- The intended future prices are **$79 / $139** for new signups, raised once voice has
  shipped and proof exists. That raise is a private plan executed as an ordinary manual
  reprice (new amount-carrying lookup keys in `src/lib/stripe/billing.ts` + the landing
  copy) — **never** a published ladder, counter, or countdown. Owner rule, 2026-08-21:
  nothing on a public surface may signal that Rivet is new — a "first 100 companies"
  promotion shipped that morning and was pulled the same day for exactly that reason.
- Existing subscribers keep their price through any reprice without being told anything —
  a Stripe subscription keeps the price it started on.
- Prices self-provision under amount-carrying lookup keys (`rivet_solo_4900`, …), so no
  Stripe dashboard work exists in any mode.
- 14-day trial on both, card up front. One price, **no add-ons, no gated features, no
  usage SKUs** — the standing rule.
- AI voice answering is bundled when it ships: **100 min/mo on Solo, 300 on Team**, never
  metered. Solo caps near its allowance; Team runs soft. Cost math, margins, and the
  competitor comparison live in [`COST_PER_CUSTOMER.md`](COST_PER_CUSTOMER.md).

## Why launch below the intended price

Launch optimises traction, not margin: the first hundred customers are worth more as
testimonials, references, and product feedback than as an extra $30–40/month, and a price
is easy to raise but damaging to cut. The launch price simply *is* the price until the
raise — quietly introductory, never labelled as such.

The intended full price holds the premium position (`STRATEGY.md`: charge more, serve
fewer): $79 buys software *plus* what the market sells separately as a $109–$299 AI
receptionist, so it stays a bargain against the real comparison — Jobber/Housecall Pro
**plus** a voice product on top.

## What would change these numbers

- Voice vendor rate is now a pricing input, not just engineering: at a premium
  $0.31/min stack, a $99 Team maxing 300 minutes is breakeven. The chosen
  Retell-on-Gemini stack (~$0.13–0.15/min) keeps worst-case margin at 49%+; moving voice
  in-house (Gemini Live + Twilio, ~$0.03–0.05/min) lifts every worst case above 80% and is
  the planned post-traction optimisation — app work comes first.
- A future voice-forward tier stays open: Rivet's bundled-minute *cost* sits far below the
  standalone receptionists' *price*, so undercutting them without add-on fees stays
  possible whenever it is worth doing.
