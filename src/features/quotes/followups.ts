'server-only'

import { env } from '@/lib/env'
import { query } from '@/lib/db'
import { sendQuoteFollowUpEmail } from '@/lib/email/senders'

/**
 * Automated quote follow-up.
 *
 * A quote sent and never chased is a lost job — docs/GTM_PRODUCT_CHECKLIST.md §3
 * calls this the biggest revenue lever in the category, and every competitor
 * gates it behind a higher tier.
 *
 * Deliberately conservative about how hard it chases. A contractor's reputation
 * is the product here; an over-eager nudge costs them the customer, which is a
 * far worse outcome than a quote going cold. Hence a cap, a gap, and a hard
 * stop once a quote has expired.
 */

/** Days after sending before the first nudge. */
const FIRST_AFTER_DAYS = 3
/** Minimum days between nudges. */
const GAP_DAYS = 4
/** Total nudges per quote. Three is a follow-up; more is harassment. */
const MAX_FOLLOWUPS = 2

export type FollowUpRow = {
  id: string
  quote_number: string | null
  total: number | null
  public_token: string
  followup_count: number
  customer_name: string | null
  customer_email: string | null
  company_name: string | null
  company_email: string | null
}

/**
 * Quotes that are sent, unaccepted, old enough, not yet exhausted, and not
 * expired.
 *
 * `status` carries acceptance rather than `accepted_at` being merely set: the
 * lifecycle moves the row out of quote_sent/quote_viewed the moment a customer
 * accepts, so filtering on status is what actually prevents chasing a won job.
 */
export async function findDueFollowUps(companyId: string): Promise<FollowUpRow[]> {
  return query<FollowUpRow>(
    `select w.id, w.quote_number, w.total, w.public_token, w.followup_count,
            cu.name as customer_name, cu.email as customer_email,
            co.name as company_name, co.email as company_email
       from work_items w
       left join customers cu on cu.id = w.customer_id
       left join companies co on co.id = w.company_id
      where w.company_id = $1
        and w.status in ('quote_sent', 'quote_viewed')
        and w.sent_at is not null
        and w.accepted_at is null
        and w.followup_count < $2
        and w.sent_at < now() - ($3 || ' days')::interval
        and (w.last_followup_at is null
             or w.last_followup_at < now() - ($4 || ' days')::interval)
        and (w.expires_at is null or w.expires_at > now())
        and cu.email is not null
      order by w.sent_at
      limit 200`,
    [companyId, MAX_FOLLOWUPS, FIRST_AFTER_DAYS, GAP_DAYS],
  )
}

/**
 * Sends the due follow-ups for one company.
 *
 * The counter is bumped before the send, not after. A double-send is a customer
 * receiving the same nudge twice from a contractor who looks careless; a missed
 * send is a quote chased a few days later on the next sweep. The second failure
 * is much cheaper than the first.
 */
export async function sendQuoteFollowUps(companyId: string) {
  const due = await findDueFollowUps(companyId)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const q of due) {
    if (!q.customer_email) continue

    const claimed = await query<{ id: string }>(
      `update work_items
          set followup_count = followup_count + 1,
              last_followup_at = now()
        where id = $1 and company_id = $2 and followup_count = $3
        returning id`,
      [q.id, companyId, q.followup_count],
    )
    // Another sweep got there first. Not an error.
    if (!claimed[0]) continue

    const result = await sendQuoteFollowUpEmail({
      to: q.customer_email,
      customerName: q.customer_name ?? 'there',
      quoteNumber: q.quote_number ?? 'your quote',
      total: Number(q.total ?? 0),
      publicUrl: `${env.NEXT_PUBLIC_APP_URL}/q/${q.public_token}`,
      attempt: q.followup_count + 1,
      fromLabel: q.company_name ?? undefined,
      replyTo: q.company_email ?? undefined,
    })

    if (result.ok && !result.skipped) {
      sent++
    } else {
      // `skipped` means no RESEND_API_KEY — nothing was delivered. Counting it
      // as sent would spend both of a quote's follow-ups on emails that never
      // existed, and the quote could never be chased again once email was
      // configured. An unconfigured mailer must consume nothing.
      if (result.ok) skipped++
      else failed++
      // Give the quote its attempt back so a Resend outage doesn't silently
      // consume a customer's only follow-up.
      await query(
        `update work_items
            set followup_count = greatest(followup_count - 1, 0),
                last_followup_at = $3
          where id = $1 and company_id = $2`,
        [q.id, companyId, q.followup_count === 0 ? null : new Date().toISOString()],
      )
      if (!result.ok) console.error(`quote followup failed for ${q.id}: ${result.error}`)
    }
  }

  if (skipped > 0) {
    console.warn(
      `quote followups: ${skipped} not sent — RESEND_API_KEY is not configured, so no customer is being chased`,
    )
  }

  return { due: due.length, sent, failed, skipped }
}

/**
 * Every company with a quote due a nudge. Used by the cron sweep, which is the
 * one caller with no session to scope by.
 */
export async function companiesWithDueFollowUps(): Promise<string[]> {
  const rows = await query<{ company_id: string }>(
    `select distinct w.company_id
       from work_items w
       join customers cu on cu.id = w.customer_id
      where w.status in ('quote_sent', 'quote_viewed')
        and w.sent_at is not null
        and w.accepted_at is null
        and w.followup_count < $1
        and w.sent_at < now() - ($2 || ' days')::interval
        and (w.last_followup_at is null
             or w.last_followup_at < now() - ($3 || ' days')::interval)
        and (w.expires_at is null or w.expires_at > now())
        and cu.email is not null`,
    [MAX_FOLLOWUPS, FIRST_AFTER_DAYS, GAP_DAYS],
  )
  return rows.map((r) => r.company_id)
}
