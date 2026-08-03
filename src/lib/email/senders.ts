'server-only'

import { render } from '@react-email/render'

import { QuoteSentEmail } from '@/emails/QuoteSentEmail'
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

  const from = input.fromLabel ? `${input.fromLabel} <${extractAddress(getFromAddress())}>` : getFromAddress()

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Your quote ${input.quoteNumber} is ready`,
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
    <p style="margin-top:32px;font-size:12px;color:#9CA3AF;">Sent by QuotePro on behalf of your provider.</p>
  </div>
</body></html>`

  const from = input.fromLabel ? `${input.fromLabel} <${extractAddress(getFromAddress())}>` : getFromAddress()

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Invoice ${input.invoiceNumber} — ${fmtMoney(input.amountDue)} due`,
    html,
    replyTo: input.replyTo,
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
