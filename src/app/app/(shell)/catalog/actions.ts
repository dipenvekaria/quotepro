'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { indexCatalog, indexCatalogItem, unindexCatalogItem } from '@/lib/ai/catalog-index'
import { AiUnavailableError } from '@/lib/ai/gemini'
import { logActivity } from '@/lib/activity'
import { checkRateLimit, LIMITS } from '@/lib/rate-limit'
import { canEditCatalog } from '@/lib/auth/scope'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { mapHeaders, parseCsv, parsePrice } from '@/lib/csv'
import {
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  extractCatalogFromDocument,
  itemsToCsv,
  type ExtractedItem,
} from '@/lib/ai/extract-catalog'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { PHOTO_BUCKET } from '@/lib/storage/signed-url'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { isLive, type DiscountType } from '@/lib/promotions'

/**
 * Catalog CRUD.
 *
 * Until this existed a new account could not create a price book, so AI quote
 * generation returned `400 No active catalog items` and the product could not be
 * used by anyone who wasn't the demo company. See docs/PRODUCT_REVIEW.md §1.
 *
 * Writes are owner-only: `canEditCatalog` is false for every other role, and
 * pricing is the contractor's margin. Reads stay open to the whole team.
 */

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  category: z.string().trim().max(120).optional().or(z.literal('')),
  // NUMERIC(12,2) with CHECK (base_price >= 0)
  base_price: z.coerce.number().min(0, 'Price cannot be negative').max(9_999_999.99),
  unit: z.string().trim().min(1).max(40).default('each'),
  /**
   * Hours the work takes. Optional, because plenty of items are materials.
   *
   * This is the field Rivet's scheduling advantage rests on, and every
   * contractor-facing way of adding an item used to drop it — only the
   * onboarding starter seed wrote it. So it looked healthy on demo data and
   * turned itself off the moment somebody customised their own price book.
   */
  labor_hours: z.coerce.number().min(0).max(999).optional().or(z.literal('')).transform(
    (v) => (v === '' || v === undefined ? null : Number(v)),
  ),
  is_active: z.boolean().default(true),
})

const createSchema = itemSchema
const updateSchema = itemSchema.extend({ id: z.string().uuid() })
const idSchema = z.object({ id: z.string().uuid() })

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const IMAGE_MAX_BYTES = 10 * 1024 * 1024

export type CatalogItemInput = z.input<typeof itemSchema>

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Owner-only. Returns the session when allowed, an error result otherwise. */
async function requireCatalogEditor() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  // Owner, or somebody the owner granted it to. See canEditCatalog for why this
  // is a per-person grant rather than a wider role.
  if (!canEditCatalog(session.role as UserRole, session.canEditCatalog)) {
    return {
      ok: false as const,
      error: 'You do not have access to change pricing. An owner can grant it in Settings → Team.',
    }
  }
  return { ok: true as const, session }
}

function revalidate() {
  revalidatePath('/app/catalog')
  // Quote generation reads the catalog, so its empty state changes too.
  revalidatePath('/app/quotes/new')
}

/**
 * Keep the search index in step with the price book.
 *
 * After the response, not before it: embedding takes a round trip to Vertex and
 * a contractor saving a price should not wait for it. `after()` runs once the
 * response is sent, and on Fluid Compute that time is largely unbilled.
 *
 * The write path owns this rather than a nightly job. An index that drifts
 * answers confidently with last week's prices, and nobody notices until a
 * customer accepts one.
 */
function reindex(companyId: string, itemId: string) {
  after(async () => {
    try {
      await indexCatalogItem(companyId, itemId)
    } catch (e) {
      // Never fail a save because search is unavailable — the item is in the
      // catalog either way, and the keyword path still finds it.
      console.error('catalog reindex failed', e)
    }
  })
}

function reindexAll(companyId: string) {
  after(async () => {
    try {
      await indexCatalog(companyId)
    } catch (e) {
      console.error('catalog bulk reindex failed', e)
    }
  })
}

export async function createCatalogItem(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  const d = parsed.data
  try {
    const rows = await query<{ id: string }>(
      `insert into catalog_items
         (company_id, name, description, category, base_price, unit, is_active, labor_hours,
          created_by, updated_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       returning id`,
      [
        auth.session.companyId,
        d.name,
        d.description || null,
        d.category || null,
        d.base_price,
        d.unit,
        d.is_active,
        d.labor_hours,
        auth.session.userId,
      ],
    )
    const id = rows[0]?.id
    if (!id) return { ok: false, error: 'Could not add the item. Please try again.' }
    await logActivity({
      companyId: auth.session.companyId,
      userId: auth.session.userId,
      entityType: 'catalog_item',
      entityId: id,
      action: 'price_book_item_added',
      description: `${d.name} added at $${d.base_price}`,
      changes: { name: d.name, base_price: d.base_price, unit: d.unit },
    })
    revalidate()
    reindex(auth.session.companyId, id)
    return { ok: true, data: { id } }
  } catch (e) {
    console.error('createCatalogItem failed', e)
    return { ok: false, error: 'Could not add the item. Please try again.' }
  }
}

export async function updateCatalogItem(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  const d = parsed.data
  try {
    // The update is scoped by company_id, so a row belonging to another tenant
    // simply matches nothing rather than being modified.
    const rows = await query<{ id: string }>(
      `update catalog_items
          set name = $1, description = $2, category = $3,
              base_price = $4, unit = $5, is_active = $6, labor_hours = $9,
              updated_by = $10
        where id = $7 and company_id = $8
        returning id`,
      [
        d.name,
        d.description || null,
        d.category || null,
        d.base_price,
        d.unit,
        d.is_active,
        d.id,
        auth.session.companyId,
        d.labor_hours,
        auth.session.userId,
      ],
    )
    if (!rows[0]) return { ok: false, error: 'Item not found' }
    await logActivity({
      companyId: auth.session.companyId,
      userId: auth.session.userId,
      entityType: 'catalog_item',
      entityId: d.id,
      action: 'price_book_item_updated',
      description: `${d.name} updated ($${d.base_price})`,
      changes: { name: d.name, base_price: d.base_price, unit: d.unit },
    })
    revalidate()
    reindex(auth.session.companyId, rows[0].id)
    return { ok: true, data: { id: rows[0].id } }
  } catch (e) {
    console.error('updateCatalogItem failed', e)
    return { ok: false, error: 'Could not save the item. Please try again.' }
  }
}

/**
 * Deactivates rather than deletes.
 *
 * `quote_items` copies name and price at the time a quote is built, so removing
 * a catalog row would not corrupt past quotes — but a contractor who retires an
 * item usually wants it out of the picker, not erased, and an accidental delete
 * of a price book is unrecoverable.
 */
export async function setCatalogItemActive(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = idSchema.extend({ is_active: z.boolean() }).safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  try {
    const rows = await query<{ id: string }>(
      `update catalog_items set is_active = $1
        where id = $2 and company_id = $3
        returning id`,
      [parsed.data.is_active, parsed.data.id, auth.session.companyId],
    )
    if (!rows[0]) return { ok: false, error: 'Item not found' }
    revalidate()
    reindex(auth.session.companyId, rows[0].id)
    return { ok: true, data: { id: rows[0].id } }
  } catch (e) {
    console.error('setCatalogItemActive failed', e)
    return { ok: false, error: 'Could not update the item. Please try again.' }
  }
}

export async function deleteCatalogItem(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  try {
    const rows = await query<{ id: string }>(
      `delete from catalog_items
        where id = $1 and company_id = $2
        returning id`,
      [parsed.data.id, auth.session.companyId],
    )
    if (!rows[0]) return { ok: false, error: 'Item not found' }
    await logActivity({
      companyId: auth.session.companyId,
      userId: auth.session.userId,
      entityType: 'catalog_item',
      entityId: parsed.data.id,
      action: 'price_book_item_archived',
      description: 'Price book item archived',
    })
    revalidate()
    after(async () => {
      try { await unindexCatalogItem(auth.session.companyId, rows[0].id) }
      catch (e) { console.error('catalog unindex failed', e) }
    })
    return { ok: true, data: { id: rows[0].id } }
  } catch (e) {
    console.error('deleteCatalogItem failed', e)
    return { ok: false, error: 'Could not delete the item. Please try again.' }
  }
}

// -----------------------------------------------------------------------------
// CSV import
// -----------------------------------------------------------------------------

const MAX_ROWS = 2000

const importSchema = z.object({
  csv: z.string().min(1, 'The file looks empty').max(2_000_000, 'That file is too large'),
})

export type ImportResult = {
  imported: number
  /** Existing items whose price/details the file overwrote (their book wins). */
  updated?: number
  /** Untouched starter-seed items still active — offer the one-tap archive. */
  starter_leftovers?: number
  skipped: number
  /** Row-level problems, capped so a badly-formed file cannot flood the UI. */
  errors: Array<{ row: number; reason: string }>
}

/**
 * Bulk-loads a price book from a CSV export.
 *
 * Building the catalog by hand is where onboarding dies across this whole
 * category — see docs/STRATEGY.md §4 lever 2. Most contractors already have
 * their pricing in a spreadsheet, so importing it is the difference between
 * five minutes and an afternoon.
 *
 * Partial success is deliberate: a single unparseable row should not reject the
 * other 149. The caller is told exactly which rows were skipped and why.
 */
export async function importCatalogCsv(input: unknown): Promise<Result<ImportResult>> {
  const parsed = importSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  const rows = parseCsv(parsed.data.csv)
  if (rows.length < 2) {
    return { ok: false, error: 'That file has a header but no rows.' }
  }

  const cols = mapHeaders(rows[0])
  if (cols.name === undefined || cols.base_price === undefined) {
    return {
      ok: false,
      error:
        'Could not find a name and a price column. Headers like "name" and "price" work, as do "item" and "cost".',
    }
  }

  const body = rows.slice(1)
  if (body.length > MAX_ROWS) {
    return { ok: false, error: `That file has ${body.length} rows; the limit is ${MAX_ROWS}.` }
  }

  const values: unknown[] = []
  const tuples: string[] = []
  const errors: ImportResult['errors'] = []

  body.forEach((row, i) => {
    const lineNo = i + 2 // 1-indexed, and the header is line 1
    const name = (row[cols.name as number] ?? '').trim()
    if (!name) {
      errors.push({ row: lineNo, reason: 'No name' })
      return
    }
    if (name.length > 200) {
      errors.push({ row: lineNo, reason: 'Name is over 200 characters' })
      return
    }

    const price = parsePrice(row[cols.base_price as number] ?? '')
    if (price === null) {
      errors.push({ row: lineNo, reason: 'Price is not a number' })
      return
    }
    if (price < 0) {
      errors.push({ row: lineNo, reason: 'Price is negative' })
      return
    }

    const description = cols.description !== undefined ? (row[cols.description] ?? '').trim() : ''
    const category = cols.category !== undefined ? (row[cols.category] ?? '').trim() : ''
    const unit = cols.unit !== undefined ? (row[cols.unit] ?? '').trim() : ''

    // A bad hours value skips the field, never the row. Someone's price book is
    // worth importing without its hours; it is not worth rejecting over them.
    const rawHours = cols.labor_hours !== undefined ? (row[cols.labor_hours] ?? '').trim() : ''
    const hours = rawHours ? Number(rawHours.replace(/[^0-9.]/g, '')) : NaN
    const laborHours = Number.isFinite(hours) && hours >= 0 && hours <= 999 ? hours : null

    const b = values.length
    values.push(
      auth.session.companyId,
      name,
      description || null,
      category || null,
      Math.round(price * 100) / 100,
      unit || 'each',
      laborHours,
    )
    tuples.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`)
  })

  if (tuples.length === 0) {
    return {
      ok: false,
      error: `Nothing could be imported — all ${body.length} rows had problems.`,
    }
  }

  let updated = 0
  try {
    // A name match means the same service: the incoming row wins, because a
    // business importing its own book is correcting ours — the starter items
    // are placeholders, theirs are real. Case-insensitive, per company. This
    // also makes re-importing the same file idempotent instead of doubling.
    const res = await query<{ inserted: boolean }>(
      `insert into catalog_items
         (company_id, name, description, category, base_price, unit, labor_hours, source)
       select v.*, 'import' from (values ${tuples.join(', ')}) as v
         (company_id, name, description, category, base_price, unit, labor_hours)
       on conflict (company_id, lower(name)) where is_active do update
         set description = excluded.description,
             category = coalesce(excluded.category, catalog_items.category),
             base_price = excluded.base_price,
             unit = coalesce(excluded.unit, catalog_items.unit),
             labor_hours = coalesce(excluded.labor_hours, catalog_items.labor_hours),
             source = 'import',
             is_active = true,
             updated_at = now()
       returning (xmax = 0) as inserted`,
      values,
    )
    updated = res.filter((r) => !r.inserted).length
  } catch (e) {
    console.error('importCatalogCsv failed', e)
    return { ok: false, error: 'Could not import the file. Please try again.' }
  }

  // Untouched starter items left standing next to a real book — the UI offers
  // to archive them in one tap. Edited ones are theirs and never counted.
  const [leftovers] = await query<{ n: number }>(
    `select count(*)::int as n from catalog_items
      where company_id = $1 and source = 'starter' and is_active
        and updated_at = created_at`,
    [auth.session.companyId],
  )

  revalidate()
  reindexAll(auth.session.companyId)
  return {
    ok: true,
    data: {
      imported: tuples.length - updated,
      updated,
      starter_leftovers: leftovers?.n ?? 0,
      skipped: errors.length,
      errors: errors.slice(0, 20),
    },
  }
}

// -----------------------------------------------------------------------------
// AI catalog extraction from existing paperwork.
//
// Returns rows for review; it deliberately does not write. Saving goes through
// importCatalogCsv, the same path a contractor's own spreadsheet takes, so
// there is one set of validation and one error report. See
// src/lib/ai/extract-catalog.ts for why the review step is load-bearing.
// -----------------------------------------------------------------------------

export type ExtractResult = {
  items: ExtractedItem[]
  documentType: string
  notes: string
  mode: string
}

export async function extractCatalogFromUpload(formData: FormData): Promise<Result<ExtractResult>> {
  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  // Reading a price book out of a document is the dearest AI call in the
  // product — a scanned PDF is many pages of vision tokens. Fifteen an hour is
  // far more than importing a price book legitimately needs.
  const rl = await checkRateLimit(
    `ai:extract:${auth.session.companyId}`,
    LIMITS.aiExtract.limit,
    LIMITS.aiExtract.windowSeconds,
  )
  if (!rl.allowed) {
    return {
      ok: false,
      error: `That is a lot of document reading in one hour. Try again in ${Math.ceil(rl.resetIn / 60)} minutes.`,
    }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose a file to read.' }
  }

  if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
    return {
      ok: false,
      error: 'That file type is not supported. Use a PDF or a photo (PNG, JPG, HEIC).',
    }
  }

  if (file.size > MAX_FILE_BYTES) {
    const mb = Math.round(MAX_FILE_BYTES / (1024 * 1024))
    return { ok: false, error: `That file is too large. The limit is ${mb}MB.` }
  }

  let result: ExtractResult
  try {
    result = await extractCatalogFromDocument({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    })
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return { ok: false, error: 'AI is not available right now. You can still import a CSV.' }
    }
    console.error('extractCatalogFromUpload failed', e)
    return { ok: false, error: 'Could not read that document. Try again.' }
  }

  if (result.items.length === 0) {
    return {
      ok: false,
      error:
        'No priced items found in that document. A quote, invoice or price sheet works best — make sure prices are visible.',
    }
  }

  return { ok: true, data: result }
}

/** Saves reviewed rows through the CSV importer. */
export async function importExtractedItems(items: unknown): Promise<Result<ImportResult>> {
  const parsed = z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        description: z.string().max(500).optional().default(''),
        category: z.string().max(100).optional().default(''),
        unit: z.string().max(40).optional().default('each'),
        price: z.coerce.number().positive().max(9_999_999.99),
      }),
    )
    .min(1, 'Nothing selected to import')
    .max(2000)
    .safeParse(items)

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid items' }
  }

  return importCatalogCsv({ csv: itemsToCsv(parsed.data) })
}

// -----------------------------------------------------------------------------
// Labels
//
// `category` was free text, so "Diagnostics", "diagnostic" and "Diagnostic Fees"
// all coexisted and the grouping stopped meaning anything. Labels are a real set
// the contractor picks from, created on first use — the same lookup-or-create
// shape as adding a line item or finding a customer.
// -----------------------------------------------------------------------------

export type CatalogLabel = { id: string; name: string; item_count: number }

export async function listLabels(): Promise<CatalogLabel[]> {
  const session = await getSession()
  if (!session) return []
  return query<CatalogLabel>(
    `select l.id, l.name,
            (select count(*)::int from catalog_item_labels il where il.label_id = l.id) as item_count
       from catalog_labels l
      where l.company_id = $1
      order by l.name`,
    [session.companyId],
  )
}

const labelNameSchema = z.string().trim().min(1, 'Label needs a name').max(60)

/**
 * Find a label by name or create it. Case-insensitive, so "Diagnostics" typed
 * a second time as "diagnostics" resolves to the one that exists — which is the
 * entire reason labels replaced free text.
 */
async function resolveLabel(companyId: string, rawName: string): Promise<string | null> {
  const name = rawName.trim()
  if (!name) return null

  const existing = await query<{ id: string }>(
    `select id from catalog_labels
      where company_id = $1 and lower(trim(name)) = lower($2)
      limit 1`,
    [companyId, name],
  )
  if (existing[0]) return existing[0].id

  const created = await query<{ id: string }>(
    `insert into catalog_labels (company_id, name) values ($1, $2)
     on conflict do nothing
     returning id`,
    [companyId, name],
  )
  if (created[0]) return created[0].id

  // Lost a race with a concurrent insert; the row exists now.
  const again = await query<{ id: string }>(
    `select id from catalog_labels
      where company_id = $1 and lower(trim(name)) = lower($2) limit 1`,
    [companyId, name],
  )
  return again[0]?.id ?? null
}

const setLabelsSchema = z.object({
  item_id: z.string().uuid(),
  labels: z.array(labelNameSchema).max(10),
})

/** Replaces an item's labels, creating any that are new. */
export async function setCatalogItemLabels(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = setLabelsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid labels' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth
  const { companyId } = auth.session

  const owns = await query<{ id: string }>(
    'select id from catalog_items where id = $1 and company_id = $2 limit 1',
    [parsed.data.item_id, companyId],
  )
  if (!owns[0]) return { ok: false, error: 'Item not found' }

  // De-duplicate case-insensitively before touching the database — the same
  // label typed twice in one edit is one label.
  const seen = new Set<string>()
  const names = parsed.data.labels.filter((n) => {
    const k = n.trim().toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })

  try {
    const ids: string[] = []
    for (const name of names) {
      const id = await resolveLabel(companyId, name)
      if (id) ids.push(id)
    }

    await query('delete from catalog_item_labels where catalog_item_id = $1', [parsed.data.item_id])
    if (ids.length) {
      const values: unknown[] = []
      const tuples = ids.map((id, i) => {
        values.push(parsed.data.item_id, id)
        return `($${i * 2 + 1}, $${i * 2 + 2})`
      })
      await query(
        `insert into catalog_item_labels (catalog_item_id, label_id)
         values ${tuples.join(', ')} on conflict do nothing`,
        values,
      )
    }
  } catch (e) {
    console.error('setCatalogItemLabels failed', e)
    return { ok: false, error: 'Could not save those labels. Please try again.' }
  }

  revalidate()
  return { ok: true, data: { id: parsed.data.item_id } }
}

/** Removes a label everywhere. The items keep their own free-text category. */
export async function deleteLabel(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid label' }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  const rows = await query<{ id: string }>(
    'delete from catalog_labels where id = $1 and company_id = $2 returning id',
    [parsed.data.id, auth.session.companyId],
  )
  if (!rows[0]) return { ok: false, error: 'Label not found' }

  revalidate()
  return { ok: true, data: { id: rows[0].id } }
}

// -----------------------------------------------------------------------------
// Promotions
//
// Contractor-applied, targeting labels so one rule covers every matching item.
// See src/lib/promotions.ts for the pricing rules and why the customer never
// enters a code.
// -----------------------------------------------------------------------------

export type PromotionRow = {
  id: string
  name: string
  code: string | null
  discount_type: DiscountType
  discount_value: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  labels: string[]
  /** Whether it is in force right now, which is what the contractor asks. */
  live: boolean
}

export async function listPromotions(): Promise<PromotionRow[]> {
  const session = await getSession()
  if (!session) return []

  const rows = await query<Omit<PromotionRow, 'live'>>(
    `select p.id, p.name, p.code, p.discount_type, p.discount_value,
            p.starts_at, p.ends_at, p.is_active,
            coalesce(
              (select array_agg(l.name order by l.name)
                 from promotion_labels pl
                 join catalog_labels l on l.id = pl.label_id
                where pl.promotion_id = p.id),
              '{}'
            ) as labels
       from promotions p
      where p.company_id = $1
      order by p.is_active desc, p.created_at desc`,
    [session.companyId],
  )

  const now = new Date()
  return rows.map((r) => ({
    ...r,
    discount_value: Number(r.discount_value),
    live: isLive(
      {
        id: r.id,
        name: r.name,
        discountType: r.discount_type,
        discountValue: Number(r.discount_value),
        startsAt: r.starts_at ? new Date(r.starts_at) : null,
        endsAt: r.ends_at ? new Date(r.ends_at) : null,
        isActive: r.is_active,
        labelIds: r.labels.length ? ['x'] : [],
      },
      now,
    ),
  }))
}

const promotionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Give the promotion a name').max(120),
  code: z.string().trim().max(40).optional().or(z.literal('')),
  discount_type: z.enum(['percent', 'amount', 'fixed_price']),
  discount_value: z.coerce.number().min(0),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
  labels: z.array(z.string().trim().min(1).max(60)).min(1, 'Pick at least one label to discount'),
})

export async function savePromotion(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = promotionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid promotion' }
  }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth
  const { companyId } = auth.session
  const d = parsed.data

  if (d.discount_type === 'percent' && d.discount_value > 100) {
    return { ok: false, error: 'A percentage discount cannot exceed 100%.' }
  }
  if (d.starts_at && d.ends_at && new Date(d.ends_at) <= new Date(d.starts_at)) {
    return { ok: false, error: 'The end date has to be after the start date.' }
  }

  try {
    let id = d.id
    if (id) {
      const rows = await query<{ id: string }>(
        `update promotions
            set name = $1, code = $2, discount_type = $3, discount_value = $4,
                starts_at = $5, ends_at = $6, is_active = $7, updated_at = now()
          where id = $8 and company_id = $9
          returning id`,
        [d.name, d.code || null, d.discount_type, d.discount_value,
         d.starts_at ?? null, d.ends_at ?? null, d.is_active, id, companyId],
      )
      if (!rows[0]) return { ok: false, error: 'Promotion not found' }
    } else {
      const rows = await query<{ id: string }>(
        `insert into promotions
           (company_id, name, code, discount_type, discount_value, starts_at, ends_at, is_active)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [companyId, d.name, d.code || null, d.discount_type, d.discount_value,
         d.starts_at ?? null, d.ends_at ?? null, d.is_active],
      )
      id = rows[0].id
    }

    // Labels are resolved through the same lookup-or-create the catalog uses, so
    // a promotion can name a label that does not exist yet.
    const labelIds: string[] = []
    for (const name of d.labels) {
      const labelId = await resolveLabel(companyId, name)
      if (labelId) labelIds.push(labelId)
    }
    await query('delete from promotion_labels where promotion_id = $1', [id])
    if (labelIds.length) {
      const values: unknown[] = []
      const tuples = labelIds.map((lid, i) => {
        values.push(id, lid)
        return `($${i * 2 + 1}, $${i * 2 + 2})`
      })
      await query(
        `insert into promotion_labels (promotion_id, label_id) values ${tuples.join(', ')}
         on conflict do nothing`,
        values,
      )
    }

    revalidate()
    return { ok: true, data: { id: id! } }
  } catch (e) {
    console.error('savePromotion failed', e)
    return { ok: false, error: 'Could not save that promotion. Please try again.' }
  }
}

export async function deletePromotion(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid promotion' }

  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  const rows = await query<{ id: string }>(
    'delete from promotions where id = $1 and company_id = $2 returning id',
    [parsed.data.id, auth.session.companyId],
  )
  if (!rows[0]) return { ok: false, error: 'Promotion not found' }

  revalidate()
  return { ok: true, data: { id: rows[0].id } }
}

// ---------------------------------------------------------------------------

/**
 * A picture on a catalog item.
 *
 * A technician explaining a part in someone's utility room has nothing to point
 * at. The contractor's own photo of the thing they actually fit does more than
 * any description — which is why technicians can see catalog images while the
 * prices stay withheld.
 *
 * Lands in the same private bucket as quote photos, so it is served through
 * short-lived signed URLs and never becomes a permanent public link.
 */
export async function setCatalogItemImage(formData: FormData): Promise<Result<{ path: string }>> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  if (!hasPermission(session.role as UserRole, 'canEditCatalog')) {
    return { ok: false, error: 'Only an owner can change the price book.' }
  }

  const itemId = String(formData.get('item_id') ?? '')
  if (!z.string().uuid().safeParse(itemId).success) {
    return { ok: false, error: 'Invalid item' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a photo.' }
  if (!IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Use a JPG, PNG or HEIC.' }
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: `That photo is over ${IMAGE_MAX_BYTES / 1024 / 1024}MB.` }
  }

  // The item must belong to the caller. pg bypasses RLS, so this is the check.
  const owned = await query<{ id: string; image_path: string | null }>(
    'select id, image_path from catalog_items where id = $1 and company_id = $2 limit 1',
    [itemId, session.companyId],
  )
  if (!owned[0]) return { ok: false, error: 'Item not found' }

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'jpg'
  const path = `${session.companyId}/catalog/${itemId}/${randomUUID()}.${ext}`

  const admin = createAdminClient()
  const { error: upErr } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (upErr) {
    console.error('setCatalogItemImage upload failed', upErr)
    return { ok: false, error: 'Could not upload that photo. Try again.' }
  }

  try {
    await query('update catalog_items set image_path = $1 where id = $2 and company_id = $3', [
      path,
      itemId,
      session.companyId,
    ])
  } catch (e) {
    // Don't strand the object if the row failed.
    await admin.storage.from(PHOTO_BUCKET).remove([path])
    console.error('setCatalogItemImage update failed', e)
    return { ok: false, error: 'Could not save that photo. Try again.' }
  }

  // Replacing an image leaves the old object paying rent forever otherwise.
  if (owned[0].image_path) {
    await admin.storage.from(PHOTO_BUCKET).remove([owned[0].image_path])
  }

  revalidatePath('/app/catalog')
  return { ok: true, data: { path } }
}

/**
 * One-tap cleanup after a business imports its own book: archive the starter
 * items they never edited. Edited starter rows are theirs and stay; archived
 * rows are restorable from the archived view — nothing is deleted.
 */
export async function archiveStarterLeftovers(): Promise<Result<{ archived: number }>> {
  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth
  const rows = await query<{ id: string }>(
    `update catalog_items
        set is_active = false
      where company_id = $1 and source = 'starter' and is_active
        and updated_at = created_at
      returning id`,
    [auth.session.companyId],
  )
  revalidate()
  reindexAll(auth.session.companyId)
  return { ok: true, data: { archived: rows.length } }
}

/**
 * Bulk archive — the "I don't want these 100 starter rows" action. Archive,
 * never delete (standing owner rule): items leave quoting and the book
 * immediately but stay restorable from the inactive state. Capped and
 * company-scoped; ids that aren't yours simply don't match.
 */
export async function archiveCatalogItems(input: unknown): Promise<Result<{ archived: number }>> {
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid selection' }
  const auth = await requireCatalogEditor()
  if (!auth.ok) return auth

  const rows = await query<{ id: string }>(
    `update catalog_items set is_active = false
      where company_id = $1 and id = any($2::uuid[]) and is_active
      returning id`,
    [auth.session.companyId, parsed.data.ids],
  )
  revalidate()
  reindexAll(auth.session.companyId)
  return { ok: true, data: { archived: rows.length } }
}
