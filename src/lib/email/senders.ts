'server-only'

import { render } from '@react-email/render'

import { QuoteSentEmail } from '@/emails/QuoteSentEmail'
import { renderInvoicePdf, renderQuotePdf, type InvoicePdfProps, type QuotePdfProps } from '@/lib/pdf/documents'

import { getFromAddress, getResend } from './client'

// ---------------------------------------------------------------------------

type SendQuoteEmailInput = {
  to: string
  customerName: string
  quoteNumber: string
  total: number
  publicUrl: string
  validUntil?: Date | null
  items: { name: string; quantity: number; unit_price: number }[]
  fromLabel?: string
  replyTo?: string
  pdfProps?: QuotePdfProps
}

type SendResult =
  | { ok: true; id: string; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------

export async function sendQuoteEmail(input: SendQuoteEmailInput): Promise<SendResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' }
  }

  const html = await render(
    QuoteSentEmail({
      customerName: input.customerName,
      quoteNumber: input.quoteNumber,
      total: fmtMoney(input.total),
      publicLink: input.publicUrl,
      validUntil: (input.validUntil ?? defaultExpiry()).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      items: input.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: fmtMoney(i.unit_price * i.quantity),
      })),
    }),
  )

  const from = input.fromLabel
    ? `${input.fromLabel} <${extractAddress(getFromAddress())}>`
    : getFromAddress()

  const attachments = input.pdfProps
    ? [
        {
          filename: `${input.quoteNumber}.pdf`,
          content: await renderQuotePdf(input.pdfProps),
        },
      ]
    : undefined

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Your quote ${input.quoteNumber} is ready`,
    html,
    replyTo: input.replyTo,
    attachments,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id ?? '' }
}

// ---------------------------------------------------------------------------

type SendQuoteFollowUpInput = {
  to: string
  customerName: string
  quoteNumber: string
  total: number
  publicUrl: string
  /** 1 for the first nudge, 2 for the last. Changes the wording, not the ask. */
  attempt: number
  fromLabel?: string
  replyTo?: string
}

/**
 * The nudge for a quote that was sent and never answered.
 *
 * Deliberately short and plain rather than a re-send of the full quote. This
 * has to read like the contractor typed it on their phone — a second copy of
 * the formatted quote reads as automated, and a homeowner who feels marketed at
 * is a homeowner who stops replying. No urgency, no discount, no chasing tone:
 * the contractor still has to work with these people.
 */
export async function sendQuoteFollowUpEmail(
  input: SendQuoteFollowUpInput,
): Promise<SendResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' }
  }

  const company = input.fromLabel ?? 'We'
  const opening =
    input.attempt === 1
      ? `Just checking you got the quote we sent over.`
      : `Following up one last time on the quote we sent.`
  const closing =
    input.attempt === 1
      ? `Happy to talk it through or adjust anything — just reply to this email.`
      : `If the timing isn't right, no problem at all. Reply any time and we'll pick it back up.`

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#18181b;max-width:520px">
  <p>Hi ${escapeHtml(input.customerName)},</p>
  <p>${escapeHtml(opening)}</p>
  <p style="margin:24px 0">
    <a href="${input.publicUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">
      View quote ${escapeHtml(input.quoteNumber)} — ${fmtMoney(input.total)}
    </a>
  </p>
  <p>${escapeHtml(closing)}</p>
  <p style="margin-top:28px">— ${escapeHtml(company)}</p>
</div>`.trim()

  const { data, error } = await resend.emails.send({
    from: input.fromLabel
      ? `${input.fromLabel} <${extractAddress(getFromAddress())}>`
      : getFromAddress(),
    to: input.to,
    // A reply, not a new announcement — "Re:" keeps it in the same mental
    // thread as the quote they already have.
    subject: `Re: your quote ${input.quoteNumber}`,
    html,
    replyTo: input.replyTo,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id ?? '' }
}

// ---------------------------------------------------------------------------

type SendInvoiceEmailInput = {
  to: string
  customerName: string
  invoiceNumber: string
  amountDue: number
  publicUrl: string
  dueDate?: Date | null
  fromLabel?: string
  replyTo?: string
  pdfProps?: InvoicePdfProps
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<SendResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' }
  }

  const dueLine = input.dueDate
    ? `<p style="margin:0 0 16px;color:#4B5563;">Due by <strong>${input.dueDate.toLocaleDateString(
        'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )}</strong>.</p>`
    : ''

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,sans-serif;background:#F9FAFB;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:32px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#4F46E5;">Invoice</div>
    <h1 style="margin:6px 0 12px;font-size:24px;color:#111827;">Hi ${escapeHtml(input.customerName)},</h1>
    <p style="margin:0 0 16px;color:#4B5563;">Your invoice <strong>${escapeHtml(input.invoiceNumber)}</strong> is ready.</p>
    <div style="margin:24px 0;padding:20px;border:1px solid #E5E7EB;border-radius:12px;background:#F9FAFB;">
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Amount due</div>
      <div style="font-size:32px;font-weight:600;color:#111827;margin-top:4px;font-variant-numeric:tabular-nums;">${fmtMoney(input.amountDue)}</div>
    </div>
    ${dueLine}
    <div style="margin-top:24px;">
      <a href="${input.publicUrl}" style="display:inline-block;background:#4F46E5;color:#fff;font-weight:500;text-decoration:none;padding:12px 20px;border-radius:8px;">View invoice</a>
    </div>
    <p style="margin-top:32px;font-size:12px;color:#9CA3AF;">Sent by Rivet on behalf of your provider.</p>
  </div>
</body></html>`

  const from = input.fromLabel
    ? `${input.fromLabel} <${extractAddress(getFromAddress())}>`
    : getFromAddress()

  const attachments = input.pdfProps
    ? [
        {
          filename: `${input.invoiceNumber}.pdf`,
          content: await renderInvoicePdf(input.pdfProps),
        },
      ]
    : undefined

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Invoice ${input.invoiceNumber} — ${fmtMoney(input.amountDue)} due`,
    html,
    replyTo: input.replyTo,
    attachments,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id ?? '' }
}

// ---------------------------------------------------------------------------

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function defaultExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d
}

function extractAddress(from: string): string {
  const match = from.match(/<(.+)>/)
  return match?.[1] ?? from
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}

// ---------------------------------------------------------------------------

/**
 * The invitation to join a company.
 *
 * This lived in a second module that hardcoded `onboarding@resend.dev` and
 * never read RESEND_FROM_EMAIL. That address is Resend's sandbox: it delivers
 * only to the account owner, so every invite to an actual teammate was refused
 * with "You can only send testing emails to your own email address" — while
 * quotes, which went through this module and the verified domain, arrived fine.
 *
 * One sender, one from-address, so the two cannot disagree again.
 */
export async function sendTeamInviteEmail(input: {
  to: string
  companyName: string
  inviterName: string | null
  link: string
}): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { ok: true, skipped: true, reason: 'RESEND_API_KEY not set' }

  const who = input.inviterName ? `${input.inviterName} has invited you` : 'You have been invited'

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: `Join ${input.companyName} on Rivet`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h1 style="font-size:20px;margin:0 0 12px">Join ${escapeHtml(input.companyName)} on Rivet</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
            ${escapeHtml(who)} to join <strong>${escapeHtml(input.companyName)}</strong>.
          </p>
          <p style="margin:0 0 24px">
            <a href="${input.link}"
               style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:500">
              Accept invitation
            </a>
          </p>
          <p style="font-size:13px;color:#666;line-height:1.6;margin:0">
            Or paste this link into your browser:<br />
            <span style="word-break:break-all">${input.link}</span>
          </p>
        </div>`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}
