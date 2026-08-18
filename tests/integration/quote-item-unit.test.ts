import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { addLineItem } from '@/lib/ai/quote-tools'
import { query } from '@/lib/db'

import { createCompany, createCustomer, createWorkItem, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * The unit travels from the catalog onto the quote line.
 *
 * Half the starter catalogs price per ton / sq ft / hour, and the unit used to
 * die at the line: "3 × $1,650.00" read as three condensers, and per-install
 * labour multiplied by tonnage booked a one-afternoon job as three days. The
 * write path snapshots `unit` exactly as it already snapshots price and hours.
 */

let co: TestCompany
let workItemId: string
let catalogItemId: string

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Unit Snapshot Co')
  const customerId = await createCustomer(co.id, 'Unit Tester')
  const wi = await createWorkItem(co.id, customerId, 'quote_draft')
  workItemId = wi.id
  const [row] = await query<{ id: string }>(
    `insert into catalog_items (company_id, name, base_price, unit, labor_hours, is_active)
     values ($1, 'Condenser Replacement Per Ton', 1650, 'ton', 8.75, true)
     returning id`,
    [co.id],
  )
  catalogItemId = row.id
})

afterAll(async () => {
  if (co?.id) await query('delete from companies where id = $1', [co.id])
})

describe('agent add_line_item', () => {
  it('snapshots unit and labour hours from the catalog row', async () => {
    await addLineItem({ companyId: co.id, workItemId }, catalogItemId, 3)

    const [line] = await query<{
      unit: string | null
      labor_hours: number | null
      quantity: number
    }>(
      `select unit, labor_hours, quantity from quote_items
        where work_item_id = $1 order by created_at desc limit 1`,
      [workItemId],
    )
    expect(line.unit).toBe('ton')
    expect(Number(line.labor_hours)).toBe(8.75)
    expect(Number(line.quantity)).toBe(3)
  })
})
