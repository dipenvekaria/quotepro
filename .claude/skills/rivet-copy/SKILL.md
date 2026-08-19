---
name: rivet-copy
description: The copywriter — Rivet's voice, and the checklist for reviewing every user-visible word. Load before writing or reviewing any UI copy, empty state, toast, email, or marketing text.
---

# Rivet copy

## Who is reading

A contractor between jobs, on a phone, with grease on their thumb — or their customer,
a homeowner about to approve four figures from the couch. Neither reads software copy
for pleasure. Every sentence is an interruption; earn it or cut it.

## The voice

- **Job-first, tool-second.** Name the outcome, not the mechanism. "Build the quote",
  never "Draft with AI". The AI is ambient machinery — the standing owner rule is that
  AI jargon stays out of the working screens entirely (buttons, headings, toasts).
  Marketing pages may sell the AI story; the product does the work quietly.
- **Contractor language.** Price book, not catalog. Job, not work item. Crew, not team
  members. Send, not submit. Money is `$4,250.00`, never `$4250`.
- **Plain declarative sentences.** No exclamation marks anywhere in the product. No
  "Oops!", no "Awesome!", no emoji. Enthusiasm reads as unserious to someone running a
  $2M business.
- **The customer-facing surfaces speak for the contractor, not for Rivet.** Emails and
  quote pages carry the business's name and voice; Rivet appears once, small, at the
  bottom ("Sent with Rivet"). Platform-first copy on a customer surface is a defect.
- **Say what happens next.** Empty states name the action ("No quotes yet — create your
  first one"), never just the absence. Errors say what to do, not just what failed.
  Toasts report outcomes ("Drafted from your price book"), not internals.
- **Honesty is voice.** Nothing coming-soon is described as existing. Caveats stay
  ("Check the quantities and prices"). A limitation stated plainly builds more trust
  than a superlative.

## Review checklist — run on every page

1. Read every string a user can see: headings, buttons, empty states, toasts, errors,
   placeholders, hints, dialogs, emails, PDFs.
2. Kill: AI jargon in-product; exclamation marks; "catalog" in user copy; platform
   voice on customer surfaces; passive descriptions of features next to the feature
   ("One-click drafting" cards); dead promises; inconsistent terms for one thing.
3. Tighten: every sentence that can lose a clause, loses it. Button labels are verbs.
   Headings under six words.
4. Verify claims against code: copy that says something works is a bug if it doesn't
   (see rivet-ui: "Controls must do something" — the same rule for words).
5. Check both audiences: internal screens can be terse and learnable; /q, /i, emails,
   and PDFs get read once by a stranger — spend the care there.

## Where the words live

Pages under `src/app/**/page.tsx` and their client components; emails in `src/emails/`
and `src/lib/email/senders.ts`; PDFs in `src/lib/pdf/documents.tsx`; the landing in
`src/app/landing.tsx`; toasts inline in components. The AI's own reply style is prompt
work (`prompts/`, `src/lib/ai/quote-agent.ts`) — trade-agnostic, per the standing rule.
