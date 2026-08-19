---
name: rivet-legal
description: The legal-risk and compliance reviewer — consent surfaces, e-signatures, communications law, data handling. Load when touching terms, consent capture, outbound email/SMS, recordings, signatures, or customer data flows.
---

# Rivet legal & compliance review

Not a lawyer; a checklist that keeps the product defensible and flags what needs real
counsel. Anything marked **counsel** below gets a human lawyer before launch or before
money moves.

## Consent surfaces — where agreement must be captured

- **Rivet's own terms (clickwrap).** Account creation must state, adjacent to the
  action button: "By creating an account you agree to the Terms of Service and Privacy
  Policy" with working links. Browsewrap (links in a footer only) is weak; the line at
  the point of signup is the standard. Record acceptance implicitly via the account
  creation timestamp against the terms' Last-updated date.
- **Quote acceptance (the customer's e-signature).** ESIGN/UETA want intent, consent,
  association with the record, and retention. Rivet captures: typed full name, explicit
  terms-agreement language in the accept dialog, IP + user agent + timestamp in
  metadata, and the signature block on the retained PDF. Keep all four; never weaken
  one for UX.
- **Contractor's own terms on quotes.** Their fine print renders verbatim on /q and the
  PDF; the accept dialog binds to it only when present. Rivet must not edit, summarize,
  or interpret their terms.

## Communications law

- **Email**: transactional email (quotes, invoices, receipts, review requests tied to a
  completed job) does not need marketing opt-in, but must identify the sender and honor
  replies. No purchased lists, ever. The waitlist is consent to be emailed about launch
  — nothing else.
- **SMS (when built)**: TCPA territory — **counsel**. Requires prior express consent
  captured and stored per recipient, opt-out handling (STOP), quiet hours, and A2P
  10DLC registration. Do not ship SMS without this section satisfied.
- **Call answering / recording (when built)**: two-party-consent states require a
  disclosure line in the greeting ("this call may be recorded"). Build the disclosure
  into the default agent script, not as an option. **Counsel** before launch.

## Data handling

- Tenant isolation is a legal surface: every leak is a breach. The tenancy scanner and
  RLS are the controls; anything touching who-sees-what goes through security review.
- Privacy policy must name real subprocessors and stay current when one is added —
  adding an integration means updating /privacy in the same PR.
- Customer-of-customer data (homeowners) is processed on the contractor's behalf:
  never market to it, never cross-tenant aggregate it in product features.
- E-signature records, quote/invoice history, and archived accounts are business
  records: archive, don't delete (standing owner rule), and keep exports working.
- Payment data: card details live with Stripe only. Rivet stores no PANs — keep it
  that way; storing any raises PCI scope. Payments recorded manually are facts about
  money that moved elsewhere.

## Review checklist — run on every page

1. Does any action bind a user (signup, accept, connect, import)? If so, is the
   agreement visible at the point of action, and is acceptance recorded?
2. Does any surface send communications? Under whose name, with what consent, with
   what reply path?
3. Does any new feature add a subprocessor or data category /privacy doesn't name?
4. Do any claims in copy promise more than the terms deliver (warranties, uptime,
   "legally binding")? Copy may not out-promise the contract.
5. What is retained, for how long, and can the user get it out?

## Standing gaps (update as they close)

- Terms/privacy are baselines drafted in-repo — **counsel review before charging**.
- No DPA offered yet; fine pre-launch, needed for bigger customers.
- Signup clickwrap line: required before open signups.
