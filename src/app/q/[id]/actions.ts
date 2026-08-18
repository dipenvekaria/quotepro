'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { logActivity } from '@/lib/activity'
import { sbAdmin } from '@/lib/supabase/untyped'

// ---------------------------------------------------------------------------

const acceptSchema = z.object({
  token: z.string().min(20).max(64),
  signer_name: z.string().min(2).max(200),
})

export async function acceptQuote(input: z.infer<typeof acceptSchema>) {
  const parsed = acceptSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const admin = sbAdmin()

  const { data: item, error: fetchErr } = await admin
    .from('work_items')
    .select('id, company_id, status, metadata')
    .eq('public_token', parsed.data.token)
    .maybeSingle()

  if (fetchErr) return { ok: false as const, error: fetchErr.message }
  if (!item) return { ok: false as const, error: 'Quote not found' }
  if (!['quote_sent', 'quote_viewed'].includes(item.status as string)) {
    return { ok: false as const, error: 'This quote can no longer be accepted.' }
  }

  const metadata = { ...(item.metadata as object ?? {}), signed_by: parsed.data.signer_name }
  const now = new Date().toISOString()

  const { error: updErr } = await admin
    .from('work_items')
    .update({ status: 'quote_accepted', accepted_at: now, metadata })
    .eq('id', item.id)

  if (updErr) return { ok: false as const, error: updErr.message }

  await logActivity({
    companyId: item.company_id as string,
    entityId: item.id as string,
    action: 'quote_accepted',
    description: `Accepted by ${parsed.data.signer_name}`,
    changes: { signed_by: parsed.data.signer_name },
  })

  revalidatePath(`/q/${parsed.data.token}`)
  return { ok: true as const }
}

// ---------------------------------------------------------------------------

const declineSchema = z.object({
  token: z.string().min(20).max(64),
  reason: z.string().max(1000).optional(),
})

export async function declineQuote(input: z.infer<typeof declineSchema>) {
  const parsed = declineSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const admin = sbAdmin()

  const { data: item } = await admin
    .from('work_items')
    .select('id, company_id, status, metadata')
    .eq('public_token', parsed.data.token)
    .maybeSingle()

  if (!item) return { ok: false as const, error: 'Quote not found' }
  if (!['quote_sent', 'quote_viewed'].includes(item.status as string)) {
    return { ok: false as const, error: 'This quote can no longer be declined.' }
  }

  const metadata = {
    ...(item.metadata as object ?? {}),
    declined_reason: parsed.data.reason ?? '',
  }
  const now = new Date().toISOString()

  const { error } = await admin
    .from('work_items')
    .update({ status: 'quote_rejected', rejected_at: now, metadata })
    .eq('id', item.id)

  if (error) return { ok: false as const, error: error.message }

  await logActivity({
    companyId: item.company_id as string,
    entityId: item.id as string,
    action: 'quote_declined',
    description: parsed.data.reason ? `Declined: ${parsed.data.reason}` : 'Declined',
    changes: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
  })

  revalidatePath(`/q/${parsed.data.token}`)
  return { ok: true as const }
}

// ---------------------------------------------------------------------------

export async function markQuoteViewed(token: string) {
  const admin = sbAdmin()

  const { data: item } = await admin
    .from('work_items')
    .select('id, company_id, status, viewed_at')
    .eq('public_token', token)
    .maybeSingle()

  if (!item) return { ok: false as const }

  // Only bump viewed_at + status if it's still in sent state and we haven't
  // recorded a view yet.
  if (item.status === 'quote_sent' && !item.viewed_at) {
    await admin
      .from('work_items')
      .update({ status: 'quote_viewed', viewed_at: new Date().toISOString() })
      .eq('id', item.id)

    await logActivity({
      companyId: item.company_id as string,
      entityId: item.id as string,
      action: 'quote_viewed',
      description: 'Customer opened the quote',
    })
  }

  return { ok: true as const }
}
