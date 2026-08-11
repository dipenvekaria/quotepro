'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
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
