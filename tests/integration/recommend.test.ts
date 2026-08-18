import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { recommendCompanions } from '@/lib/quotes/recommend'
import { query } from '@/lib/db'

import { createCompany, createCustomer, createWorkItem, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * Recommendations come from the company's own habits: items that historically
 * share a quote with what is on this one rank first, another tenant's history
 * never leaks in, and what is already on the quote is never suggested back.
 */

let co: TestCompany
let other: TestCompany

async function catalogItem(companyId: string, name: string, price: number) {
  const [row] = await query<{ id: string }>(
    `insert into catalog_items (company_id, name, base_price, unit, is_active)
     values ($1, $2, $3, 'each', true) returning id`,
    [companyId, name, price],
  )
  return row.id
}

async function quoteWith(companyId: string, customerId: string, names: string[]) {
  const w = await createWorkItem(companyId, customerId)
  for (const [i, n] of names.entries()) {
    await query(
      `insert into quote_items (work_item_id, name, quantity, unit_price, sort_order)
       values ($1, $2, 1, 100, $3)`,
      [w.id, n, i],
    )
  }
  return w.id
}

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Recommend Co')
  other = await createCompany('Bystander Recommend Co')
  const cust = await createCustomer(co.id, 'Rec Tester')
  const otherCust = await createCustomer(other.id, 'Other Tester')

  for (const n of ['Condenser Swap', 'Pad Install', 'Permit Filing', 'Coil Wash']) {
    await catalogItem(co.id, n, 100)
  }
  await catalogItem(other.id, 'Foreign Habit', 999)

  // Habit: Condenser Swap goes with Pad Install twice, Permit Filing once.
  await quoteWith(co.id, cust, ['Condenser Swap', 'Pad Install', 'Permit Filing'])
  await quoteWith(co.id, cust, ['Condenser Swap', 'Pad Install'])
  // The other tenant pairs Condenser Swap with something else, loudly.
  for (let i = 0; i < 5; i++) await quoteWith(other.id, otherCust, ['Condenser Swap', 'Foreign Habit'])
})

afterAll(async () => {
  for (const c of [co, other]) if (c?.id) await query('delete from companies where id = $1', [c.id])
})

describe('recommendCompanions', () => {
  it('ranks by this company’s co-occurrence and never suggests what is present', async () => {
    const recs = await recommendCompanions(co.id, ['Condenser Swap'])
    const names = recs.map((r) => r.name)
    expect(names[0]).toBe('Pad Install')
    expect(recs[0].together).toBe(2)
    expect(names).toContain('Permit Filing')
    expect(names).not.toContain('Condenser Swap')
    expect(names).not.toContain('Foreign Habit')
  })

  it('another tenant’s habits never leak', async () => {
    const recs = await recommendCompanions(other.id, ['Condenser Swap'])
    expect(recs.map((r) => r.name)).toContain('Foreign Habit')
    expect(recs.map((r) => r.name)).not.toContain('Pad Install')
  })

  it('empty input recommends nothing', async () => {
    expect(await recommendCompanions(co.id, [])).toEqual([])
  })
})
