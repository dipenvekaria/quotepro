'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { NoCatalogError, generateQuote } from '@/lib/ai/quote'
import { query, withTransaction, withUser } from '@/lib/db'
import { computeTotals } from '@/lib/money'
import {
  TIERS,
  TIER_DB_KEY,
  NoCatalogError as NoTierCatalogError,
  generateTieredQuote,
} from '@/lib/ai/tiers'

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
  // Set when the contractor picked an existing customer from the lookup. The
  // RPC otherwise matches on phone or email, which silently duplicates anyone
  // who has neither.
  customer_id: z.string().uuid().optional(),
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

  // A picked customer must belong to this company; an id from anywhere else is
  // ignored rather than trusted.
  let pickedCustomerId: string | null = null
  if (parsed.data.customer_id) {
    const owned = await query<{ id: string }>(
      'select id from customers where id = $1 and company_id = $2 limit 1',
      [parsed.data.customer_id, companyId],
    )
    pickedCustomerId = owned[0]?.id ?? null
  }

  let workItemId: string | undefined
  try {
    workItemId = await withUser(userId, async (q) => {
      // A customer the contractor picked is used directly. Falling through to
      // the RPC would re-derive them from name, phone and email — and it
      // matches on contact details, so anyone with neither would be duplicated
      // every time they were quoted.
      if (pickedCustomerId) {
        let addressId: string | null = null
        if (parsed.data.address) {
          const found = await q<{ id: string }>(
            `select id from customer_addresses where customer_id = $1 and address = $2 limit 1`,
            [pickedCustomerId, parsed.data.address],
          )
          addressId = found[0]?.id ?? null
          if (!addressId) {
            const made = await q<{ id: string }>(
              `insert into customer_addresses (customer_id, address, is_primary)
               select $1, $2, not exists (select 1 from customer_addresses where customer_id = $1)
               returning id`,
              [pickedCustomerId, parsed.data.address],
            )
            addressId = made[0]?.id ?? null
          }
        }

        const made = await q<{ id: string }>(
          `insert into work_items
             (company_id, customer_id, address_id, description, status, created_by)
           values ($1, $2, $3, $4, 'quote_draft'::work_item_status, $5)
           returning id`,
          [companyId, pickedCustomerId, addressId, parsed.data.description, userId],
        )
        return made[0]?.id
      }

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

  // Labour hours come from the catalog, matched by name, and are snapshotted
  // onto the line exactly as unit_price already is — a quote must not change
  // because someone edited the price book afterwards, and that applies to the
  // hours as much as the money.
  //
  // This is what lets the scheduler know a job is 5.5 hours without anyone
  // typing it. Competitors ask a dispatcher, because their price book is a name
  // and a price.
  const catalogHours = new Map<string, number>()
  {
    const rows = await query<{ name: string; labor_hours: number | null }>(
      `select name, labor_hours from catalog_items
        where company_id = $1 and labor_hours is not null`,
      [companyId],
    )
    for (const r of rows) {
      if (r.labor_hours !== null) catalogHours.set(r.name.trim().toLowerCase(), Number(r.labor_hours))
    }
  }
  const hoursFor = (name: string) => catalogHours.get(name.trim().toLowerCase()) ?? null

  const estimatedHours = parsed.data.items.reduce((sum, i) => {
    const h = hoursFor(i.name)
    return h === null ? sum : sum + h * i.quantity
  }, 0)

  try {
    await withTransaction(async (q) => {
      await q('delete from quote_items where work_item_id = $1', [parsed.data.work_item_id])

      if (parsed.data.items.length) {
        const values: unknown[] = []
        const tuples = parsed.data.items.map((i, idx) => {
          const b = idx * 9
          values.push(
            parsed.data.work_item_id,
            i.name,
            i.description ?? null,
            i.quantity,
            i.unit_price,
            i.sort_order,
            i.is_upsell ?? false,
            i.is_discount ?? false,
            hoursFor(i.name),
          )
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`
        })
        await q(
          `insert into quote_items
             (work_item_id, name, description, quantity, unit_price, sort_order, is_upsell, is_discount, labor_hours)
           values ${tuples.join(', ')}`,
          values,
        )
      }

      await q(
        `update work_items
            set subtotal = $1, tax_rate = $2, tax_amount = $3, total = $4,
                estimated_hours = $5
          where id = $6`,
        // Null rather than zero when nothing carries hours. A job of unknown
        // length must not read as an instant one, and the scheduler shows no
        // estimate instead of a wrong one.
        [subtotal, taxRate, taxAmount, total, estimatedHours > 0 ? estimatedHours : null, parsed.data.work_item_id],
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

// -----------------------------------------------------------------------------
// Good/better/best
//
// Generation returns tiers for review; nothing is written until the contractor
// saves, because these are prices a customer will be shown.
// -----------------------------------------------------------------------------

const tierGenerateSchema = z.object({
  description: z.string().min(3).max(4000),
  tax_rate: z.number().min(0).max(30).optional(),
})

export async function generateQuoteTiers(input: unknown) {
  const parsed = tierGenerateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  let taxRate = parsed.data.tax_rate
  if (taxRate === undefined) {
    const rows = await query<{ tax_rate: number | null }>(
      `select (settings->>'tax_rate')::numeric as tax_rate from companies where id = $1`,
      [session.companyId],
    )
    taxRate = Number(rows[0]?.tax_rate ?? 8.5)
  }

  try {
    const result = await generateTieredQuote({
      companyId: session.companyId,
      description: parsed.data.description,
      taxRate,
    })
    if (!result) {
      return {
        ok: false as const,
        error: 'Could not build options from your catalog for this job. Try a single quote.',
      }
    }
    if (result.tiers.length < 2) {
      return {
        ok: false as const,
        error: 'Your catalog only supports one honest option for this job.',
      }
    }
    return { ok: true as const, data: result }
  } catch (e) {
    if (e instanceof NoTierCatalogError) {
      return {
        ok: false as const,
        error: 'No pricing items in your catalog yet — add some before generating options.',
      }
    }
    console.error('generateQuoteTiers failed', e)
    return { ok: false as const, error: 'Could not generate options. Try again.' }
  }
}

const saveTiersSchema = z.object({
  work_item_id: z.string().uuid(),
  tax_rate: z.number().min(0).max(30),
  tiers: z
    .array(
      z.object({
        tier: z.enum(TIERS),
        name: z.string().min(1).max(120),
        description: z.string().max(500),
        is_recommended: z.boolean(),
        items: z.array(
          z.object({
            name: z.string().min(1).max(300),
            description: z.string().nullable().optional(),
            quantity: z.number().positive(),
            unit_price: z.number().min(0),
          }),
        ),
      }),
    )
    .min(2)
    .max(3),
})

export async function saveQuoteTiers(input: unknown) {
  const parsed = saveTiersSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const { companyId } = session

  const owns = await query<{ id: string }>(
    'select id from work_items where id = $1 and company_id = $2 limit 1',
    [parsed.data.work_item_id, companyId],
  )
  if (!owns[0]) return { ok: false as const, error: 'Work item not found' }

  const { work_item_id: workItemId, tax_rate: taxRate, tiers } = parsed.data
  // The work item's own totals track the recommended tier, so the pipeline and
  // the calendar show the figure the contractor expects to win.
  const headline = tiers.find((t) => t.is_recommended) ?? tiers[tiers.length - 1]
  const headlineTotals = computeTotals(headline.items, taxRate)

  try {
    await withTransaction(async (q) => {
      await q('delete from quote_items where work_item_id = $1', [workItemId])
      await q('delete from quote_options where work_item_id = $1', [workItemId])

      for (const tier of tiers) {
        const dbTier = TIER_DB_KEY[tier.tier]
        const totals = computeTotals(tier.items, taxRate)

        await q(
          `insert into quote_options
             (work_item_id, tier, name, description, total, is_selected, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            workItemId,
            dbTier,
            tier.name,
            tier.description,
            totals.total,
            // Nothing is selected until the customer chooses; `is_recommended`
            // is our suggestion, not their decision.
            false,
            TIERS.indexOf(tier.tier),
          ],
        )

        if (tier.items.length === 0) continue
        const values: unknown[] = []
        const tuples = tier.items.map((i, idx) => {
          const b = idx * 6
          values.push(workItemId, i.name, i.description ?? null, i.quantity, i.unit_price, dbTier)
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`
        })
        await q(
          `insert into quote_items
             (work_item_id, name, description, quantity, unit_price, option_tier)
           values ${tuples.join(', ')}`,
          values,
        )
      }

      await q(
        `update work_items
            set subtotal = $1, tax_rate = $2, tax_amount = $3, total = $4
          where id = $5`,
        [headlineTotals.subtotal, taxRate, headlineTotals.taxAmount, headlineTotals.total, workItemId],
      )
    })
  } catch (e) {
    console.error('saveQuoteTiers failed', e)
    return { ok: false as const, error: 'Could not save the options. Please try again.' }
  }

  revalidatePath('/app/pipeline')
  revalidatePath(`/app/pipeline/${workItemId}`)
  return { ok: true as const, data: { total: headlineTotals.total } }
}

// -----------------------------------------------------------------------------
// Customer lookup
//
// A contractor quoting a repeat customer should not retype their details, and
// should not have to decide up front whether this is a new customer or an
// existing one. They start typing a name or a phone number; if we know the
// person, they pick them.
// -----------------------------------------------------------------------------

export type CustomerMatch = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  job_count: number
}

export async function searchCustomers(q: unknown): Promise<CustomerMatch[]> {
  const term = typeof q === 'string' ? q.trim() : ''
  if (term.length < 2) return []

  const session = await getSession()
  if (!session) return []

  // Digits only for the phone comparison, so "(555) 010-1234" matches
  // "5550101234" — nobody types a stored number the way it was stored.
  const digits = term.replace(/\D/g, '')

  return query<CustomerMatch>(
    `select c.id, c.name, c.email, c.phone,
            (select a.address from customer_addresses a
              where a.customer_id = c.id order by a.created_at limit 1) as address,
            (select count(*) from work_items w where w.customer_id = c.id) as job_count
       from customers c
      where c.company_id = $1
        and (
          c.name ilike '%' || $2 || '%'
          or c.email ilike '%' || $2 || '%'
          or ($3 <> '' and regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g') like '%' || $3 || '%')
        )
      order by c.name
      limit 6`,
    [session.companyId, term, digits],
  )
}
