'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { env } from '@/lib/env'
import { sendQuoteEmail } from '@/lib/email/senders'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

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
  if (d.assigned_to !== undefined) add('assigned_to', d.assigned_to)
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
})

export async function changeStatus(input: z.infer<typeof statusSchema>) {
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid status' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const now = new Date().toISOString()
  const values: unknown[] = [parsed.data.to]
  const sets = ['status = $1::work_item_status']
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

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${parsed.data.id}`)
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
    `select name, quantity, unit_price, sort_order from quote_items where work_item_id = $1`,
    [id],
  )

  const sentAt = item.sent_at ?? new Date().toISOString()
  try {
    await query(
      `update work_items set status = 'quote_sent'::work_item_status, sent_at = $1
        where id = $2 and company_id = $3`,
      [sentAt, id, session.companyId],
    )
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Update failed' }
  }

  // Best-effort email (never blocks the send action).
  let emailResult: 'sent' | 'skipped' | 'error' = 'skipped'
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
      emailResult = res.ok && !('skipped' in res && res.skipped) ? 'sent' : res.ok ? 'skipped' : 'error'
    } catch {
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
