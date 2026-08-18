'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { env } from '@/lib/env'
import { logActivity } from '@/lib/activity'
import { explainQuote } from '@/lib/ai/explain'
import { AiUnavailableError } from '@/lib/ai/gemini'
import { sendQuoteEmail } from '@/lib/email/senders'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { liveTierPredicate } from '@/lib/quotes/items'
import { canAssignWork } from '@/lib/auth/scope'
import type { UserRole } from '@/lib/permissions'
import {
  NOMINAL_JOB_HOURS,
  bookedHoursOn,
  capacityOn,
  loadBookings,
  loadBusinessHours,
  suggestSlots,
} from '@/lib/scheduling/availability'

// ---------------------------------------------------------------------------

const updateSchema = z.object({
  id: z.string().uuid(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(4000).optional(),
  job_name: z.string().max(200).optional(),
  scheduled_start: z.string().datetime().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
})

export type UpdateWorkItemInput = z.infer<typeof updateSchema>

export async function updateWorkItem(input: UpdateWorkItemInput) {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const d = parsed.data
  const values: unknown[] = []
  const sets: string[] = []
  const add = (col: string, val: unknown) => {
    values.push(val)
    sets.push(`${col} = $${values.length}`)
  }
  if (d.description !== undefined) add('description', d.description)
  if (d.notes !== undefined) add('notes', d.notes)
  if (d.job_name !== undefined) add('job_name', d.job_name)
  if (d.scheduled_start !== undefined) add('scheduled_start', d.scheduled_start)
  // Handing work to someone is a dispatch decision. A technician reassigning
  // their own job — or someone else's — is not a thing the business wants, and
  // the field being present in a payload is not authorisation.
  if (d.assigned_to !== undefined) {
    if (!canAssignWork(session.role as UserRole)) {
      return { ok: false as const, error: 'Only an owner or the office can assign work.' }
    }
    add('assigned_to', d.assigned_to)
  }
  if (!sets.length) return { ok: true as const }

  values.push(d.id)
  const idParam = `$${values.length}`
  values.push(session.companyId)
  const companyParam = `$${values.length}`

  let rows: { id: string }[]
  try {
    rows = await query<{ id: string }>(
      `update work_items set ${sets.join(', ')}
        where id = ${idParam} and company_id = ${companyParam}
        returning id`,
      values,
    )
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Update failed' }
  }
  if (!rows[0]) return { ok: false as const, error: 'Not found or no permission' }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${parsed.data.id}`)
  return { ok: true as const }
}

// ---------------------------------------------------------------------------

const statusSchema = z.object({
  id: z.string().uuid(),
  to: z.enum([
    'lead',
    'quote_draft',
    'quote_sent',
    'quote_viewed',
    'quote_accepted',
    'quote_rejected',
    'quote_expired',
    'job_scheduled',
    'job_in_progress',
    'job_completed',
    'job_cancelled',
    'archived',
  ]),
  /** Required when moving to job_scheduled. Ignored otherwise. */
  scheduled_start: z.string().datetime().nullable().optional(),
})

export async function changeStatus(input: z.infer<typeof statusSchema>) {
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid status' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  // A job is not scheduled until it has a date. "Schedule job" used to change
  // only the status, leaving scheduled_start null — so the work item said
  // "scheduled" everywhere while the calendar, which requires a date, never
  // showed it. The two halves are now one action.
  if (parsed.data.to === 'job_scheduled' && !parsed.data.scheduled_start) {
    return { ok: false as const, error: 'Pick a date and time to schedule this job.' }
  }

  // Work cannot start before it is booked in. Enforced here and not only in the
  // UI, because the button layout is not access control.
  if (parsed.data.to === 'job_in_progress') {
    const [row] = await query<{ scheduled_start: string | null }>(
      `select scheduled_start from work_items where id = $1 and company_id = $2`,
      [parsed.data.id, session.companyId],
    )
    if (!row) return { ok: false as const, error: 'Not found' }
    if (!row.scheduled_start) {
      return { ok: false as const, error: 'Schedule this job before starting it.' }
    }
  }

  const now = new Date().toISOString()
  const values: unknown[] = [parsed.data.to]
  const sets = ['status = $1::work_item_status']

  if (parsed.data.to === 'job_scheduled' && parsed.data.scheduled_start) {
    values.push(parsed.data.scheduled_start)
    sets.push(`scheduled_start = $${values.length}`)
  }
  const tsCol: Record<string, string | undefined> = {
    quote_sent: 'sent_at',
    quote_viewed: 'viewed_at',
    quote_accepted: 'accepted_at',
    quote_rejected: 'rejected_at',
    job_completed: 'completed_at',
  }
  const col = tsCol[parsed.data.to]
  if (col) {
    values.push(now)
    sets.push(`${col} = $${values.length}`)
  }
  values.push(parsed.data.id)
  const idParam = `$${values.length}`
  values.push(session.companyId)
  const companyParam = `$${values.length}`

  try {
    const rows = await query<{ id: string }>(
      `update work_items set ${sets.join(', ')}
        where id = ${idParam} and company_id = ${companyParam}
        returning id`,
      values,
    )
    if (!rows[0]) return { ok: false as const, error: 'Not found or no permission' }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Update failed' }
  }

  if (parsed.data.to === 'job_scheduled') {
    await logActivity({
      companyId: session.companyId,
      userId: session.userId,
      entityId: parsed.data.id,
      action: 'job_scheduled',
      description: 'Job scheduled',
      changes: { scheduled_start: parsed.data.scheduled_start },
    })
  }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${parsed.data.id}`)
  // Scheduling puts the job on the calendar, so that view is now stale too.
  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
  return { ok: true as const }
}

// ---------------------------------------------------------------------------

export async function sendQuote(id: string) {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const [item] = await query<{
    id: string
    status: string
    public_token: string
    sent_at: string | null
    total: number | null
    quote_number: string | null
    customer_name: string | null
    customer_email: string | null
    company_name: string | null
    company_email: string | null
  }>(
    `select w.id, w.status, w.public_token, w.sent_at, w.total, w.quote_number,
            c.name as customer_name, c.email as customer_email,
            co.name as company_name, co.email as company_email
       from work_items w
       left join customers c on c.id = w.customer_id
       left join companies co on co.id = w.company_id
      where w.id = $1 and w.company_id = $2
      limit 1`,
    [id, session.companyId],
  )
  if (!item) return { ok: false as const, error: 'Not found' }

  const quoteItemRows = await query<{
    name: string
    quantity: number
    unit_price: number
    sort_order: number | null
  }>(
    `select name, quantity, unit_price, sort_order from quote_items qi
      where work_item_id = $1${liveTierPredicate(1)}`,
    [id],
  )

  const sentAt = item.sent_at ?? new Date().toISOString()

  /*
    Give the quote a shelf life.

    `expires_at` has been honoured everywhere it is read — the public viewer,
    the PDF, and follow-ups which stop chasing an expired quote — and there was
    nothing anywhere that could set it. A column read by three consumers and
    written by none.

    Set at send rather than at draft, because a quote is not offered until it
    is sent, and set only if it is still unset so re-sending never quietly
    shortens a deadline the customer has already been given.

    Thirty days is the default a contractor would pick themselves, and it is
    long enough that nobody is caught out by software they did not configure.
    `settings.quote_valid_days` overrides it.
  */
  const [companyRow] = await query<{ settings: { quote_valid_days?: number } | null }>(
    'select settings from companies where id = $1 limit 1',
    [session.companyId],
  )
  const validDays = Number(companyRow?.settings?.quote_valid_days ?? 30)
  const expiresAt = new Date(
    new Date(sentAt).getTime() + Math.max(1, validDays) * 86_400_000,
  ).toISOString()

  try {
    await query(
      `update work_items
          set status = 'quote_sent'::work_item_status,
              sent_at = $1,
              expires_at = coalesce(expires_at, $4::timestamptz)
        where id = $2 and company_id = $3`,
      [sentAt, id, session.companyId, expiresAt],
    )
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Update failed' }
  }

  await logActivity({
    companyId: session.companyId,
    userId: session.userId,
    entityId: id,
    action: 'quote_sent',
    description: 'Quote sent to the customer',
  })

  // Best-effort email (never blocks the send action).
  //
  // The outcomes are reported separately because they need different actions
  // from the contractor. This used to collapse them all into "skipped", and the
  // UI rendered that as "no email on file" — so an unconfigured mailer looked
  // like a missing customer address, and the contractor went hunting through
  // their customer record for a problem that was ours.
  let emailResult: 'sent' | 'no_address' | 'not_configured' | 'error' = 'no_address'
  if (item.customer_email) {
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/q/${item.public_token}`
    const items = quoteItemRows
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((li) => ({ name: li.name, quantity: li.quantity, unit_price: li.unit_price }))
    try {
      const res = await sendQuoteEmail({
        to: item.customer_email,
        customerName: item.customer_name ?? '',
        quoteNumber: item.quote_number ?? `Q-${item.public_token.slice(0, 6).toUpperCase()}`,
        total: Number(item.total ?? 0),
        publicUrl,
        items,
        fromLabel: item.company_name ?? undefined,
        replyTo: item.company_email ?? undefined,
      })
      if (!res.ok) {
        console.error(`sendQuote: email failed for ${id}: ${res.error}`)
        emailResult = 'error'
      } else if ('skipped' in res && res.skipped) {
        // The mailer is off, not the customer's address missing.
        console.error(`sendQuote: email not configured (${res.reason})`)
        emailResult = 'not_configured'
      } else {
        emailResult = 'sent'
      }
    } catch (e) {
      console.error(`sendQuote: email threw for ${id}`, e)
      emailResult = 'error'
    }
  }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${id}`)
  return {
    ok: true as const,
    data: { public_token: item.public_token, email: emailResult },
  }
}

// -----------------------------------------------------------------------------
// Plain-language explanation for the customer
// -----------------------------------------------------------------------------

const explainSchema = z.object({ work_item_id: z.string().uuid() })

/**
 * Writes a homeowner-readable summary of the quote onto the work item.
 *
 * Generated on demand and stored rather than produced per page view: the
 * customer must see the same words each time they open the link, a quote that
 * has been accepted should keep the text it was accepted with, and generating
 * on view would bill a model call for every visit including crawlers.
 *
 * Prices are deliberately not sent to the model — they are rendered directly
 * beneath this text, and a model that cannot see them cannot contradict them.
 */
export async function generateCustomerSummary(input: unknown) {
  const parsed = explainSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const { companyId } = session

  const [work] = await query<{ id: string; description: string | null; company_name: string | null }>(
    `select w.id, w.description, c.name as company_name
       from work_items w
       left join companies c on c.id = w.company_id
      where w.id = $1 and w.company_id = $2
      limit 1`,
    [parsed.data.work_item_id, companyId],
  )
  if (!work) return { ok: false as const, error: 'Quote not found' }

  const items = await query<{ name: string; description: string | null; quantity: number }>(
    `select qi.name, qi.description, qi.quantity
       from quote_items qi
       join work_items w on w.id = qi.work_item_id
      where qi.work_item_id = $1 and w.company_id = $2${liveTierPredicate(1)}
      order by qi.sort_order`,
    [parsed.data.work_item_id, companyId],
  )
  if (items.length === 0) {
    return { ok: false as const, error: 'Add line items before writing a summary.' }
  }

  let summary: string
  try {
    const result = await explainQuote({
      companyName: work.company_name,
      jobDescription: work.description,
      lineItems: items,
    })
    summary = result.summary
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return {
        ok: false as const,
        error: 'AI is unavailable right now — nothing was written. Try again in a minute.',
      }
    }
    console.error('generateCustomerSummary failed', e)
    return { ok: false as const, error: 'Could not write the summary. Try again.' }
  }

  if (!summary) {
    // An empty result means the model failed or had too little to work with.
    // Showing nothing is correct; inventing an explanation is not.
    return { ok: false as const, error: 'Not enough detail in the line items to explain.' }
  }

  try {
    await query(
      `update work_items set customer_summary = $1 where id = $2 and company_id = $3`,
      [summary, parsed.data.work_item_id, companyId],
    )
  } catch (e) {
    console.error('generateCustomerSummary failed', e)
    return { ok: false as const, error: 'Could not save the summary.' }
  }

  revalidatePath(`/app/pipeline/${parsed.data.work_item_id}`)
  return { ok: true as const, data: { summary } }
}

// ---------------------------------------------------------------------------
// Scheduling context
//
// What the scheduling dialog needs to be useful rather than a blank date field:
// how long this job actually takes, what is already booked, and which times
// genuinely fit. The duration comes from the quote's own line items, which is
// the thing no competitor can do — their price book is a name and a price.
// ---------------------------------------------------------------------------

export type SchedulingDay = {
  /** ISO date, yyyy-mm-dd. */
  date: string
  capacityHours: number
  bookedHours: number
  jobs: { id: string; title: string; startsAt: string; hours: number | null }[]
}

export type SchedulingContext = {
  estimatedHours: number | null
  suggestions: { startsAt: string; endsAt: string }[]
  days: SchedulingDay[]
}

export async function getSchedulingContext(workItemId: string): Promise<
  { ok: true; data: SchedulingContext } | { ok: false; error: string }
> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const [item] = await query<{ estimated_hours: number | null; assigned_to: string | null }>(
    `select estimated_hours, assigned_to from work_items
      where id = $1 and company_id = $2 limit 1`,
    [workItemId, session.companyId],
  )
  if (!item) return { ok: false, error: 'Not found' }

  const from = new Date()
  const to = new Date(from)
  to.setDate(to.getDate() + 14)

  const [businessHours, bookings] = await Promise.all([
    loadBusinessHours(session.companyId),
    loadBookings(session.companyId, from, to),
  ])

  // Exclude this job's own existing booking, or rescheduling it would collide
  // with itself and every suggestion would skip its current slot.
  const others = bookings.filter((b) => b.id !== workItemId)

  const hours = item.estimated_hours === null ? null : Number(item.estimated_hours)

  const suggestions = suggestSlots({
    hours: hours ?? NOMINAL_JOB_HOURS,
    bookings: others,
    businessHours,
    from,
    assignedTo: item.assigned_to,
  }).map((s) => ({ startsAt: s.start.toISOString(), endsAt: s.end.toISOString() }))

  const days: SchedulingDay[] = []
  for (let i = 0; i < 14; i++) {
    const day = new Date(from)
    day.setDate(day.getDate() + i)
    day.setHours(0, 0, 0, 0)
    const next = new Date(day)
    next.setDate(next.getDate() + 1)

    days.push({
      date: day.toISOString().slice(0, 10),
      capacityHours: capacityOn(day, businessHours),
      bookedHours: Math.round(bookedHoursOn(day, others) * 10) / 10,
      jobs: others
        .filter((b) => b.start >= day && b.start < next)
        .map((b) => ({
          id: b.id,
          title: b.customerName ?? b.title,
          startsAt: b.start.toISOString(),
          hours: b.estimatedHours,
        })),
    })
  }

  return { ok: true, data: { estimatedHours: hours, suggestions, days } }
}
