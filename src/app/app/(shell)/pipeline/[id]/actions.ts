'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()
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

  const supabase = await createClient()
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
  const supabase = await createClient()

  const { data: item, error: fetchErr } = await supabase
    .from('work_items')
    .select('id, status, public_token, sent_at')
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

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${id}`)
  return {
    ok: true as const,
    data: { public_token: item.public_token as string },
  }
}
