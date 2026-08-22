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
  logoUrl?: string | null
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
      companyName: input.fromLabel,
      logoUrl: input.logoUrl,
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
  logoUrl?: string | null
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
    ${logoImg(input.logoUrl, input.fromLabel ?? 'Logo')}
    <div style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#111827;">Invoice</div>
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

function logoImg(url: string | null | undefined, alt: string): string {
  if (!url) return ''
  return `<img src="${url}" alt="${escapeHtml(alt)}" height="44" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 0 16px" />`
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
          ${logoImg((input as {logoUrl?: string|null}).logoUrl, 'Logo')}
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

/**
 * "@sam is this price ok?" — the note itself, delivered to the person tagged.
 *
 * The link goes to the internal detail page, which requires a session, so a
 * forwarded email leaks nothing a login doesn't already guard.
 */
export async function sendMentionEmail(input: {
  to: string
  authorName: string
  authorEmail?: string | null
  quoteLabel: string
  note: string
  link: string
}): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { ok: true, skipped: true, reason: 'RESEND_API_KEY not set' }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      replyTo: input.authorEmail ?? undefined,
      to: input.to,
      subject: `${input.authorName} tagged you on ${input.quoteLabel}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          ${logoImg((input as {logoUrl?: string|null}).logoUrl, 'Logo')}
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px">
            <strong>${escapeHtml(input.authorName)}</strong> tagged you in a note on
            <strong>${escapeHtml(input.quoteLabel)}</strong>:
          </p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f5f5f4;border-radius:8px;font-size:15px;line-height:1.6;color:#111;white-space:pre-wrap">${escapeHtml(input.note)}</blockquote>
          <p style="margin:0">
            <a href="${input.link}"
               style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:500">
              Open the quote
            </a>
          </p>
        </div>`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}

/**
 * "How did we do?" — sent by the contractor from a completed job.
 *
 * Solicitation is links, not APIs: neither Google nor Meta lets software file
 * a review for someone, so the whole feature is putting the right link in
 * front of a customer while the finished job is still fresh.
 */
export async function sendReviewRequestEmail(input: {
  to: string
  customerName: string | null
  companyName: string
  googleUrl: string | null
  facebookUrl: string | null
  /** The business's inbox — the email promises replies reach a human. */
  replyTo?: string | null
}): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { ok: true, skipped: true, reason: 'RESEND_API_KEY not set' }

  const links = [
    input.googleUrl && { label: 'Review us on Google', url: input.googleUrl },
    input.facebookUrl && { label: 'Review us on Facebook', url: input.facebookUrl },
  ].filter((l): l is { label: string; url: string } => Boolean(l))
  if (links.length === 0) return { ok: false, error: 'No review links configured' }

  const buttons = links
    .map(
      (l, i) => `
          <a href="${l.url}"
             style="display:inline-block;background:${i === 0 ? '#111' : '#fff'};color:${i === 0 ? '#fff' : '#111'};border:1px solid #111;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:500;margin:0 8px 8px 0">
            ${escapeHtml(l.label)}
          </a>`,
    )
    .join('')

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      replyTo: input.replyTo ?? undefined,
      to: input.to,
      subject: `How did we do${input.customerName ? `, ${input.customerName}` : ''}?`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          ${logoImg((input as {logoUrl?: string|null}).logoUrl, 'Logo')}
          <h1 style="font-size:20px;margin:0 0 12px">Thanks for choosing ${escapeHtml(input.companyName)}</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
            Your job is complete. If you have a minute, a quick review helps our
            small business more than you'd think — and helps neighbours find us.
          </p>
          <p style="margin:0 0 8px">${buttons}</p>
          <p style="font-size:13px;color:#666;line-height:1.6;margin:16px 0 0">
            Had a problem instead? Reply to this email and we'll make it right.
          </p>
        </div>`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}

/**
 * In-app support message → the team inbox, reply-to the user. The whole
 * support loop is email on purpose: a two-person team lives in an inbox,
 * not a ticket queue, and the user gets the reply where they already are.
 */
export async function sendSupportMessage(input: {
  inbox: string
  fromUserEmail: string
  fromUserName: string
  companyName: string
  plan: string | null
  role: string
  message: string
}): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { ok: true, skipped: true, reason: 'RESEND_API_KEY not set' }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: input.inbox,
      replyTo: input.fromUserEmail,
      subject: `Support: ${input.companyName} — ${input.fromUserName}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <p style="font-size:13px;color:#666;margin:0 0 12px">
            ${escapeHtml(input.fromUserName)} (${escapeHtml(input.role)}) at
            <strong>${escapeHtml(input.companyName)}</strong>${input.plan ? ` · ${escapeHtml(input.plan)}` : ''}
            · ${escapeHtml(input.fromUserEmail)}
          </p>
          <blockquote style="margin:0;padding:12px 16px;background:#f5f5f4;border-radius:8px;font-size:15px;line-height:1.6;color:#111;white-space:pre-wrap">${escapeHtml(input.message)}</blockquote>
          <p style="font-size:13px;color:#666;margin:12px 0 0">Reply goes straight to them.</p>
        </div>`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}

/**
 * The call-answering confirmation: the assigned number and how to point the
 * business line at it. Sent once, when the owner turns the service on — the
 * setup instructions live in the inbox where the office can find them.
 */
export async function sendVoiceLiveEmail(input: {
  to: string
  companyName: string
  number: string
}): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { ok: true, skipped: true, reason: 'RESEND_API_KEY not set' }

  const pretty = input.number.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: `Your call answering number: ${pretty}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h1 style="font-size:20px;margin:0 0 12px">Call answering is on</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px">
            ${escapeHtml(input.companyName)} now has a dedicated answering line:
          </p>
          <p style="font-size:24px;font-weight:600;margin:0 0 20px">${escapeHtml(pretty)}</p>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 8px">
            <strong>Connect your existing number</strong> so missed calls roll to it:
          </p>
          <ul style="font-size:14px;line-height:1.8;color:#444;margin:0 0 16px;padding-left:20px">
            <li>Verizon: dial <strong>*71${escapeHtml(input.number.replace('+1', ''))}</strong> from your business phone</li>
            <li>AT&amp;T / T-Mobile: dial <strong>**004*${escapeHtml(input.number)}#</strong></li>
            <li>Landline or VoIP: turn on &ldquo;forward when unanswered&rdquo; in your phone system, pointed at the number above</li>
          </ul>
          <p style="font-size:14px;line-height:1.6;color:#666;margin:0">
            Or publish it directly as your business line. Either way, every answered
            call lands in your pipeline as a lead with the full transcript.
          </p>
        </div>`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}
