'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

// -----------------------------------------------------------------------------
// Create a draft quote (with customer upsert) via the atomic RPC.
// -----------------------------------------------------------------------------

const createDraftSchema = z.object({
  customer_name: z.string().min(1).max(200),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().min(1).max(2000),
})

export type CreateDraftInput = z.infer<typeof createDraftSchema>

export async function createDraftQuote(input: CreateDraftInput) {
  const parsed = createDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) return { ok: false as const, error: 'No company' }

  const { data: workItemId, error } = await supabase.rpc('create_work_item_with_customer', {
    p_company_id: profile.company_id,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone || null,
    p_customer_email: parsed.data.customer_email || null,
    p_address: parsed.data.address || null,
    p_description: parsed.data.description,
    p_status: 'quote_draft',
  })

  if (error) return { ok: false as const, error: error.message }
  if (!workItemId) return { ok: false as const, error: 'No id returned' }

  revalidatePath('/app/pipeline')
  return { ok: true as const, data: { id: String(workItemId) } }
}

// -----------------------------------------------------------------------------
// Save line items on a quote (replace-all).
// -----------------------------------------------------------------------------

const saveLineItemsSchema = z.object({
  work_item_id: z.string().uuid(),
  items: z.array(
    z.object({
      name: z.string().min(1).max(300),
      description: z.string().nullable().optional(),
      quantity: z.number().positive(),
      unit_price: z.number(),
      sort_order: z.number().int().nonnegative(),
      is_upsell: z.boolean().optional(),
      is_discount: z.boolean().optional(),
    }),
  ),
  tax_rate: z.number().min(0).max(30).optional(),
})

export type SaveLineItemsInput = z.infer<typeof saveLineItemsSchema>

export async function saveLineItems(input: SaveLineItemsInput) {
  const parsed = saveLineItemsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  // Delete existing items + insert new (simplest correct approach)
  const { error: delErr } = await supabase
    .from('quote_items')
    .delete()
    .eq('work_item_id', parsed.data.work_item_id)

  if (delErr) return { ok: false as const, error: delErr.message }

  if (parsed.data.items.length) {
    const rows = parsed.data.items.map((i) => ({
      work_item_id: parsed.data.work_item_id,
      name: i.name,
      description: i.description ?? null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      sort_order: i.sort_order,
      is_upsell: i.is_upsell ?? false,
      is_discount: i.is_discount ?? false,
    }))

    const { error: insErr } = await supabase.from('quote_items').insert(rows)
    if (insErr) return { ok: false as const, error: insErr.message }
  }

  // Recalculate work_item totals
  const subtotal = parsed.data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxRate = parsed.data.tax_rate ?? 8.5
  const taxAmount = Math.round(subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  const { error: updErr } = await supabase
    .from('work_items')
    .update({
      subtotal: Number(subtotal.toFixed(2)),
      tax_rate: taxRate,
      tax_amount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
    })
    .eq('id', parsed.data.work_item_id)

  if (updErr) return { ok: false as const, error: updErr.message }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/quotes/${parsed.data.work_item_id}`)
  return { ok: true as const, data: { subtotal, tax_amount: taxAmount, total } }
}
