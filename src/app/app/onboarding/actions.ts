'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { loadStarterCatalog } from '@/lib/catalog/starter'
import { query, withUser } from '@/lib/db'

const inputSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  // Trade + rates build the starter catalog. All optional: skipping them lands
  // the contractor on the minimal seed catalog, which is what used to happen
  // for everyone.
  trade: z.string().max(120).optional(),
  labor_rate: z.coerce.number().min(1).max(1000).optional(),
  materials_markup: z.coerce.number().min(0).max(300).optional(),
  service_call_fee: z.coerce.number().min(0).max(10_000).optional(),
})

export type BootstrapCompanyState = {
  ok: boolean
  error?: string
}

export async function bootstrapCompany(_prev: BootstrapCompanyState, formData: FormData): Promise<BootstrapCompanyState> {
  const parsed = inputSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') ?? undefined,
    email: formData.get('email') ?? undefined,
    address: formData.get('address') ?? undefined,
    trade: formData.get('trade') || undefined,
    labor_rate: formData.get('labor_rate') || undefined,
    materials_markup: formData.get('materials_markup') || undefined,
    service_call_fee: formData.get('service_call_fee') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const rates = {
    laborRate: parsed.data.labor_rate ?? 0,
    markup: (parsed.data.materials_markup ?? 0) / 100,
    serviceCallFee: parsed.data.service_call_fee ?? 0,
  }

  // Priced from the contractor's own numbers, so an empty rate means we have
  // nothing to price with and fall back to the minimal seed.
  const starter =
    parsed.data.trade && rates.laborRate > 0 ? loadStarterCatalog(parsed.data.trade, rates) : []

  let companyId: string | undefined
  try {
    companyId = await withUser(user.id, async (q) => {
      const rows = await q<{ id: string }>(
        `select bootstrap_company(
           p_name => $1,
           p_phone => $2,
           p_email => $3,
           p_address => $4,
           p_seed_catalog => $5
         ) as id`,
        [
          parsed.data.name,
          parsed.data.phone || null,
          parsed.data.email || null,
          parsed.data.address || null,
          // The built-in seed is four generic rows. Skip it when a real trade
          // catalog is going in, or the contractor starts with duplicates.
          starter.length === 0,
        ],
      )
      return rows[0]?.id
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create company' }
  }

  if (!companyId) return { ok: false, error: 'Unknown error' }

  if (starter.length > 0) {
    try {
      await seedCatalog(companyId, starter, parsed.data)
    } catch (e) {
      // The workspace exists and is usable; only the catalog is missing, and
      // they can import one. Failing signup here would be worse.
      console.error('starter catalog seed failed', e)
    }
  }

  revalidatePath('/app')
  return { ok: true }
}

/**
 * Inserts the priced starter catalog and records the rates it was built from.
 *
 * `companyId` is the row bootstrap_company just created for this caller, so it
 * is the tenant key here rather than something to filter by.
 */
async function seedCatalog(
  companyId: string,
  items: Awaited<ReturnType<typeof loadStarterCatalog>>,
  input: z.infer<typeof inputSchema>,
) {
  const values: unknown[] = []
  const tuples = items.map((item, i) => {
    const b = i * 9
    values.push(
      companyId,
      item.name,
      item.description,
      item.category,
      item.base_price,
      item.unit,
      item.labor_hours || null,
      item.material_cost || null,
      input.trade ?? null,
    )
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`
  })

  await query(
    `insert into catalog_items
       (company_id, name, description, category, base_price, unit, labor_hours, material_cost, trade)
     values ${tuples.join(', ')}`,
    values,
  )

  // Kept so the catalog can be repriced later when the contractor raises their
  // rate — the whole point of storing hours and material cost per item.
  // `trade` is a column, not a settings key: it is read on the quoting path and
  // decides which items the model may see. The rates stay in settings — they
  // exist to reprice the catalog later, nothing reads them per quote.
  await query(
    `update companies
        set trade = $1,
            settings = coalesce(settings, '{}'::jsonb) || $2::jsonb
      where id = $3`,
    [
      input.trade ?? null,
      JSON.stringify({
        labor_rate: input.labor_rate,
        materials_markup: input.materials_markup,
        service_call_fee: input.service_call_fee,
      }),
      companyId,
    ],
  )
}
