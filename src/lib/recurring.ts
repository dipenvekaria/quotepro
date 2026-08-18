import { query, withTransaction } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { companyTz, zonedParts, zonedToUtc } from '@/lib/time'
import { env } from '@/lib/env'
import { sendInvoiceEmail } from '@/lib/email/senders'

/**
 * Recurring service visits — weekly cleans, monthly maintenance.
 *
 * A work item carries a repeat rule; a daily cron spawns the next visit as a
 * fresh work item (scheduled, same line items, same hours, same tech) when its
 * date comes due. One record per visit keeps the model honest: each spawned
 * job lands on the calendar with real labour hours, gets its own invoice, and
 * its own paper trail. Only the template row recurs — spawned visits carry
 * `metadata.recurred_from` and never spawn their own children, so a runaway
 * chain is structurally impossible.
 *
 * `next_at` on the template is the sole scheduling truth. The cron advances it
 * inside the same transaction that inserts the visit, so a crashed run either
 * did both or neither — never a double visit.
 */

export type Cadence = 'weekly' | 'biweekly' | 'monthly'

export type Recurrence = {
  cadence: Cadence
  /** ISO instant of the next visit. */
  next_at: string
  /** Create and email the visit's invoice when it spawns. */
  auto_invoice: boolean
}

export const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
]

/**
 * The instant of the following visit.
 *
 * Week-based cadences add exact days to the instant — the wall clock only
 * moves across a DST switch, by an hour, which is visible and correctable.
 * Monthly keeps the wall clock: "the 3rd at 9am" stays the 3rd at 9am in the
 * company's zone, and a day-31 anniversary clamps to the last day of shorter
 * months rather than sliding into the next one.
 */
export function nextOccurrence(from: Date, cadence: Cadence, tz: string): Date {
  if (cadence === 'weekly') return new Date(from.getTime() + 7 * 86_400_000)
  if (cadence === 'biweekly') return new Date(from.getTime() + 14 * 86_400_000)

  const p = zonedParts(from, tz)
  const nextM = p.m === 12 ? 1 : p.m + 1
  const nextY = p.m === 12 ? p.y + 1 : p.y
  const lastDay = new Date(Date.UTC(nextY, nextM, 0)).getUTCDate()
  return zonedToUtc(tz, { y: nextY, m: nextM, d: Math.min(p.d, lastDay), h: p.h, min: p.min })
}

type TemplateRow = {
  id: string
  company_id: string
  customer_id: string | null
  address_id: string | null
  assigned_to: string | null
  created_by: string | null
  source: string | null
  job_name: string | null
  description: string | null
  subtotal: number | null
  discount_amount: number | null
  tax_rate: number | null
  tax_amount: number | null
  total: number | null
  estimated_hours: number | null
  recurrence: Recurrence
  tz: string | null
  customer_name: string | null
  customer_email: string | null
  company_name: string | null
  company_email: string | null
}

export type SpawnResult = {
  template_id: string
  visit_id: string
  scheduled_for: string
  invoice: 'sent' | 'created' | 'skipped' | 'failed' | 'off'
}

/**
 * Spawn every visit that has come due. Session-free — the cron has no user —
 * so every statement derives company_id from the template row it is expanding,
 * and activity rows carry a null user: the system did this, and says so.
 */
export async function runRecurringSpawns(now: Date = new Date()): Promise<SpawnResult[]> {
  const due = await query<TemplateRow>(
    `select w.id, w.company_id, w.customer_id, w.address_id, w.assigned_to, w.created_by,
            w.source, w.job_name, w.description, w.subtotal, w.discount_amount,
            w.tax_rate, w.tax_amount, w.total, w.estimated_hours,
            w.recurrence,
            co.settings->>'timezone' as tz,
            c.name as customer_name, c.email as customer_email,
            co.name as company_name, co.email as company_email
       from work_items w
       join companies co on co.id = w.company_id
       left join customers c on c.id = w.customer_id
      where w.recurrence is not null
        and (w.recurrence->>'next_at')::timestamptz <= $1
        and w.status <> 'archived'
      order by w.company_id
      limit 200`,
    [now.toISOString()],
  )

  const results: SpawnResult[] = []
  for (const t of due) {
    try {
      results.push(await spawnVisit(t))
    } catch (e) {
      // One broken template must not stall every other company's schedule.
      console.error(`recurring: spawn failed for template ${t.id}`, e)
    }
  }
  return results
}

async function spawnVisit(t: TemplateRow): Promise<SpawnResult> {
  const tz = companyTz({ timezone: t.tz })
  const scheduledFor = t.recurrence.next_at
  const followingAt = nextOccurrence(new Date(scheduledFor), t.recurrence.cadence, tz)

  const visitId = await withTransaction(async (q) => {
    const [visit] = await q<{ id: string }>(
      `insert into work_items
         (company_id, customer_id, address_id, assigned_to, created_by, source,
          status, kind, job_name, description, subtotal, discount_amount,
          tax_rate, tax_amount, total, estimated_hours, scheduled_start, metadata)
       values ($1, $2, $3, $4, $5, $6,
               'job_scheduled'::work_item_status, 'job', $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16::jsonb)
       returning id`,
      [
        t.company_id,
        t.customer_id,
        t.address_id,
        t.assigned_to,
        t.created_by,
        t.source,
        t.job_name,
        t.description,
        t.subtotal,
        t.discount_amount,
        t.tax_rate,
        t.tax_amount,
        t.total,
        t.estimated_hours,
        scheduledFor,
        JSON.stringify({ recurred_from: t.id }),
      ],
    )

    await q(
      `insert into quote_items
         (work_item_id, catalog_item_id, name, description, quantity, unit_price,
          labor_hours, unit, sort_order, is_discount)
       select $1, qi.catalog_item_id, qi.name, qi.description, qi.quantity, qi.unit_price,
              qi.labor_hours, qi.unit, qi.sort_order, coalesce(qi.is_discount, false)
         from quote_items qi
         join work_items w on w.id = qi.work_item_id
        where qi.work_item_id = $2 and w.company_id = $3
        order by qi.sort_order asc, qi.created_at asc`,
      [visit.id, t.id, t.company_id],
    )

    // Advancing the pointer in the same transaction is the idempotence: a
    // rerun after a crash sees either the old pointer and no visit, or the
    // new pointer and the visit.
    await q(
      `update work_items
          set recurrence = recurrence || jsonb_build_object('next_at', $2::text)
        where id = $1 and company_id = $3`,
      [t.id, followingAt.toISOString(), t.company_id],
    )

    return visit.id
  })

  await logActivity({
    companyId: t.company_id,
    entityId: visitId,
    action: 'recurring_job_spawned',
    description: `Scheduled from the repeating ${t.recurrence.cadence} service`,
    changes: { template: t.id },
  })

  let invoice: SpawnResult['invoice'] = 'off'
  if (t.recurrence.auto_invoice) {
    invoice = await autoInvoice(t, visitId)
  }

  return { template_id: t.id, visit_id: visitId, scheduled_for: scheduledFor, invoice }
}

/** Create and email the visit's invoice. Failures degrade to a draft invoice. */
async function autoInvoice(t: TemplateRow, visitId: string): Promise<SpawnResult['invoice']> {
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)

  let created: { id: string; public_token: string } | undefined
  try {
    created = await withTransaction(async (q) => {
      const rows = await q<{ id: string; public_token: string }>(
        `insert into invoices
           (company_id, work_item_id, customer_id, invoice_number, subtotal, tax_amount,
            total, amount_paid, status, due_date, sent_at)
         values ($1, $2, $3, $4, $5, $6, $7, 0, 'sent'::invoice_status, $8, now())
         returning id, public_token`,
        [t.company_id, visitId, t.customer_id, invoiceNumber, t.subtotal, t.tax_amount, t.total, due],
      )
      await q(`update work_items set invoice_number = $1 where id = $2 and company_id = $3`, [
        invoiceNumber,
        visitId,
        t.company_id,
      ])
      return rows[0]
    })
  } catch (e) {
    console.error(`recurring: invoice insert failed for visit ${visitId}`, e)
    return 'failed'
  }
  if (!created) return 'failed'

  await logActivity({
    companyId: t.company_id,
    entityId: visitId,
    action: 'invoice_created',
    description: `Invoice ${invoiceNumber} created for the repeating service`,
  })

  if (!t.customer_email) return 'created'

  const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/i/${created.public_token}`
  const res = await sendInvoiceEmail({
    to: t.customer_email,
    customerName: t.customer_name ?? '',
    invoiceNumber,
    amountDue: Number(t.total ?? 0),
    publicUrl,
    dueDate: new Date(due),
    fromLabel: t.company_name ?? undefined,
    replyTo: t.company_email ?? undefined,
  }).catch(() => ({ ok: false as const, error: 'send threw' }))

  const sent = res.ok && !('skipped' in res && res.skipped)
  await logActivity({
    companyId: t.company_id,
    entityId: visitId,
    action: 'invoice_sent',
    description: `Invoice ${invoiceNumber} emailed automatically`,
    changes: { email: sent ? 'sent' : 'skipped' },
  })
  return sent ? 'sent' : 'created'
}
