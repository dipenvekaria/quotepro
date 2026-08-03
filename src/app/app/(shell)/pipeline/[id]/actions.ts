'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { env } from '@/lib/env'
import { sendQuoteEmail } from '@/lib/email/senders'
import { sbServer } from '@/lib/supabase/untyped'

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

  const supabase = await sbServer()
  const { data, error } = await supabase
    .from('work_items')
    .update(parsed.data)
    .eq('id', parsed.data.id)
    .select('id')
    .maybeSingle()

  if (error) return { ok: false as const, error: error.message }
  if (!data) return { ok: false as const, error: 'Not found or no permission' }

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

  const supabase = await sbServer()
  const now = new Date().toISOString()
  const patch: Record<string, string | null> = { status: parsed.data.to }
  if (parsed.data.to === 'quote_sent') patch.sent_at = now
  else if (parsed.data.to === 'quote_viewed') patch.viewed_at = now
  else if (parsed.data.to === 'quote_accepted') patch.accepted_at = now
  else if (parsed.data.to === 'quote_rejected') patch.rejected_at = now
  else if (parsed.data.to === 'job_completed') patch.completed_at = now

  const { error } = await supabase.from('work_items').update(patch).eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: error.message }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${parsed.data.id}`)
  return { ok: true as const }
}

// ---------------------------------------------------------------------------

export async function sendQuote(id: string) {
  const supabase = await sbServer()

  const { data: item, error: fetchErr } = await supabase
    .from('work_items')
    .select(`
      id, status, public_token, sent_at, total, quote_number,
      customers!work_items_customer_id_fkey (name, email),
      companies (name, email),
      quote_items (name, quantity, unit_price, sort_order)
    `)
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) return { ok: false as const, error: fetchErr.message }
  if (!item) return { ok: false as const, error: 'Not found' }

  const patch: Record<string, string> = {
    status: 'quote_sent',
    sent_at: item.sent_at ?? new Date().toISOString(),
  }

  const { error } = await supabase.from('work_items').update(patch).eq('id', id)
  if (error) return { ok: false as const, error: error.message }

  // Best-effort email (never blocks the send action).
  let emailResult: 'sent' | 'skipped' | 'error' = 'skipped'
  const cust = item.customers as unknown as { name: string; email: string | null } | null
  const comp = item.companies as unknown as { name: string; email: string | null } | null
  if (cust?.email) {
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/q/${item.public_token}`
    const items = ((item.quote_items ?? []) as Array<{ name: string; quantity: number; unit_price: number; sort_order: number }>)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((li) => ({ name: li.name, quantity: li.quantity, unit_price: li.unit_price }))
    try {
      const res = await sendQuoteEmail({
        to: cust.email,
        customerName: cust.name,
        quoteNumber: item.quote_number ?? `Q-${item.public_token.slice(0, 6).toUpperCase()}`,
        total: Number(item.total ?? 0),
        publicUrl,
        items,
        fromLabel: comp?.name,
        replyTo: comp?.email ?? undefined,
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
    data: { public_token: item.public_token as string, email: emailResult },
  }
}
