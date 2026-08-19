import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { query, pool } from '@/lib/db'

/**
 * The switching-import conflict rules, against the real database: a name
 * match updates instead of duplicating (their book wins over the starter),
 * re-imports are idempotent, and the one-tap starter cleanup archives only
 * untouched seed rows.
 */

const COMPANY = '55555555-4444-3333-2222-111111111111'

vi.mock('@/lib/auth/session', () => ({
  getSession: async () => ({ companyId: COMPANY, userId: null, role: 'owner' }),
  requireSession: async () => ({ companyId: COMPANY, userId: null, role: 'owner' }),
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('next/server', async (orig) => {
  const real = (await orig()) as Record<string, unknown>
  return { ...real, after: (fn: () => unknown) => void fn }
})

import {
  archiveStarterLeftovers,
  importCatalogCsv,
} from '@/app/app/(shell)/catalog/actions'

beforeAll(async () => {
  await cleanup()
  await query(`insert into companies (id, name) values ($1, 'Upsert Test Co')`, [COMPANY])
  // Two starter rows: one the contractor later edits, one untouched.
  await query(
    `insert into catalog_items (company_id, name, base_price, source) values
       ($1, 'AC Tune-Up', 149, 'starter'),
       ($1, 'Old Placeholder', 99, 'starter')`,
    [COMPANY],
  )
  // "Edited" = updated_at moves past created_at.
  await query(
    `update catalog_items set base_price = 179, updated_at = now() + interval '1 second'
      where company_id = $1 and name = 'AC Tune-Up'`,
    [COMPANY],
  )
})

async function cleanup() {
  await query(`delete from document_embeddings where company_id = $1`, [COMPANY]).catch(() => {})
  await query(`delete from catalog_items where company_id = $1`, [COMPANY])
  await query(`delete from companies where id = $1`, [COMPANY])
}

afterAll(async () => {
  await cleanup()
  await pool.end()
})

const CSV = ['name,price', 'AC Tune-Up,129', 'Drain Cleaning,220'].join('\n')

describe('price book import conflicts', () => {
  it('a name match updates in place — their book wins', async () => {
    const res = await importCatalogCsv({ csv: CSV })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.imported).toBe(1) // Drain Cleaning
    expect(res.data.updated).toBe(1) // AC Tune-Up overwritten
    expect(res.data.starter_leftovers).toBe(1) // Old Placeholder untouched

    const rows = await query<{ name: string; base_price: string; source: string }>(
      `select name, base_price, source from catalog_items
        where company_id = $1 and lower(name) = 'ac tune-up' and is_active`,
      [COMPANY],
    )
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].base_price)).toBe(129)
    expect(rows[0].source).toBe('import')
  })

  it('re-importing the same file changes nothing new', async () => {
    const res = await importCatalogCsv({ csv: CSV })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.imported).toBe(0)
    expect(res.data.updated).toBe(2)
    const [count] = await query<{ n: number }>(
      `select count(*)::int as n from catalog_items where company_id = $1 and is_active`,
      [COMPANY],
    )
    expect(count.n).toBe(3)
  })

  it('starter cleanup archives only the untouched seed row', async () => {
    const res = await archiveStarterLeftovers()
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.archived).toBe(1)

    const rows = await query<{ name: string; is_active: boolean }>(
      `select name, is_active from catalog_items where company_id = $1 order by name`,
      [COMPANY],
    )
    const byName = Object.fromEntries(rows.map((r) => [r.name, r.is_active]))
    expect(byName['Old Placeholder']).toBe(false) // archived, not deleted
    expect(byName['AC Tune-Up']).toBe(true) // imported/edited — stays
    expect(byName['Drain Cleaning']).toBe(true)
  })
})
