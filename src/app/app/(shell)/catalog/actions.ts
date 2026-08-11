'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { mapHeaders, parseCsv, parsePrice } from '@/lib/csv'
import { hasPermission, type UserRole } from '@/lib/permissions'

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
  is_active: z.boolean().default(true),
})

const createSchema = itemSchema
const updateSchema = itemSchema.extend({ id: z.string().uuid() })
const idSchema = z.object({ id: z.string().uuid() })

export type CatalogItemInput = z.input<typeof itemSchema>

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Owner-only. Returns the session when allowed, an error result otherwise. */
async function requireCatalogEditor() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (!hasPermission(session.role as UserRole, 'canEditCatalog')) {
    return { ok: false as const, error: 'Only an owner can change pricing.' }
  }
  return { ok: true as const, session }
}

function revalidate() {
  revalidatePath('/app/catalog')
  // Quote generation reads the catalog, so its empty state changes too.
  revalidatePath('/app/quotes/new')
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
         (company_id, name, description, category, base_price, unit, is_active)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        auth.session.companyId,
        d.name,
        d.description || null,
        d.category || null,
        d.base_price,
        d.unit,
        d.is_active,
      ],
    )
    const id = rows[0]?.id
    if (!id) return { ok: false, error: 'Could not add the item. Please try again.' }
    revalidate()
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
              base_price = $4, unit = $5, is_active = $6
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
      ],
    )
    if (!rows[0]) return { ok: false, error: 'Item not found' }
    revalidate()
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
    revalidate()
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

    const b = values.length
    values.push(
      auth.session.companyId,
      name,
      description || null,
      category || null,
      Math.round(price * 100) / 100,
      unit || 'each',
    )
    tuples.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`)
  })

  if (tuples.length === 0) {
    return {
      ok: false,
      error: `Nothing could be imported — all ${body.length} rows had problems.`,
    }
  }

  try {
    await query(
      `insert into catalog_items (company_id, name, description, category, base_price, unit)
       values ${tuples.join(', ')}`,
      values,
    )
  } catch (e) {
    console.error('importCatalogCsv failed', e)
    return { ok: false, error: 'Could not import the file. Please try again.' }
  }

  revalidate()
  return {
    ok: true,
    data: {
      imported: tuples.length,
      skipped: errors.length,
      errors: errors.slice(0, 20),
    },
  }
}
