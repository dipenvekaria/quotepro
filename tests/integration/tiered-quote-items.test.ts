import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'
import { liveTierPredicate } from '@/lib/quotes/items'

import { createCompany, createCustomer, createWorkItem, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * A good/better/best quote stores every tier in quote_items at once, because
 * each tier includes everything in the tier before it. Nothing filtered on that
 * tier, so a three-tier quote showed every line three times — the contractor
 * read it as duplicates, and the customer was sent the triplicated list.
 */

let co: TestCompany
let tiered: string
let plain: string

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Tier Co')
  const customer = await createCustomer(co.id, 'Tiered Customer')

  tiered = (await createWorkItem(co.id, customer, 'quote_draft')).id
  // Essential, then Recommended containing it, then Complete containing both —
  // the real shape, which is why the flat read triplicated the first line.
  const tiers: [string, string[]][] = [
    ['good', ['Diagnostic']],
    ['better', ['Diagnostic', 'Coil Replacement']],
    ['best', ['Diagnostic', 'Coil Replacement', 'Maintenance Plan']],
  ]
  for (const [i, [tier, names]] of tiers.entries()) {
    await query(
      `insert into quote_options (work_item_id, tier, name, total, sort_order)
       values ($1, $2, $3, 100, $4)`,
      [tiered, tier, tier, i],
    )
    for (const name of names) {
      await query(
        `insert into quote_items (work_item_id, name, quantity, unit_price, option_tier)
         values ($1, $2, 1, 100, $3)`,
        [tiered, name, tier],
      )
    }
  }

  plain = (await createWorkItem(co.id, customer, 'quote_draft')).id
  for (const name of ['Call out', 'Repair']) {
    await query(
      `insert into quote_items (work_item_id, name, quantity, unit_price) values ($1, $2, 1, 50)`,
      [plain, name],
    )
  }
})

afterAll(async () => {
  await co.cleanup()
})

const live = (id: string) =>
  query<{ name: string }>(
    `select qi.name from quote_items qi where qi.work_item_id = $1${liveTierPredicate(1)}`,
    [id],
  )

describe('reading a tiered quote', () => {
  it('stores every tier, which is why a flat read triplicated', async () => {
    const all = await query('select id from quote_items where work_item_id = $1', [tiered])
    expect(all).toHaveLength(6)
  })

  it('returns one tier, not all of them', async () => {
    const rows = await live(tiered)
    expect(rows).toHaveLength(3)
  })

  it('shows each line once', async () => {
    const names = (await live(tiered)).map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('Diagnostic')
  })

  it('follows the customer’s choice once they have made one', async () => {
    await query(`update quote_options set is_selected = true where work_item_id = $1 and tier = 'good'`, [
      tiered,
    ])
    const names = (await live(tiered)).map((r) => r.name)
    expect(names).toEqual(['Diagnostic'])

    await query('update quote_options set is_selected = false where work_item_id = $1', [tiered])
  })
})

describe('reading an ordinary quote', () => {
  it('is unaffected — untiered rows all come back', async () => {
    const rows = await live(plain)
    expect(rows.map((r) => r.name).sort()).toEqual(['Call out', 'Repair'])
  })
})
