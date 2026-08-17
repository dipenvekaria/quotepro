import { query } from '@/lib/db'

/**
 * The company's headline numbers, defined once.
 *
 * The dashboard and `/app/analytics` each computed quotes-sent, acceptance rate
 * and revenue from their own query, and disagreed in two ways at once.
 *
 * **Cosmetically:** "Close rate 71%" against "Acceptance rate 71.4%", "$2.5k"
 * against "$2,471". Two identically-labelled tiles showing different numbers
 * reads as a bug in the arithmetic rather than a difference in rounding, and a
 * contractor who cannot tell which is right stops trusting both.
 *
 * **Substantively, and worse:** the populations differed. The dashboard loaded
 * rows by `created_at >= 60 days`; analytics loaded them by `sent_at >= 84
 * days`. A quote *created* two months ago and *sent* last week was in one
 * number and absent from the other — and a stalled quote that finally went out
 * is exactly the case this product exists to chase.
 *
 * `sent_at` is the correct population. A quote's metrics belong to when it was
 * offered to a customer, not when someone started typing it.
 */

export type MetricRow = {
  id: string
  status: string
  total: number
  sent_at: string | null
  accepted_at: string | null
  updated_at: string | null
}

export type CompanyMetrics = {
  /** Every quote sent inside the window, for callers that need to bucket them. */
  rows: MetricRow[]
  quotesSent: number
  quotesAccepted: number
  /** 0–100, unrounded. Round at the point of display, once. */
  acceptanceRate: number
  revenue: number
  openPipeline: number
}

const DAY = 86_400_000

/**
 * Rows for the last `weeks` weeks by **sent date**, plus the 30-day summary.
 *
 * `weeks` only widens the row set for callers that chart a longer history; the
 * summary is always the last 30 days, so the two screens cannot drift by asking
 * for different windows.
 */
export async function loadCompanyMetrics(
  companyId: string,
  opts: { weeks?: number } = {},
): Promise<CompanyMetrics> {
  const weeks = opts.weeks ?? 12
  const since = new Date(Date.now() - weeks * 7 * DAY).toISOString()

  const [rows, open] = await Promise.all([
    query<MetricRow>(
      `select id, status::text as status, total, sent_at, accepted_at, updated_at
         from work_items
        where company_id = $1 and sent_at is not null and sent_at >= $2`,
      [companyId, since],
    ),
    // Open pipeline is a snapshot, not a window: a quote sent four months ago
    // and still open is still money on the table. Bounding it by the same
    // window would quietly shrink the number the longer a quote sat unanswered,
    // which is precisely backwards.
    query<{ open_pipeline: number }>(
      `select coalesce(sum(total), 0)::numeric as open_pipeline
         from work_items
        where company_id = $1
          and status::text = any($2::text[])`,
      [companyId, ['quote_sent', 'quote_accepted', 'job_scheduled', 'job_in_progress']],
    ),
  ])

  return { rows, ...summarise(rows), openPipeline: Number(open[0]?.open_pipeline ?? 0) }
}

/** The 30-day summary. Exported and pure, so it can be tested without a database. */
export function summarise(
  rows: MetricRow[],
  now = Date.now(),
): Omit<CompanyMetrics, 'rows' | 'openPipeline'> {
  const from = now - 30 * DAY
  const within = (iso: string | null) => {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return t >= from && t <= now
  }

  const quotesSent = rows.filter((r) => within(r.sent_at)).length
  const quotesAccepted = rows.filter((r) => within(r.accepted_at)).length
  const revenue = rows
    .filter((r) => r.status === 'job_completed' && within(r.updated_at))
    .reduce((s, r) => s + Number(r.total || 0), 0)

  return {
    quotesSent,
    quotesAccepted,
    acceptanceRate: quotesSent > 0 ? (quotesAccepted / quotesSent) * 100 : 0,
    revenue,
  }
}

/**
 * One rendering of each number, so the two screens cannot disagree on rounding.
 *
 * Whole percent rather than one decimal: 71.4% implies a precision that seven
 * quotes do not have, and the extra digit is what made two tiles showing the
 * same figure look like they disagreed.
 */
export const fmtRate = (rate: number) => `${Math.round(rate)}%`

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
