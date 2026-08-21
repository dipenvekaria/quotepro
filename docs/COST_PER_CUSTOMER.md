# Variable cost per customer

What it costs Rivet, in vendor fees, to serve one contractor subscriber for a
month — photo tagging, quote drafting, the Bolt assistant, SMS (Twilio), and AI
voice answering (Retell). "Customer" here means a Rivet subscriber (a
contractor), not their homeowners.

_Prices verified August 2026. AI models are read from the code: photo tagging
and quote drafting run on Gemini 2.5 **Flash-Lite**, Bolt on **Flash**._

## Unit prices

| Service | Rate | Source |
| --- | --- | --- |
| Gemini 2.5 Flash-Lite | $0.10 / 1M input, $0.40 / 1M output tokens | Google |
| Gemini 2.5 Flash | $0.30 / 1M input, $2.50 / 1M output tokens | Google |
| Retell AI voice (all-in) | $0.13–$0.31 / min; **$0.15/min** used here | Retell / CloudTalk |
| Twilio SMS (US) | ~$0.008/segment + ~$0.003 carrier ≈ **$0.011** all-in | Twilio |
| Twilio number + 10DLC | $1.15/mo number + ~$2/mo registration | Twilio |

## The AI text and vision costs are rounding error

These are the pieces people worry about, and they are nearly free at these
models.

| Item | Per event | Monthly assumption | Monthly cost |
| --- | --- | --- | --- |
| **Photo tagging** | ~$0.0001 / photo (≈850 in + 20 out tokens on Flash-Lite) | 30 photos | **$0.003** |
| Quote drafting | ~$0.0005 / quote (~3k in + 500 out) | 40 quotes | $0.02 |
| Bolt assistant | ~$0.0018 / question (~2.5k in + 400 out on Flash) | 30 questions | $0.05 |
| **Subtotal (AI text + vision)** | | | **≈ $0.08 / customer / month** |

**Photo tagging specifically:** about **one-hundredth of a cent per photo.** A
contractor who shot 200 photos in a month would cost **two cents** to tag them
all. It never needs metering or a limit for cost reasons.

## SMS (Twilio)

Reminders, quote/invoice notifications, review requests, and — if voice is on —
receptionist follow-up texts.

| Item | Monthly assumption | Monthly cost |
| --- | --- | --- |
| Messages | ~80 segments × $0.011 | $0.88 |
| Number + 10DLC (amortised) | 1 number, shared campaign | ~$3.15 |
| **SMS subtotal** | | **≈ $4 / customer / month** |

A dedicated per-customer number adds $1.15/mo each; a shared sending number
avoids that.

## AI voice (Retell) — the only real cost driver

Answering the calls a contractor would otherwise miss. Small contractors miss
25–40% of inbound calls; a solo shop fielding ~5–15 calls a day leaves tens of
missed calls a month on the table. Voice is billed by the minute, so the cost
scales with how much of that the AI picks up.

| Scenario | Calls answered / mo | Avg length | Minutes | Cost @ $0.15/min |
| --- | --- | --- | --- | --- |
| Light (after-hours only) | 20 | 2.0 min | 40 | **$6** |
| Typical | 50 | 2.5 min | 125 | **$19** |
| Heavy (all overflow) | 100 | 3.0 min | 300 | **$45** |

## All-in cost per customer per month

| | Text + vision AI | SMS | Voice | **Total** |
| --- | --- | --- | --- | --- |
| **No voice** | $0.08 | $4 | — | **≈ $4** |
| **Typical voice** | $0.08 | $4 | $19 | **≈ $23** |
| **Heavy voice** | $0.08 | $4 | $45 | **≈ $49** |

**Blended average.** Not every subscriber turns voice on. If ~40% adopt it at
typical volume: `0.4 × $19 + $4 + $0.08` ≈ **$11–12 per customer per month**
all-in, including photo tagging.

## What this means for pricing

Plans (decided 2026-08-21): **founding price $49 Solo / $99 Team for the first
100 companies**, locked in for as long as they stay subscribed; **$79 / $139**
after that. One price, no add-ons.

- **Everything except voice is cheap enough to include everywhere** — photo
  tagging, unlimited quoting, Bolt, and normal SMS come to ~$4/customer. On a
  $49 plan that is ~92% gross margin.
- **Voice is the piece that can break "one price."** A typical voice user costs
  ~$23 (41% margin on Solo); a heavy one costs ~$49 — more than the Solo price.
  Voice needs a boundary to stay in a flat plan. Options:
  1. **Include a voice minute allowance** (e.g. ~200 min/mo ≈ $30 ceiling) and
     bill nothing until it is exceeded — keeps the flat-price promise for all
     but the heaviest users.
  2. **Gate voice to Team ($99)**, where a $19–45 voice cost still leaves
     healthy margin, and keep Solo voice-free.
  3. Both: voice included on Team, an allowance on Solo.

The earlier target of holding AI cost near **$20/customer** is met in every case
except heavy voice usage. Photo tagging, the specific question here, is
immaterial to that number — it is a rounding error against a single answered
phone call.

## Caveats

- Retell's $0.15/min is a realistic mid-point; a leaner model choice reaches
  ~$0.13, a premium voice ~$0.31. Voice cost moves roughly linearly with that.
- Gemini 2.5 Flash-Lite retires 16 Oct 2026; its successor is dearer
  ($0.25/$1.50). Even at that rate, photo tagging stays under a cent per photo.
- Token counts are engineering estimates from the prompts and catalog sizes in
  this repo, not metered production numbers. Voice minutes and call volume are
  the figures to validate against real usage first — they dominate everything
  else combined.

---

# Voice allowance model: 100 min (Solo) / 300 min (Team)

Decided 2026-08-21: include **100 voice minutes** on Solo and **300** on Team,
bundled into the flat price rather than sold as an add-on.

## Margin at full utilisation

Worst case — every subscriber burns the whole allowance — at the realistic
$0.15/min all-in voice rate (~2.5-min average call):

| Plan | Included | ≈ calls | Voice @ $0.15 | + other | Cost | Founding margin | Full-price margin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Solo | 100 min | ~40 | $15.00 | $4 | **$19** | $49 → **61%** | $79 → **76%** |
| Team | 300 min | ~120 | $45.00 | $5 | **$50** | $99 → **49%** | $139 → **64%** |

At a premium $0.31/min voice model the ceilings tighten: Solo costs $35
(founding **29%**, full **56%**); Team costs $98 — **breakeven at the founding
$99**, 29% at $139. That is the one thin edge in the plan: a founding-price
Team that maxes 300 minutes on a premium voice stack makes nothing. It is
acceptable because (a) the chosen stack (Retell on Gemini) prices at
~$0.13–0.15, not $0.31, and (b) blended reality sits far below full
utilisation — most subscribers won't enable voice or won't max it. But it makes
the voice-vendor rate a pricing decision, not just an engineering one.

Break-even talk time at $0.15/min: founding Solo ~300 min, founding Team
~627 min, full-price Solo ~500 min, full-price Team ~893 min — all multiples of
the allowance, which is what makes the caps safe rather than tight.

## The one number that must hold: the cap behaviour

The allowance is safe **only if the cap actually caps.** The math breaks in one
place — a **Solo** user who runs far past 100 minutes:

- Founding Solo at 300 min ≈ $49 cost against a $49 price — **breakeven**, and
  a loss beyond it.
- Team at 300 min ≈ $50 cost against $99 — still 49% margin.

So the design, consistent with "no add-on fees, no gimmicks":

- **Do not meter overage.** Per-minute overage billing is exactly the add-on the
  brand promises never to charge.
- **Solo caps near its allowance** and nudges the heavy caller to upgrade to
  Team, where the minutes (and the margin) are there.
- **Team can be soft** — it stays profitable out to ~600 minutes even at the
  founding price, so it can run past 300 quietly for all but pathological users
  rather than cutting a customer off mid-season.

Frame it as "**100 minutes of call answering included**," not a "100-minute limit."

## How voice compares with competitors

The decisive fact: **no field-service platform bundles AI voice into its base
price.** It is always a separate purchase.

| Where a contractor gets AI voice today | Price | Model |
| --- | --- | --- |
| Housecall Pro — HCP Assist | Add-on to HCP's $49–$299 plan | Human agents, priced separately |
| Rosie (standalone, trades-focused) | $49 / 250 min · $149 / 1,000 · $299 / 2,000 | Included minutes |
| Goodcall (standalone) | $79–$249 | Unlimited min, capped by unique callers |
| Typical standalone AI receptionist | **$109–$299 / month** | Flat / per-min / per-call |

So a contractor who wants software **and** AI answering pays twice today:
field-service software ($49–$299) **plus** an AI receptionist ($109–$299) =
roughly **$158–$598 / month**.

Rivet folds voice into **$49 / $99 all-in** (founding; $79 / $139 after the
first 100). That is the differentiator — you deliver, for the price of the
software alone, what the market sells as a separate $109–$299 product. Team's
300 included minutes now exceed Rosie's $49-a-month standalone tier (250 min)
— the plan carries a whole receptionist product inside it, plus the software.

Two honest caveats on the comparison:

- **Solo's minutes are modest by design.** 100 min is small next to Rosie's
  250, so Solo's voice is positioned as *bundled overflow / after-hours
  answering*, not a full-time receptionist. For a solo just starting out, 100
  minutes free-with-your-software beats paying $49 extra for Rosie; a
  high-volume shop moves to Team, whose 300 minutes exceed Rosie's entry tier
  outright.
- **Your cost floor is far below the market's price floor.** Standalone
  receptionists *charge* $109–$299; your *cost* for 100–300 bundled minutes is
  $15–$45. That headroom means a future "voice-forward" plan could undercut
  every standalone receptionist and still print margin — without ever charging
  an add-on fee.
