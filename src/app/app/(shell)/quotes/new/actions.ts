'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { lineHours } from '@/lib/format'
import { logActivity } from '@/lib/activity'
import { recordAiRun } from '@/lib/ai/run-log'
import { checkRateLimit, LIMITS } from '@/lib/rate-limit'
import { runQuoteTurn } from '@/lib/ai/quote-agent'
import { readQuote } from '@/lib/ai/quote-tools'
import { AiUnavailableError } from '@/lib/ai/gemini'
import { NoCatalogError, generateQuote } from '@/lib/ai/quote'
import { query, withTransaction, withUser } from '@/lib/db'
import { computeTotals } from '@/lib/money'
import { loadItemLabels, loadLivePromotions, priceWithPromotions } from '@/lib/promotions'
import {
  TIERS,
  TIER_DB_KEY,
  NoCatalogError as NoTierCatalogError,
  VagueJobError,
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

/**
 * `.nullish()`, not `.optional()`.
 *
 * `.optional()` accepts `undefined` and rejects `null` — and every caller that
 * reads a customer out of Postgres has `null`, because that is what an empty
 * column is. Drafting from the pipeline passed `customer_address: null` and the
 * contractor got "invalid input, expected string got null" while editing an
 * existing quote; the new-quote editor happened to write `|| undefined` and so
 * happened to work.
 *
 * Fixed at the contract rather than the one call site. An input schema that only
 * accepts `undefined` is a trap for the next caller, and the next caller is
 * always reading from a database.
 */
const generateSchema = z.object({
  description: z.string().min(3).max(4000),
  customer_name: z.string().max(200).nullish(),
  customer_address: z.string().max(500).nullish(),
  /**
   * The quote this draft is for, when it already exists.
   *
   * Without it there was nothing to key an AI record to, which is why no quote
   * had a traceable history. Drafting from the pipeline has the id; a brand-new
   * quote does not yet, and that run is recorded against the company instead.
   */
  work_item_id: z.string().uuid().nullish(),
})

export type GenerateQuoteInput = z.infer<typeof generateSchema>

export async function generateQuoteItems(input: unknown) {
  const parsed = generateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  // Per company, because AI drafting costs real money per call and a shared
  // bucket would let one contractor exhaust everybody's.
  const rl = await checkRateLimit(
    `ai:generate:${session.companyId}`,
    LIMITS.aiGenerate.limit,
    LIMITS.aiGenerate.windowSeconds,
  )
  if (!rl.allowed) {
    return {
      ok: false as const,
      error: `That is a lot of drafting in one hour. Try again in ${Math.ceil(rl.resetIn / 60)} minutes.`,
    }
  }

  try {
    const startedAt = Date.now()
    const data = await generateQuote({
      companyId: session.companyId,
      description: parsed.data.description,
      customerName: parsed.data.customer_name || 'Prospect',
      customerAddress: parsed.data.customer_address,
    })
    // Recorded after the result is in hand, so a logging problem cannot cost
    // the contractor their draft.
    await recordAiRun({
      companyId: session.companyId,
      userId: session.userId,
      workItemId: parsed.data.work_item_id,
      mode: data.mode,
      purpose: 'quote_generation',
      prompt: parsed.data.description,
      result: {
        line_items: data.line_items.length,
        names: data.line_items.slice(0, 12).map((li) => li.name),
        unmet: data.unmet ?? [],
      },
      usage: data.usage,
      latencyMs: Date.now() - startedAt,
    })

    return { ok: true as const, data }
  } catch (e) {
    if (e instanceof NoCatalogError) {
      return {
        ok: false as const,
        error: 'No pricing items in your catalog yet — add some before generating a quote.',
      }
    }
    if (e instanceof AiUnavailableError) {
      // Recorded so the outage is visible in the run log — the old behaviour
      // silently shipped keyword-matched quotes instead, which looked like poor
      // AI quality rather than an outage. Fail hard, loudly, on purpose.
      await recordAiRun({
        companyId: session.companyId,
        userId: session.userId,
        workItemId: parsed.data.work_item_id,
        mode: 'unavailable',
        purpose: 'quote_generation',
        prompt: parsed.data.description,
        result: { error: e.message },
      })
      return {
        ok: false as const,
        error: 'AI drafting is unavailable right now. Nothing was drafted — try again in a minute.',
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
  // Present only when the address came from autocomplete. A hand-typed address
  // stores just the street line, which is what this field always did.
  city: z.string().max(120).optional(),
  state: z.string().max(40).optional(),
  zip: z.string().max(20).optional(),
  // Optional so a draft is never forced to carry a manufactured description. The
  // editor used to default an empty one to the literal "Quote", which then fed
  // the AI as if it were the job and produced a fabricated quote.
  description: z.string().max(2000).optional(),
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
              `insert into customer_addresses (customer_id, address, city, state, zip, is_primary)
               select $1, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''),
                      not exists (select 1 from customer_addresses where customer_id = $1)
               returning id`,
              [
                pickedCustomerId,
                parsed.data.address,
                parsed.data.city ?? '',
                parsed.data.state ?? '',
                parsed.data.zip ?? '',
              ],
            )
            addressId = made[0]?.id ?? null
          } else if (parsed.data.state) {
            // The address existed as a bare street line from before this
            // shipped. Backfill the components rather than leaving it partial.
            await q(
              `update customer_addresses
                  set city = coalesce(nullif($2, ''), city),
                      state = coalesce(nullif($3, ''), state),
                      zip = coalesce(nullif($4, ''), zip)
                where id = $1`,
              [addressId, parsed.data.city ?? '', parsed.data.state, parsed.data.zip ?? ''],
            )
          }
        }

        const made = await q<{ id: string }>(
          `insert into work_items
             (company_id, customer_id, address_id, description, status, created_by)
           values ($1, $2, $3, $4, 'quote_draft'::work_item_status, $5)
           returning id`,
          [companyId, pickedCustomerId, addressId, parsed.data.description ?? null, userId],
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
          parsed.data.description ?? null,
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

  await logActivity({
    companyId,
    userId,
    entityId: String(workItemId),
    action: 'quote_created',
    description: `Quote created for ${parsed.data.customer_name}`,
  })

  revalidatePath('/app/pipeline')
  return { ok: true as const, data: { id: String(workItemId) } }
}

// -----------------------------------------------------------------------------
// Save line items on a quote (replace-all).
// -----------------------------------------------------------------------------

/**
 * Name → labour hours + unit for snapshotting onto quote lines. Matched by
 * name because that is the join the lines carry; the migration comment on
 * quote_items.catalog_item_id records why that is fragile and what replaces it.
 */
async function catalogMetaByName(companyId: string) {
  const rows = await query<{ name: string; labor_hours: number | null; unit: string | null }>(
    `select name, labor_hours, unit from catalog_items where company_id = $1`,
    [companyId],
  )
  const map = new Map<string, { hours: number | null; unit: string | null }>()
  for (const r of rows) {
    map.set(r.name.trim().toLowerCase(), {
      hours: r.labor_hours === null ? null : Number(r.labor_hours),
      unit: r.unit,
    })
  }
  return map
}

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

  // Promotions are applied at save, not at the moment a line is added: the
  // contractor may add a line today and save tomorrow, and the price that
  // matters is the one on the quote they send.
  const [promotions, itemLabels] = await Promise.all([
    loadLivePromotions(companyId),
    loadItemLabels(companyId),
  ])

  const pricedItems = parsed.data.items.map((i) => {
    const priced = priceWithPromotions({
      listPrice: i.unit_price,
      labelIds: itemLabels.get(i.name.trim().toLowerCase()) ?? [],
      promotions,
    })
    return { ...i, ...priced }
  })

  const discounted = pricedItems.filter((i) => i.promotionId)
  if (discounted.length) {
    console.warn(
      `quotes: applied promotions to ${discounted.length} line(s): ${[
        ...new Set(discounted.map((i) => i.promotionName)),
      ].join(', ')}`,
    )
  }

  const { subtotal, taxAmount, total } = computeTotals(
    pricedItems.map((i) => ({ quantity: i.quantity, unit_price: i.unitPrice })),
    taxRate,
  )

  // Labour hours come from the catalog, matched by name, and are snapshotted
  // onto the line exactly as unit_price already is — a quote must not change
  // because someone edited the price book afterwards, and that applies to the
  // hours as much as the money.
  //
  // This is what lets the scheduler know a job is 5.5 hours without anyone
  // typing it. Competitors ask a dispatcher, because their price book is a name
  // and a price.
  const catalogMeta = await catalogMetaByName(companyId)
  const metaFor = (name: string) => catalogMeta.get(name.trim().toLowerCase())
  const hoursFor = (name: string) => metaFor(name)?.hours ?? null
  const unitFor = (name: string) => metaFor(name)?.unit ?? null

  // Quantity multiplies the labour only when it counts repetitions of the
  // work. For size units it describes one piece of work — a 3-ton condenser
  // is one install, and multiplying booked it as three working days.
  const estimatedHours = parsed.data.items.reduce((sum: number, i) => {
    const h = lineHours(hoursFor(i.name), i.quantity, unitFor(i.name))
    return h === null ? sum : sum + h
  }, 0)

  try {
    await withTransaction(async (q) => {
      await q('delete from quote_items where work_item_id = $1', [parsed.data.work_item_id])

      if (parsed.data.items.length) {
        const values: unknown[] = []
        const tuples = pricedItems.map((i, idx) => {
          const b = idx * 12
          values.push(
            parsed.data.work_item_id,
            i.name,
            i.description ?? null,
            i.quantity,
            // The charged price. list_price records what it would have been, so
            // the customer can see the saving.
            i.unitPrice,
            i.sort_order,
            i.is_upsell ?? false,
            i.is_discount ?? false,
            hoursFor(i.name),
            // Snapshotted like the price and the hours: the quote's meaning
            // must not change when the price book is edited later.
            unitFor(i.name),
            i.promotionId,
            i.listPrice,
          )
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}, $${b + 12})`
        })
        await q(
          `insert into quote_items
             (work_item_id, name, description, quantity, unit_price, sort_order, is_upsell, is_discount, labor_hours, unit, promotion_id, list_price)
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
  // Present when generating against an existing draft, so the run log keys to
  // the quote; null on a first draft, exactly like generateSchema.
  work_item_id: z.string().uuid().nullish(),
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
    const startedAt = Date.now()
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
    // The tiers path built quotes with no journey record at all — the audit for
    // "what did the AI do on this quote, and what did it cost" was blind to the
    // good/better/best generator while it covered the single-line one.
    await recordAiRun({
      companyId: session.companyId,
      userId: session.userId,
      workItemId: parsed.data.work_item_id,
      mode: result.mode,
      purpose: 'quote_tiers',
      prompt: parsed.data.description,
      result: {
        tiers: result.tiers.length,
        items: result.tiers.reduce((n, t) => n + t.line_items.length, 0),
        names: result.tiers.map((t) => t.name),
      },
      usage: result.usage,
      latencyMs: Date.now() - startedAt,
    })
    return { ok: true as const, data: result }
  } catch (e) {
    if (e instanceof NoTierCatalogError) {
      return {
        ok: false as const,
        error: 'No pricing items in your catalog yet — add some before generating options.',
      }
    }
    if (e instanceof VagueJobError) {
      return {
        ok: false as const,
        error:
          'Describe the job first — what is broken, or what is being installed? Options need a real description to be honest.',
      }
    }
    if (e instanceof AiUnavailableError) {
      await recordAiRun({
        companyId: session.companyId,
        userId: session.userId,
        workItemId: parsed.data.work_item_id,
        mode: 'unavailable',
        purpose: 'quote_tiers',
        prompt: parsed.data.description,
        result: { error: e.message },
      })
      return {
        ok: false as const,
        error: 'AI drafting is unavailable right now. Nothing was drafted — try again in a minute.',
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
  // Snapshot unit + labour hours onto tier lines, same as the single-quote save.
  const tiersMeta = await catalogMetaByName(companyId)
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
          const b = idx * 8
          const meta = tiersMeta.get(i.name.trim().toLowerCase())
          values.push(
            workItemId, i.name, i.description ?? null, i.quantity, i.unit_price, dbTier,
            meta?.unit ?? null, meta?.hours ?? null,
          )
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8})`
        })
        await q(
          `insert into quote_items
             (work_item_id, name, description, quantity, unit_price, option_tier, unit, labor_hours)
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

// ---------------------------------------------------------------------------

const conversationSchema = z.object({ work_item_id: z.string().uuid() })

/**
 * The quoting conversation for a quote, as chat messages.
 *
 * Read from the ADK session (`purpose = 'quoting'`), which already persists
 * every turn — the dialog shows the trail instead of a blank box, so a
 * contractor reopening a quote tomorrow continues where they left off. Tool
 * call/response events are internal and are filtered to text turns.
 */
export async function getQuoteConversation(input: unknown) {
  const parsed = conversationSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const [row] = await query<{ messages: unknown }>(
    `select messages from ai_conversations
      where company_id = $1 and entity_type = 'work_item' and entity_id = $2
        and purpose = 'quoting'
      limit 1`,
    [session.companyId, parsed.data.work_item_id],
  )

  type EventPart = { text?: unknown }
  type SessionEvent = { author?: unknown; content?: { parts?: EventPart[] } }
  const events = Array.isArray(row?.messages) ? (row.messages as SessionEvent[]) : []

  const messages = events
    .map((e) => {
      const text = (e.content?.parts ?? [])
        .map((p) => (typeof p.text === 'string' ? p.text : ''))
        .join('')
        .trim()
      return {
        role: e.author === 'user' ? ('user' as const) : ('assistant' as const),
        text,
      }
    })
    .filter((m) => m.text.length > 0)

  return { ok: true as const, data: { messages } }
}

// ---------------------------------------------------------------------------

const agentEditSchema = z.object({
  work_item_id: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
})

/**
 * Ask the agent to change an existing quote.
 *
 * The distinction that matters: `generateQuoteItems` above *generates* — it is
 * the right operation for a blank quote, where there is nothing to edit and one
 * model call beats an agent loop. This *edits*, and is the right operation for
 * every turn after that.
 *
 * The old flow only had the first. So "add 10% off" was answered by generating
 * a whole new quote, and anything the contractor had adjusted by hand went with
 * it. Here the agent calls tools that mutate `quote_items`, so nothing is
 * regenerated and nothing is lost.
 *
 * Returns the quote as it now stands, because the agent wrote to the database
 * behind the editor's back and its React state is stale the moment this returns.
 */
export async function editQuoteWithAi(input: unknown) {
  const parsed = agentEditSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const rl = await checkRateLimit(
    `ai:generate:${session.companyId}`,
    LIMITS.aiGenerate.limit,
    LIMITS.aiGenerate.windowSeconds,
  )
  if (!rl.allowed) {
    return {
      ok: false as const,
      error: `That is a lot of drafting in one hour. Try again in ${Math.ceil(rl.resetIn / 60)} minutes.`,
    }
  }

  const ctx = { companyId: session.companyId, workItemId: parsed.data.work_item_id }
  const startedAt = Date.now()

  try {
    const turn = await runQuoteTurn(ctx, session.userId, parsed.data.message)
    const quote = await readQuote(ctx)

    await recordAiRun({
      companyId: session.companyId,
      userId: session.userId,
      workItemId: parsed.data.work_item_id,
      mode: 'agent',
      purpose: 'quote_edit',
      prompt: parsed.data.message,
      result: { reply: turn.reply, tools: turn.toolCalls, lines: quote.line_count },
      latencyMs: Date.now() - startedAt,
    })

    revalidatePath(`/app/pipeline/${parsed.data.work_item_id}`)
    return { ok: true as const, data: { ...turn, quote } }
  } catch (e) {
    console.error('editQuoteWithAi failed', e)
    // Tool errors are written for the contractor ("that line is not on this
    // quote"); anything else is infrastructure and must not reach the browser
    // raw — a Vertex auth failure names the project. Recorded so the outage is
    // visible in the run log either way.
    const toolMessage =
      e instanceof Error && !/unavailable|invalid_grant|fetch|ECONN|quota|credential/i.test(e.message)
        ? e.message
        : null
    await recordAiRun({
      companyId: session.companyId,
      userId: session.userId,
      workItemId: parsed.data.work_item_id,
      mode: 'unavailable',
      purpose: 'quote_edit',
      prompt: parsed.data.message,
      result: { error: e instanceof Error ? e.message : String(e) },
    })
    return {
      ok: false as const,
      error:
        toolMessage ??
        'The assistant could not reach the AI service. Nothing was changed — try again in a minute.',
    }
  }
}
