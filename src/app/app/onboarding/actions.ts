'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { ACQUISITION_VALUES, wantsDetail } from '@/lib/acquisition'
import { loadStarterCatalog } from '@/lib/catalog/starter'
import { query, withUser } from '@/lib/db'

const inputSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  // The browser's IANA timezone, captured silently at signup — the owner
  // creating the account is almost always in the company's timezone, and it
  // costs them nothing. bootstrap_company defaults to a hardcoded zone; every
  // day boundary in the product reads this.
  timezone: z.string().max(64).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  // Required. A new account without a catalog cannot produce a quote — AI
  // generation has nothing to ground on — so the first thing it does is fail.
  // Picking a trade is the whole of setup, and it takes one dropdown.
  trade: z.string().min(1, 'Choose your trade so we can build your price book').max(120),
  // Defaulted rather than optional, so the catalog is always priced. The
  // contractor changes them here or later in Settings.
  labor_rate: z.coerce.number().min(1).max(1000).default(125),
  materials_markup: z.coerce.number().min(0).max(300).default(50),
  service_call_fee: z.coerce.number().min(0).max(10_000).default(99),
  // Optional on purpose. This is the one field on the form that serves us
  // rather than the contractor, and activation matters more than attribution —
  // a required question here would be paid for in abandoned signups.
  acquisition_source: z.enum(ACQUISITION_VALUES as [string, ...string[]]).optional(),
  acquisition_detail: z.string().max(200).optional(),
})

export type BootstrapCompanyState = {
  ok: boolean
  error?: string
}

export async function bootstrapCompany(_prev: BootstrapCompanyState, formData: FormData): Promise<BootstrapCompanyState> {
  const parsed = inputSchema.safeParse({
    name: formData.get('name'),
    timezone: formData.get('timezone') || undefined,
    phone: formData.get('phone') ?? undefined,
    email: formData.get('email') ?? undefined,
    address: formData.get('address') ?? undefined,
    trade: formData.get('trade') || undefined,
    labor_rate: formData.get('labor_rate') || undefined,
    materials_markup: formData.get('materials_markup') || undefined,
    service_call_fee: formData.get('service_call_fee') || undefined,
    acquisition_source: formData.get('acquisition_source') || undefined,
    acquisition_detail: formData.get('acquisition_detail') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const rates = {
    laborRate: parsed.data.labor_rate,
    markup: parsed.data.materials_markup / 100,
    serviceCallFee: parsed.data.service_call_fee,
  }

  const starter = loadStarterCatalog(parsed.data.trade, rates)

  // An unknown slug reads an empty catalog, which would land the contractor on
  // the same empty screen this requirement exists to prevent. Say so rather
  // than creating a workspace that cannot quote.
  if (starter.length === 0) {
    return { ok: false, error: 'We could not find a price book for that trade. Pick another.' }
  }

  // bootstrap_company is idempotent: a caller who already has a company gets
  // that id back rather than an error. Nothing downstream could tell the
  // difference, so a second submit re-ran the seed against an already-stocked
  // company and doubled the price book — 101 items became 202, every one of
  // them twice, which is what a contractor saw in production. Detect the
  // already-onboarded case here, where there is still something to decide.
  const [existing] = await query<{ company_id: string | null }>(
    'select company_id from users where id = $1',
    [user.id],
  )
  if (existing?.company_id) {
    revalidatePath('/app')
    return { ok: true }
  }

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
          // A real trade catalog is always going in now, so the built-in
          // four-row seed would only create duplicates.
          false,
        ],
      )
      return rows[0]?.id
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create company' }
  }

  if (!companyId) return { ok: false, error: 'Unknown error' }

  // Correct the hardcoded default the SQL bootstrap writes. Best-effort: an
  // account with the fallback timezone is annoying, not broken.
  if (parsed.data.timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: parsed.data.timezone })
      await query(
        `update companies
            set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{timezone}', to_jsonb($1::text))
          where id = $2`,
        [parsed.data.timezone, companyId],
      )
    } catch (e) {
      console.error('timezone not recorded', e)
    }
  }

  // Its own statement, and its own failure domain. Attribution is the one thing
  // on this form that cannot be reconstructed later — the contractor will not
  // remember in six months, and nothing else records it — so it is written
  // before the catalog seed rather than alongside it, where a seeding failure
  // would take it down too.
  if (parsed.data.acquisition_source) {
    try {
      await query(
        `update companies set acquisition_source = $1, acquisition_detail = $2 where id = $3`,
        [
          parsed.data.acquisition_source,
          // A detail typed against one source and then left behind after
          // switching to another is stale, not data.
          wantsDetail(parsed.data.acquisition_source)
            ? parsed.data.acquisition_detail?.trim() || null
            : null,
          companyId,
        ],
      )
    } catch (e) {
      console.error('acquisition source not recorded', e)
    }
  }

  try {
    await seedCatalog(companyId, starter, parsed.data)
  } catch (e) {
    // The workspace exists and is usable; only the catalog is missing, and they
    // can still import one. Failing signup after the company was created would
    // leave them worse off than an empty price book.
    console.error('starter catalog seed failed', e)
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
    // The first tuple carries the casts. Postgres infers the rest of the rows
    // from it, and a bare VALUES list read as a subquery has nothing else to
    // infer parameter types from.
    return i === 0
      ? `($1::uuid, $2::text, $3::text, $4::text, $5::numeric, $6::text, $7::numeric, $8::numeric, $9::text)`
      : `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`
  })

  // Second line of defence behind the already-onboarded check in the caller,
  // and the one that holds if two submits race: seeding a company that already
  // has items is never right, whatever got us here.
  await query(
    `insert into catalog_items
       (company_id, name, description, category, base_price, unit, labor_hours, material_cost, trade, source)
     select v.*, 'starter' from (values ${tuples.join(', ')}) as v
       (company_id, name, description, category, base_price, unit, labor_hours, material_cost, trade)
     where not exists (select 1 from catalog_items c where c.company_id = $1)`,
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
