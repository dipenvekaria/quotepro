'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { NoCatalogError, generateQuote } from '@/lib/ai/quote'
import { query, withTransaction, withUser } from '@/lib/db'
import { computeTotals } from '@/lib/money'

// -----------------------------------------------------------------------------
// AI quote generation.
//
// This runs server-side deliberately. The browser used to call the AI service
// directly with a client-supplied company_id, which meant changing one value in
// devtools returned another tenant's catalog-derived pricing. company_id now
// comes from the session and never from the caller.
//
// Gemini is called in-process (`src/lib/ai/quote.ts`) rather than over HTTP to a
// separate FastAPI service — see docs/adr/0009-ai-in-process.md.
// -----------------------------------------------------------------------------

const generateSchema = z.object({
  description: z.string().min(3).max(4000),
  customer_name: z.string().max(200).optional(),
  customer_address: z.string().max(500).optional(),
})

export type GenerateQuoteInput = z.infer<typeof generateSchema>

export async function generateQuoteItems(input: unknown) {
  const parsed = generateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  try {
    const data = await generateQuote({
      companyId: session.companyId,
      description: parsed.data.description,
      customerName: parsed.data.customer_name || 'Prospect',
      customerAddress: parsed.data.customer_address,
    })
    return { ok: true as const, data }
  } catch (e) {
    if (e instanceof NoCatalogError) {
      return {
        ok: false as const,
        error: 'No pricing items in your catalog yet — add some before generating a quote.',
      }
    }
    console.error('generateQuoteItems failed', e)
    return { ok: false as const, error: 'Quote generation failed. Try again.' }
  }
}

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

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const { companyId, userId } = session

  let workItemId: string | undefined
  try {
    workItemId = await withUser(userId, async (q) => {
      const rows = await q<{ id: string }>(
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
      return rows[0]?.id
    })
  } catch (e) {
    // Never surface raw Postgres text to the client — it leaks schema.
    console.error('createDraftQuote failed', e)
    return { ok: false as const, error: 'Could not create the quote. Please try again.' }
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

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const { companyId } = session

  // Ownership check — pg bypasses RLS, so scope the work item to the company.
  const owns = await query<{ id: string }>(
    'select id from work_items where id = $1 and company_id = $2 limit 1',
    [parsed.data.work_item_id, companyId],
  )
  if (!owns[0]) return { ok: false as const, error: 'Work item not found' }

  // An explicit rate wins; otherwise use the company's configured one. This
  // previously fell back to a hardcoded 8.5, which silently reset the rate for
  // any company that had set something else — wrong tax on a real quote.
  let taxRate = parsed.data.tax_rate
  if (taxRate === undefined) {
    const rows = await query<{ tax_rate: number | null }>(
      `select (settings->>'tax_rate')::numeric as tax_rate
         from companies
        where id = $1`,
      [companyId],
    )
    taxRate = Number(rows[0]?.tax_rate ?? 8.5)
  }

  const { subtotal, taxAmount, total } = computeTotals(parsed.data.items, taxRate)

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
        [subtotal, taxRate, taxAmount, total, parsed.data.work_item_id],
      )
    })
  } catch (e) {
    console.error('saveLineItems failed', e)
    return { ok: false as const, error: 'Could not save the line items. Please try again.' }
  }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/quotes/${parsed.data.work_item_id}`)
  return { ok: true as const, data: { subtotal, tax_amount: taxAmount, total } }
}
