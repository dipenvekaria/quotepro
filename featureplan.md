# QuotePro – 10 Feature Prompts (Copy-Paste One at a Time)

## 01 – E-Signature Integration (Dropbox Sign / HelloSign)
We are building QuotePro (Next.js 14 + Supabase + Python FastAPI backend). Add full Dropbox Sign (HelloSign) e-signature integration.

Requirements:
- When user clicks "Send Quote" on a quote, create a signature request using the generated PDF.
- Use the existing PDF that is already stored in Supabase Storage (bucket: quotes, path: quotes/{quote_id}/quote.pdf).
- Support multiple signers (at minimum the customer, optionally a second internal approver).
- Store the signature_request_id and signed_pdf_url back in the quotes table.
- Add a webhook endpoint in Next.js (/api/webhooks/dropbox-sign) to receive signature events (signed, declined, etc.) and update quote.status accordingly ('sent' → 'signed' or 'declined').
- Update the quote detail page to show real-time status and a "View Signed Document" button when complete.
- Add Dropbox Sign API keys to .env.local and python-backend/.env.
- Use the official @dropbox/sign npm package and dropbox-sign Python SDK.
- Update the database schema (add columns: signature_request_id TEXT, signed_pdf_url TEXT, signature_status TEXT).
- Include Supabase migration file.

Do NOT change any existing AI quote generation logic. Generate all files and migration.

────────────────────────────────────────────────────────────────────────────

## 02 – Professional PDF Generation (Branded + Good/Better/Best)
QuotePro currently generates quotes via AI but uses a basic PDF. Replace it with a beautiful, contractor-grade PDF using @react-pdf/renderer.

Requirements:
- Create a new component QuotePDF.tsx that produces a professional-looking PDF with:
  • Company logo at top (from Supabase storage)
  • Customer details + job address
  • Good / Better / Best columns when AI returns multiple options
  • Itemized table (description, qty, unit price, line total)
  • Upsell items highlighted in orange
  • Embedded job photos (full-width with captions)
  • Tax breakdown + grand total
  • Big orange "Accept & Sign Online" button
  • Company footer with license, phone, website
- Save the generated PDF to Supabase Storage → quotes/{quote_id}/quote.pdf
- Return the public URL and store it in quotes.pdf_url
- Keep existing Python AI generation untouched — just improve the final PDF step.
- Make it look better than Jobber/Housecall Pro PDFs.

Generate the full QuotePDF.tsx component and update the quote generation flow.

────────────────────────────────────────────────────────────────────────────

## 03 – Send Quote via Email + SMS (Resend + Twilio)
Add "Send Quote" functionality that delivers the quote via both email and SMS.

Requirements:
- Button "Send Quote" opens a modal with customer email/phone pre-filled.
- Use Resend.com for beautiful transactional emails.
- Use Twilio for SMS with short link to the quote viewer page (e.g. quotepro.app/q/abc123).
- Email subject: "Your quote from [Company Name] is ready"
- SMS: "Hey [Name], here’s your quote from [Company] – takes 10 seconds to review & sign → [short.link]"
- After sending, change quote.status to 'sent' and log sent_at timestamp.
- Add Resend and Twilio API keys to .env.local and python-backend/.env.
- Create short links using Vercel’s built-in /q/[id] route (make it public).

Generate all code, API routes, and email template.

────────────────────────────────────────────────────────────────────────────

## 04 – Invoice Generation + Stripe Payment Links
When a quote is signed, allow one-click "Create Invoice & Send Payment Link".

Requirements:
- Add "Convert to Invoice" button when status = 'signed'
- Generate a professional invoice PDF (similar style to quote)
- Create a Stripe Payment Link (or Checkout Session) for the exact total
- Send invoice + payment link via email/SMS
- When paid, update quote.status → 'paid' and create record in new invoices table
- Add stripe_webhook endpoint to listen for payment success
- Store payment_intent_id and invoice_pdf_url

Generate everything including new DB table and migration.

────────────────────────────────────────────────────────────────────────────

## 05 – QuickBooks Online Sync (Bi-directional)
Add QuickBooks Online integration so signed quotes → invoices sync automatically.

Requirements:
- Use OAuth2 flow (QuickBooks button in Settings)
- When quote becomes 'paid', create matching Invoice in QuickBooks
- Pull customer list from QuickBooks into QuotePro (optional sync)
- Sync products/services from pricing_items ↔ QuickBooks items
- Store quickbooks_refresh_token encrypted in database
- Add "QuickBooks connected" badge in settings
- Use official @quickbooks/oauth2 and quickbooks-sdk packages

Generate full integration including settings page and background sync.

────────────────────────────────────────────────────────────────────────────

## 06 – Public Client Portal (No Login)
Create a beautiful public client portal at /q/[quote_id] (no login required).

Requirements:
- Public page showing the quote PDF + live status
- "Accept & Sign" button → Dropbox Sign embedded signing
- "Pay Now" button → Stripe Checkout when invoice exists
- Show job photos and notes
- Mobile-friendly, branded with company logo/colors
- Rate-limiting and security (only via signed URL or short code)

Generate the page and short-link system.

────────────────────────────────────────────────────────────────────────────

## 07 – Automated Follow-Up Sequences
Add automated email/SMS follow-ups for unsigned quotes.

Requirements:
- When status = 'sent' and no signature after 48h → send reminder 1
- After 5 days → reminder 2 with discount offer (configurable)
- Use Resend + Twilio
- Allow turning on/off in company settings
- Track opens/clicks if possible

Create background job (Vercel Cron or Supabase edge function).

────────────────────────────────────────────────────────────────────────────

## 08 – Quote Editing After AI Generation
Currently quotes are read-only after AI generation. Add full editing.

Requirements:
- After AI generates quote → show editable table
- Add/remove/reorder line items manually
- Change quantities, prices, add discounts
- Mark items as upsells
- "Regenerate with AI" button to refresh suggestions
- All changes saved instantly

Update the quote detail page.

────────────────────────────────────────────────────────────────────────────

## 09 – Basic Analytics Dashboard
Add an Analytics page for admins.

Show:
- Quotes sent / signed / won this month
- Win rate %
- Average quote value
- Total revenue from paid quotes
- Top upsell items
- Chart of quotes over time (use Recharts)

Generate the page and required DB queries.

────────────────────────────────────────────────────────────────────────────

## 10 – PWA + Mobile Enhancements
Make QuotePro a perfect installable PWA and mobile-first.

Requirements:
- Update manifest.json and service worker for full offline support
- Add "Add to Home Screen" prompt on mobile
- Make quote creation 100% offline (save drafts locally, sync when online)
- Optimize camera/photo upload flow
- Add splash screens for iOS/Android

Generate all PWA files and mobile tweaks.