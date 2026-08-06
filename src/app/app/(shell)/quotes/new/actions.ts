'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { query, withTransaction } from '@/lib/db'

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

  const prof = await query<{ company_id: string | null }>(
    'select company_id from users where id = $1 limit 1',
    [user.id],
  )
  const companyId = prof[0]?.company_id
  if (!companyId) return { ok: false as const, error: 'No company' }

  let workItemId: string | undefined
  try {
    const rows = await query<{ id: string }>(
      `select create_work_item_with_customer(
         p_company_id => $1,
         p_customer_name => $2,
         p_customer_phone => $3,
         p_customer_email => $4,
         p_address => $5,
         p_description => $6,
         p_status => $7::work_item_status
       ) as id`,
      [
        companyId,
        parsed.data.customer_name,
        parsed.data.customer_phone || null,
        parsed.data.customer_email || null,
        parsed.data.address || null,
        parsed.data.description,
        'quote_draft',
      ],
    )
    workItemId = rows[0]?.id
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed to create quote' }
  }

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated' }

  const prof = await query<{ company_id: string | null }>(
    'select company_id from users where id = $1 limit 1',
    [user.id],
  )
  const companyId = prof[0]?.company_id
  if (!companyId) return { ok: false as const, error: 'No company' }

  // Ownership check — pg bypasses RLS, so scope the work item to the company.
  const owns = await query<{ id: string }>(
    'select id from work_items where id = $1 and company_id = $2 limit 1',
    [parsed.data.work_item_id, companyId],
  )
  if (!owns[0]) return { ok: false as const, error: 'Work item not found' }

  const subtotal = parsed.data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxRate = parsed.data.tax_rate ?? 8.5
  const taxAmount = Math.round(subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  try {
    await withTransaction(async (q) => {
      await q('delete from quote_items where work_item_id = $1', [parsed.data.work_item_id])

      if (parsed.data.items.length) {
        const values: unknown[] = []
        const tuples = parsed.data.items.map((i, idx) => {
          const b = idx * 8
          values.push(
            parsed.data.work_item_id,
            i.name,
            i.description ?? null,
            i.quantity,
            i.unit_price,
            i.sort_order,
            i.is_upsell ?? false,
            i.is_discount ?? false,
          )
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8})`
        })
        await q(
          `insert into quote_items
             (work_item_id, name, description, quantity, unit_price, sort_order, is_upsell, is_discount)
           values ${tuples.join(', ')}`,
          values,
        )
      }

      await q(
        `update work_items
            set subtotal = $1, tax_rate = $2, tax_amount = $3, total = $4
          where id = $5`,
        [
          Number(subtotal.toFixed(2)),
          taxRate,
          Number(taxAmount.toFixed(2)),
          Number(total.toFixed(2)),
          parsed.data.work_item_id,
        ],
      )
    })
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed to save line items' }
  }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/quotes/${parsed.data.work_item_id}`)
  return { ok: true as const, data: { subtotal, tax_amount: taxAmount, total } }
}
