# Go-To-Market Checklist — Business, Legal & Marketing

_Everything that isn't product. Companion to
[GTM_PRODUCT_CHECKLIST.md](GTM_PRODUCT_CHECKLIST.md)._

> **Not legal advice.** This is an engineer's checklist of what to get in front of a lawyer and
> an accountant. Two items — SMS consent and call recording — carry real statutory penalties and
> are flagged accordingly. Budget for a startup lawyer — it is the highest-ROI money we will
> spend before launch.

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
| 3.4 | Subprocessor list — Supabase, Vercel, Railway, Google/Gemini, Stripe, Resend, Twilio, SignNow | **P1** | Required by the DPA |
| 3.5 | **AI output disclaimer** | **P0** | Explicit: quotes are drafts, the contractor is responsible for verifying pricing before sending. A hallucinated price the customer accepts is a contract. |
| 3.6 | Acceptable Use Policy | P2 | |
| 3.7 | Refund / cancellation policy on the pricing page | **P1** | |

Templates from Stripe Atlas, Clerky or Common Paper get you 80% there. Have a lawyer review
1–3 and 3.5.

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
| 5.1 | **Fix the unauthenticated AI backend** | **P0** |
| 5.2 | ~~Manual tenancy audit~~ — **done 2026-08-10, clean.** 53 call sites, no leaks. Manual and unguarded; re-run after new data access | ✅ |
| 5.3 | Run `scripts/verify-rls.ts` against production | **P0** |
| 5.4 | **Rotate every key** — all have lived in tunnel-facing dev configs | **P0** |
| 5.5 | Backups on with a **tested** restore | **P0** |
| 5.6 | Remove the scratch routes (`/theme-test`, `/logo-test`, `/preview`, …) — publicly routable today | **P0** |
| 5.7 | CSP header | **P1** |
| 5.8 | Incident response plan and a status page | **P1** |
| 5.9 | Security page describing your practices honestly | **P1** |
| 5.10 | **Remove the "SOC 2" claim from the login page** — you don't have it and implying it is a misrepresentation | **P0** |
| 5.11 | Cyber / E&O insurance (~$1–2K/yr) | **P1** |

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
| 7.8 | Google Ads | **P2** | Only once you know your conversion rate; CAC in this space runs $500–2,000 |
| 7.9 | App store presence via a Capacitor wrapper | **P2** | The prize is *reviews* as social proof, not the technology. Month 12, not month 1. |

**Consider seriously:** if you speak a language with a large US contractor population — Spanish
above all — that is an underserved wedge and a distribution advantage no competitor can copy.
Essentially all field-service software is English-only.

---

## 8. Sales and onboarding

| # | Item | Priority |
| --- | --- | --- |
| 8.1 | **Founding-customer offer** — first 10–20 at $149/mo locked forever, for feedback and a testimonial | **P0** |
| 8.2 | 14-day free trial, no card | **P1** |
| 8.3 | **Personally onboard every early customer.** Set up their catalog, sit with them on their first quote | **P0** |
| 8.4 | Written objection scripts | **P1** |
| 8.5 | Ask every customer for one referral and one testimonial | **P0** |

**8.3 is your structural advantage.** A bootstrapped competitor with 40,000 users at $29.99
physically cannot do high-touch onboarding — their economics forbid it. At 200 customers you can
onboard every single one, and *"the founder set it up with me and answers my texts"* beats any
feature list for a contractor deciding whether to trust unknown software.

---

## 9. Support and operations

| # | Item | Priority |
| --- | --- | --- |
| 9.1 | Support email with a published response time you can actually meet on evenings | **P1** |
| 9.2 | Help docs for the top 10 questions | **P1** |
| 9.3 | Uptime monitoring + alerting to a phone | **P0** |
| 9.4 | Sentry live with source maps | **P1** |
| 9.5 | Product analytics (PostHog) — you cannot see where activation fails without it | **P1** |
| 9.6 | **Alert if `ai_mode` is ever `mock` in production** — that means quotes are keyword-matched, not AI | **P0** |
| 9.7 | Churn exit interview, every single time | **P1** |

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
- [ ] TCPA consent flow built and reviewed **before** any SMS ships
- [ ] Every key rotated; tenancy audit done; scratch routes removed
- [ ] SOC 2 claim removed from the login page
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
