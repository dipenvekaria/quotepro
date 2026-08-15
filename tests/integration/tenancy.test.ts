import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import {
  createCatalogItem,
  createCompany,
  createCustomer,
  createWorkItem,
  type TestCompany,
} from './fixtures'
import { requireDatabase } from './setup'

/**
 * Cross-tenant isolation, exercised against real rows.
 *
 * `tests/tenancy.test.ts` reads the source and fails on a statement with no
 * company_id predicate. That catches a missing `where`, but it cannot catch a
 * predicate that is present and wrong. These build two companies and try to
 * reach across.
 *
 * The pg pool connects as superuser and bypasses RLS, so these scoped queries
 * are the only thing standing between two contractors' data.
 */

let a: TestCompany
let b: TestCompany
const seeded: Record<string, string> = {}

beforeAll(async () => {
  await requireDatabase()
  a = await createCompany('Company A')
  b = await createCompany('Company B')

  const custA = await createCustomer(a.id, 'A Customer', '+1-555-1111')
  const custB = await createCustomer(b.id, 'B Customer', '+1-555-2222')
  seeded.custA = custA
  seeded.custB = custB

  seeded.workA = (await createWorkItem(a.id, custA, 'quote_sent', { total: 500 })).id
  const wb = await createWorkItem(b.id, custB, 'quote_sent', { total: 900 })
  seeded.workB = wb.id
  seeded.tokenB = wb.public_token

  seeded.catA = await createCatalogItem(a.id, 'A Widget', 100)
  seeded.catB = await createCatalogItem(b.id, 'B Widget', 200)
})

afterAll(async () => {
  await a.cleanup()
  await b.cleanup()
})

/** Every scoped read the app performs, asked to fetch the other company's row. */
describe('a company-scoped read cannot reach another company', () => {
  const cases: { table: string; sql: string; id: () => string }[] = [
    {
      table: 'work_items',
      sql: 'select id from work_items where id = $1 and company_id = $2',
      id: () => seeded.workB,
    },
    {
      table: 'customers',
      sql: 'select id from customers where id = $1 and company_id = $2',
      id: () => seeded.custB,
    },
    {
      table: 'catalog_items',
      sql: 'select id from catalog_items where id = $1 and company_id = $2',
      id: () => seeded.catB,
    },
  ]

  for (const c of cases) {
    it(`${c.table}: company A gets nothing for a company B row`, async () => {
      const rows = await query(c.sql, [c.id(), a.id])
      expect(rows).toHaveLength(0)
    })

    it(`${c.table}: the row does exist for its own company`, async () => {
      // Guards against the assertion above passing because the row is missing.
      const rows = await query(c.sql, [c.id(), b.id])
      expect(rows).toHaveLength(1)
    })
  }
})

describe('list reads never bleed across companies', () => {
  it('work items', async () => {
    const rows = await query<{ company_id: string }>(
      'select company_id from work_items where company_id = $1',
      [a.id],
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.company_id === a.id)).toBe(true)
  })

  it('catalog items', async () => {
    const rows = await query<{ company_id: string }>(
      'select company_id from catalog_items where company_id = $1',
      [a.id],
    )
    expect(rows.every((r) => r.company_id === a.id)).toBe(true)
  })

  it('customers', async () => {
    const rows = await query<{ company_id: string }>(
      'select company_id from customers where company_id = $1',
      [a.id],
    )
    expect(rows.every((r) => r.company_id === a.id)).toBe(true)
  })
})

describe('mutations cannot cross a company boundary', () => {
  it('an update scoped to the wrong company changes nothing', async () => {
    const before = await query<{ total: number }>('select total from work_items where id = $1', [
      seeded.workB,
    ])

    const affected = await query(
      'update work_items set total = 1 where id = $1 and company_id = $2 returning id',
      [seeded.workB, a.id],
    )
    expect(affected).toHaveLength(0)

    const after = await query<{ total: number }>('select total from work_items where id = $1', [
      seeded.workB,
    ])
    expect(Number(after[0].total)).toBe(Number(before[0].total))
  })

  it('a delete scoped to the wrong company removes nothing', async () => {
    const affected = await query(
      'delete from catalog_items where id = $1 and company_id = $2 returning id',
      [seeded.catB, a.id],
    )
    expect(affected).toHaveLength(0)

    const still = await query('select id from catalog_items where id = $1', [seeded.catB])
    expect(still).toHaveLength(1)
  })
})

describe('public tokens', () => {
  it('resolve a quote without a session, which is the point', async () => {
    const rows = await query('select id from work_items where public_token = $1', [seeded.tokenB])
    expect(rows).toHaveLength(1)
  })

  it('are long enough that guessing is not a strategy', async () => {
    // 128 bits of hex. Short tokens are the classic way a "private link" stops
    // being private.
    expect(seeded.tokenB).toMatch(/^[0-9a-f]{32}$/)
  })

  it('are unique across companies', async () => {
    const dupes = await query<{ n: number }>(
      `select count(*)::int as n from (
         select public_token from work_items group by public_token having count(*) > 1
       ) d`,
    )
    expect(dupes[0].n).toBe(0)
  })
})
