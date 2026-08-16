# Go-To-Market Checklist — Business, Legal & Marketing

_Everything that isn't product. Companion to
[GTM_PRODUCT_CHECKLIST.md](GTM_PRODUCT_CHECKLIST.md)._

> **Not legal advice.** This is an engineer's checklist of what to get in front of a lawyer and
> an accountant. Two items — SMS consent and call recording — carry real statutory penalties and
> are flagged accordingly. Budget for a startup lawyer — it is the highest-ROI money we will
> spend before launch.

**Reviewed 2026-08-16.** Engineering statuses below were checked against the code on that date;
legal, financial and marketing items are unchanged because nothing has been done on them. Two
items previously marked P0 have since been resolved and are struck through rather than deleted,
so the reasoning stays readable.

Priority: **P0** before taking money · **P1** before real marketing · **P2** fast-follow.

---

## 1. Name and trademark — do this first

| # | Item | Priority | Note |
| --- | --- | --- | --- |
| 1.1 | **Trademark clearance search on "Rivet"** | **P0** | "Rivet" is a common English word and is already in use by companies in fintech, health and dev tooling. A knockout USPTO search costs nothing; a proper clearance opinion is a few hundred dollars. **Do this before you spend a dollar on a domain, logo or ads.** |
| 1.2 | Decide fallback names if Rivet is blocked | **P0** | Cheap now, expensive after you have customers and a domain. |
| 1.3 | Register the domain | **P0** | |
| 1.4 | File the trademark application | P2 | Only after traction; ~$350/class plus attorney |
| 1.5 | Secure social handles | P2 | |

**Sequencing matters.** Everything below assumes a name you can legally keep.

---

## 2. Company formation and finance

| # | Item | Priority |
| --- | --- | --- |
| 2.1 | Form the entity (Delaware LLC or C-Corp — LLC is simpler and right if you are not raising) | **P0** |
| 2.3 | EIN, business bank account, business card | **P0** |
| 2.4 | Accounting (Wave free / QuickBooks / Bench) | **P1** |
| 2.5 | **SaaS sales tax** — many US states now tax SaaS, and economic nexus triggers at ~$100K or 200 transactions per state | **P1** |
| 2.6 | Automate it (Stripe Tax, Anrok, TaxJar) before you have customers in 10 states | **P1** |
| 2.7 | Track ARR, MRR, churn, CAC from customer #1 | **P1** |



---

## 3. Legal documents

| # | Document | Priority | Note |
| --- | --- | --- | --- |
| 3.1 | **Terms of Service** | **P0** | Liability cap, no warranty on AI-generated quotes, termination, payment terms |
| 3.2 | **Privacy Policy** | **P0** | You hold contractor *and* homeowner PII |
| 3.3 | **Data Processing Addendum** | **P1** | You are a processor for your contractors' customer data |
| 3.4 | Subprocessor list — Supabase, Vercel, Google Cloud (Vertex AI, Places), Stripe, Resend, Sentry, Twilio, SignNow | **P1** | Required by the DPA |
| 3.5 | **AI output disclaimer** | **P0** | Explicit: quotes are drafts, the contractor is responsible for verifying pricing before sending. A hallucinated price the customer accepts is a contract. |
| 3.6 | Acceptable Use Policy | P2 | |
| 3.7 | Refund / cancellation policy on the pricing page | **P1** | |

Templates from Stripe Atlas, Clerky or Common Paper get you 80% there. Have a lawyer review
1–3 and 3.5.

**Verified 2026-08-16 — the sign-in page already links to three pages that do not exist.** Its
footer carries `Pricing`, `Privacy` and `Terms`; all three return a redirect back to `/login`. A
prospect who wants to read the terms before handing over a card goes in a circle, which is a
worse first impression than having no link at all. Either ship the pages or remove the links —
and the links are the honest short-term fix, because the pages are P0 anyway.

**The AI output disclaimer (3.5) — ✅ shipped 2026-08-16 in the quote editor.** Worth being
precise about the audience, because it is easy to put in the wrong place: the disclaimer protects
Rivet against a *contractor* who sends a wrong AI-drafted price, so it belongs where the
contractor reviews the draft before sending — not on the public quote viewer, where the homeowner
is neither the responsible party nor helped by being told the pricing might be wrong.

The editor already warned loudly when the AI was unavailable and the lines were keyword matches.
It said nothing in the successful case, which is the one that actually creates the exposure. It
now does, quietly: *"AI drafted these lines from your catalog. Check the quantities and prices —
once your customer approves, this is the price you've agreed to."* The ToS clause is still needed;
this is the version anyone will actually read.

---

## 4. Compliance — the two that carry real penalties

### 4.1 SMS and TCPA — **read before shipping missed-call text-back**

| # | Item | Priority |
| --- | --- | --- |
| a | **Prior express written consent captured and logged before any automated SMS** | **P0** |
| b | STOP/HELP keyword handling, honoured immediately | **P0** |
| c | Consent records retained (who, when, how) | **P0** |
| d | A2P 10DLC brand + campaign registration with Twilio | **P0** |
| e | Quiet hours (no messages 9pm–8am recipient local time) | **P0** |
| f | Contract terms making the *contractor* responsible for their own customer consent | **P0** |

**TCPA statutory damages are $500–$1,500 per message**, and class actions in this space are
routine. Missed-call text-back is a genuinely great feature that is also the single largest legal
risk in the product. Get 4.1 lawyered specifically — not as part of a general ToS review.

### 4.2 Call recording — before any AI voice

| # | Item | Priority |
| --- | --- | --- |
| a | Two-party consent handling for the ~12 all-party-consent states | **P1** |
| b | Recording disclosure at call start | **P1** |
| c | Retention and deletion policy | **P1** |

Deferred while you ship text-back first, which is exactly why that sequencing is right.

### 4.3 Everything else

| # | Item | Priority |
| --- | --- | --- |
| a | CAN-SPAM — unsubscribe in every marketing email, physical address | **P1** |
| b | PCI — stay fully inside Stripe Checkout/Elements, never touch card data | **P0** |
| c | Stripe Connect platform obligations — you are facilitating payments to third parties | **P0** |
| d | CCPA/CPRA — do-not-sell link, deletion and export requests | **P1** |
| e | GDPR — only if you take EU customers; simplest answer is don't, at first | P2 |
| f | Accessibility (WCAG AA) — ADA web claims are a live litigation area | **P1** |

---

## 5. Security and trust

| # | Item | Priority |
| --- | --- | --- |
| 5.1 | ~~Fix the unauthenticated AI backend~~ — **dissolved.** The AI runs in-process inside the authenticated server action; there is no second origin ([ADR 0009](adr/0009-ai-in-process.md)) | ✅ |
| 5.2 | ~~Manual tenancy audit~~ — **done, and no longer manual.** `tests/tenancy.test.ts` scans every SQL statement in the tree and fails the build on one that touches company data without a `company_id` predicate or a written exemption | ✅ |
| 5.3 | Run `scripts/verify-rls.ts` against production | **P0** |
| 5.4 | **Rotate every key** — all have lived in tunnel-facing dev configs, and two were pasted into an agent transcript | **P0** |
| 5.5 | Backups on with a **tested** restore | **P0** |
| 5.6 | ~~Remove the scratch routes~~ — **gone** (`/theme-test`, `/preview`, `/logo-test` no longer exist) | ✅ |
| 5.7 | CSP header | **P1** |
| 5.8 | Incident response plan and a status page | **P1** |
| 5.9 | Security page describing your practices honestly | **P1** |
| 5.10 | ~~Remove the "SOC 2" claim from the login page~~ — **removed.** A comment now sits where the tile was, recording that claims on that page must be true | ✅ |
| 5.11 | Cyber / E&O insurance (~$1–2K/yr) | **P1** |
| 5.12 | **Rate limiting** on the public accept/sign routes and the AI actions — absent today, and both are reachable by anyone holding a quote token | **P0** |
| 5.13 | Server-action input validation audit | **P1** |
| 5.14 | Quote photos are private — bucket closed, short-lived signed URLs minted per read | ✅ |

**On 5.4:** this is the one on the list that only gets more expensive to delay. It is also
entirely mechanical, and nothing depends on it being done in any particular order.

---

## 6. Positioning and messaging

| # | Item | Priority |
| --- | --- | --- |
| 6.1 | **One-line positioning.** Not "AI-powered field service management" — every competitor says that. Try: *"Your price book loaded in five minutes. Quote in the driveway before you leave."* | **P0** |
| 6.2 | Pick the trade and say it explicitly on the homepage | **P0** |
| 6.3 | Pricing page with a **cost comparison** — QuoteIQ at 500 AI minutes is ~$670/mo vs your $249 flat | **P1** |
| 6.4 | Objection answers written down: price, switching cost, "I already use Jobber", trust, "who else uses this" | **P1** |
| 6.5 | 3–5 customer testimonials with real names and companies | **P1** |
| 6.6 | Case study: one contractor, real numbers | **P2** |

---

## 7. Marketing — designed for two engineers who don't sell

You need **4–7 new customers a month** to reach 200 in three years. That is roughly one a week,
not a funnel. Every channel below is chosen because it does not require live selling.

| # | Channel | Priority | Why it fits |
| --- | --- | --- | --- |
| 7.1 | **Warm introductions** — your existing contractor contacts | **P0** | Your only real distribution today. First 10 customers come from here. |
| 7.2 | **Referral engine in the product** — free month both sides, prompted automatically after a customer's third successful quote | **P0** | Contractors trust contractors. This is how two people reach 200 without a sales team. |
| 7.3 | **One recorded demo video.** Script it, record it thirty times, ship the best take, send the link | **P0** | Removes live performance entirely. Highest-leverage single asset given your constraints. |
| 7.4 | **SEO content** — "how to build an HVAC flat rate price book", "import price book into Jobber", "HVAC quote template" | **P1** | Searchable intent, written not spoken, compounds |
| 7.5 | Reddit r/HVAC and Facebook owner groups — **help for two weeks before mentioning the product** | **P1** | These communities eject salespeople instantly and reward genuine help |
| 7.6 | Cold email to **office managers, not owners** | **P2** | Owners are on roofs; office managers feel the data entry |
| 7.7 | Local trade association / supply house relationships | **P2** | |
| 7.8 | **Google Search on in-market terms** — "HVAC quoting software", "Housecall Pro alternative" | **P1** | Expensive per click and the only channel where the buyer identifies themselves. At plausible funnel rates it implies ~$1,333 CAC, inside the ~$2,000 ceiling |
| 7.9 | **Supply houses and distributors** — Ferguson, Watsco, SiteOne, local counters | **P1** | Owners are physically there most weeks. How trade tools have always spread, and no software company works it *because* it does not scale — which is why it is available |
| 7.10 | **Local association chapters** — ACCA, PHCC, IEC, NRCA | **P1** | 20–50 owners in a room for a few hundred dollars. Owner-dense in a way no Meta audience is |
| 7.11 | **Bookkeepers and accountants serving trades** | **P2** | They see the invoicing mess monthly and are already trusted. The QuickBooks exports make Rivet the thing that reduces *their* workload |
| 7.12 | Capterra / G2 / Software Advice | **P2** | $30–100 a lead, boring, works, inside the ceiling |
| 7.13 | Cold paid social | **P2** | **Fails the CAC ceiling at plausible rates (~$2,000).** Meta cannot target "owns an HVAC company"; interest targeting reaches technicians. Retargeting site visitors is a different story at ~$111 |
| 7.14 | App store presence via a Capacitor wrapper | **P2** | The prize is *reviews* as social proof, not the technology. Month 12, not month 1 |

**Full channel analysis with the arithmetic is in
[BUSINESS_ANALYSIS.md](BUSINESS_ANALYSIS.md).** Two conclusions worth repeating here: with ~$2,000
of CAC headroom **cheap is the wrong optimisation** — you can afford expensive clicks, you cannot
afford clicks from people who do not own the business. And **AI-generated creative lowers the cost
of making ads, not of buying attention**; it pays off against a retargeting audience, not a cold
one.

**Consider seriously:** if you speak a language with a large US contractor population — Spanish
above all — that is an underserved wedge and a distribution advantage no competitor can copy.
Essentially all field-service software is English-only.

---

## 8. Sales and onboarding

| # | Item | Priority |
| --- | --- | --- |
| 8.1 | **Founding-customer offer** — first 10–20 at $149/mo locked forever, for feedback and a testimonial. Against the $249 list price that is a 40% discount and ~$145 of contribution a month, which the 97% margin absorbs comfortably | **P0** |
| 8.6 | **Build their price book for them, free** — from a PDF, a spreadsheet or photos of a binder | **P0** |
| 8.2 | 14-day free trial, no card | **P1** |
| 8.3 | **Personally onboard every early customer.** Set up their catalog, sit with them on their first quote | **P0** |
| 8.4 | Written objection scripts | **P1** |
| 8.5 | Ask every customer for one referral and one testimonial | **P0** |

**8.3 and 8.6 are your structural advantage.** A bootstrapped competitor with 40,000 users at
$29.99 physically cannot do high-touch onboarding — their economics forbid it. At 200 customers
you can onboard every single one, and *"the founder set it up with me and answers my texts"*
beats any feature list for a contractor deciding whether to trust unknown software.

8.6 is the sharper version. Re-keying a price book is the single biggest reason a contractor does
not switch, and extraction is measured at about a minute and $0.83 per contractor. Offering to do
it converts a demo into a live account holding their own prices — which is also the moment the
product becomes hard to leave. At a $2,000 CAC ceiling you can afford roughly 20 hours of your own
time per acquired customer, so this is not generosity, it is arithmetic.

---

## 9. Support and operations

| # | Item | Priority |
| --- | --- | --- |
| 9.1 | Support email with a published response time you can actually meet on evenings | **P1** |
| 9.2 | Help docs for the top 10 questions | **P1** |
| 9.3 | Uptime monitoring + alerting to a phone | **P0** |
| 9.4 | Sentry — ⚠️ **wired but inert.** `src/instrumentation.ts` and `instrumentation-client.ts` exist and do nothing without a DSN. One environment variable away from working | **P1** |
| 9.5 | Product analytics (PostHog) — you cannot see where activation fails without it | **P1** |
| 9.6 | **Alert if `ai_mode` is ever `mock` in production** — that means quotes are keyword-matched, not AI, and it fails silently as poor quality rather than as an outage | **P0** |
| 9.7 | Churn exit interview, every single time | **P1** |
| 9.8 | Acquisition source recorded at signup — ✅ 2026-08-15, `companies.acquisition_source`. Makes churn-by-channel answerable, which is the number §7 is otherwise guessing at | ✅ |

**A part-time onboarding and support hire is planned** and is costed in
[BUSINESS_ANALYSIS.md](BUSINESS_ANALYSIS.md): ~$2,165/month at 20 hrs/week, or 9 of the 45
customers. The case for it is 9.7 and churn generally — but the better framing is that the free
price-book build is simultaneously the sales close and the onboarding, so the hire is an
acquisition mechanism rather than overhead. Hire on the trigger (onboarding eating selling time,
realistically 10–15 customers), and hire an ex-office-manager from a trades business rather than a
SaaS support rep.

---

## 10. Billing

| # | Item | Priority |
| --- | --- | --- |
| 10.1 | **Subscription billing for Rivet itself** — `companies.plan` exists and is enforced nowhere | **P0** |
| 10.2 | Plan gating and the upgrade path | **P0** |
| 10.3 | Trial expiry and conversion flow | **P0** |
| 10.4 | Dunning for failed cards | **P1** |
| 10.5 | Self-serve cancellation | **P1** |
| 10.6 | **Stripe Connect to live mode** | **P0** |
| 10.7 | Webhook signature verification confirmed in production | **P0** |

**You cannot charge anyone until 10.1 exists.** It is easy to defer and it blocks all revenue.

---

## 11. Launch gate

- [ ] Trademark cleared, entity formed
- [ ] ToS, Privacy Policy and AI disclaimer live and lawyer-reviewed
- [ ] The `Pricing` / `Privacy` / `Terms` links on the sign-in page resolve to real pages
- [ ] TCPA consent flow built and reviewed **before** any SMS ships
- [ ] Every key rotated
- [x] Tenancy enforced and guarded by a test that fails the build
- [x] Scratch routes removed
- [x] SOC 2 claim removed from the login page
- [ ] Rate limiting on the public accept/sign routes and the AI actions
- [ ] Rivet's own billing works end to end; Stripe in live mode
- [ ] Landing page with pricing and honest comparison
- [ ] Recorded demo video
- [ ] Support email, uptime alerts, Sentry, PostHog
- [ ] 3+ testimonials from real customers
- [ ] Backups tested by actually restoring

---

## 12. The five that will actually hurt if skipped

Everything above matters. These are the ones that cause real damage:

1. **TCPA compliance on SMS** — $500–1,500 per message, class actions are routine.
2. **Trademark clearance on "Rivet"** — a common word, likely conflicts. Rebranding after
   customers is brutal.
3. **Rivet's own billing** — no revenue without it, and it's easy to keep deferring.
4. **The "SOC 2 in progress" claim** — misrepresenting a security certification to businesses
   handling customer payment data.
5. **The AI output disclaimer** — a hallucinated price the customer accepts is a contract the
   contractor has to honour. Make it explicit that generated quotes are drafts requiring review.
