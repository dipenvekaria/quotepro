import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'
import { computeTotals } from '@/lib/money'
import { TIER_DB_KEY } from '@/lib/quotes/items'

import {
  createCatalogItem,
  createCompany,
  createCustomer,
  createWorkItem,
  type TestCompany,
} from './fixtures'
import { requireDatabase } from './setup'

/**
 * The lead → quote → job → invoice lifecycle, against real rows.
 *
 * One `work_item` carries the whole thing (ADR 0002), so the risks are a status
 * that moves without the data it implies, and money that disagrees between the
 * places it is shown.
 */

let co: TestCompany
let customerId: string

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Lifecycle Co')
  customerId = await createCustomer(co.id, 'Lifecycle Customer', '+1-555-3333')
  await createCatalogItem(co.id, 'Labour', 125)
})

afterAll(async () => {
  await co.cleanup()
})

describe('status progression', () => {
  it('carries a work item from lead to completed', async () => {
    const w = await createWorkItem(co.id, customerId, 'lead')

    const steps = [
      'quote_draft',
      'quote_sent',
      'quote_viewed',
      'quote_accepted',
      'job_scheduled',
      'job_in_progress',
      'job_completed',
    ]
    for (const status of steps) {
      await query(
        `update work_items set status = $1::work_item_status where id = $2 and company_id = $3`,
        [status, w.id, co.id],
      )
      const rows = await query<{ status: string }>(
        'select status from work_items where id = $1 and company_id = $2',
        [w.id, co.id],
      )
      expect(rows[0].status).toBe(status)
    }
  })

  it('keeps the same id and public token throughout, so a sent link never breaks', async () => {
    const w = await createWorkItem(co.id, customerId, 'quote_sent')
    const before = await query<{ public_token: string }>(
      'select public_token from work_items where id = $1',
      [w.id],
    )
    await query(
      `update work_items set status = 'quote_accepted'::work_item_status where id = $1 and company_id = $2`,
      [w.id, co.id],
    )
    const after = await query<{ public_token: string }>(
      'select public_token from work_items where id = $1',
      [w.id],
    )
    expect(after[0].public_token).toBe(before[0].public_token)
  })

  it('rejects a status the enum does not define', async () => {
    const w = await createWorkItem(co.id, customerId)
    await expect(
      query(`update work_items set status = 'nonsense'::work_item_status where id = $1`, [w.id]),
    ).rejects.toThrow()
  })
})

describe('money', () => {
  it('stores what computeTotals produced, so the app and the database agree', async () => {
    const w = await createWorkItem(co.id, customerId)
    const items = [
      { name: 'Labour', quantity: 3, unit_price: 125 },
      { name: 'Part', quantity: 1, unit_price: 450 },
    ]
    const totals = computeTotals(items, 10)

    const values: unknown[] = []
    const tuples = items.map((i, idx) => {
      const b = idx * 5
      values.push(w.id, i.name, i.quantity, i.unit_price, idx)
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`
    })
    await query(
      `insert into quote_items (work_item_id, name, quantity, unit_price, sort_order)
       values ${tuples.join(', ')}`,
      values,
    )
    await query(
      `update work_items set subtotal = $1, tax_rate = 10, tax_amount = $2, total = $3
        where id = $4 and company_id = $5`,
      [totals.subtotal, totals.taxAmount, totals.total, w.id, co.id],
    )

    const rows = await query<{ subtotal: number; tax_amount: number; total: number }>(
      'select subtotal, tax_amount, total from work_items where id = $1 and company_id = $2',
      [w.id, co.id],
    )
    expect(Number(rows[0].subtotal)).toBe(825)
    expect(Number(rows[0].total)).toBe(totals.total)
    // The stored total must equal subtotal + tax, or two screens will disagree.
    expect(Number(rows[0].total)).toBe(
      Number(rows[0].subtotal) + Number(rows[0].tax_amount),
    )
  })

  it("generates each line's total from quantity and price rather than trusting a client", async () => {
    const w = await createWorkItem(co.id, customerId)
    await query(
      `insert into quote_items (work_item_id, name, quantity, unit_price, sort_order)
       values ($1, 'Generated', 4, 25, 0)`,
      [w.id],
    )
    const rows = await query<{ total: number }>(
      'select total from quote_items where work_item_id = $1',
      [w.id],
    )
    expect(Number(rows[0].total)).toBe(100)
  })

  it('refuses a negative catalog price', async () => {
    await expect(createCatalogItem(co.id, 'Impossible', -50)).rejects.toThrow()
  })
})

describe('good/better/best', () => {
  it('stores three tiers with their own line items and ascending totals', async () => {
    const w = await createWorkItem(co.id, customerId)
    const tiers = [
      { key: 'essential' as const, items: [{ n: 'Labour', q: 2, p: 125 }] },
      { key: 'recommended' as const, items: [{ n: 'Labour', q: 3, p: 125 }, { n: 'Part', q: 1, p: 450 }] },
      { key: 'complete' as const, items: [{ n: 'Labour', q: 4, p: 125 }, { n: 'Part', q: 1, p: 450 }, { n: 'Warranty', q: 1, p: 149 }] },
    ]

    for (const [i, t] of tiers.entries()) {
      const db = TIER_DB_KEY[t.key]
      const totals = computeTotals(t.items.map((x) => ({ quantity: x.q, unit_price: x.p })), 10)
      await query(
        `insert into quote_options (work_item_id, tier, name, total, is_selected, sort_order)
         values ($1, $2, $3, $4, false, $5)`,
        [w.id, db, t.key, totals.total, i],
      )
      const vals: unknown[] = []
      const tup = t.items.map((x, ix) => {
        const b = ix * 6
        vals.push(w.id, x.n, x.q, x.p, db, ix)
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`
      })
      await query(
        `insert into quote_items (work_item_id, name, quantity, unit_price, option_tier, sort_order)
         values ${tup.join(', ')}`,
        vals,
      )
    }

    const opts = await query<{ tier: string; total: number }>(
      'select tier, total from quote_options where work_item_id = $1 order by sort_order',
      [w.id],
    )
    expect(opts).toHaveLength(3)
    expect(Number(opts[0].total)).toBeLessThan(Number(opts[1].total))
    expect(Number(opts[1].total)).toBeLessThan(Number(opts[2].total))

    const perTier = await query<{ option_tier: string; n: number }>(
      `select option_tier, count(*)::int as n from quote_items
        where work_item_id = $1 and option_tier is not null group by 1`,
      [w.id],
    )
    expect(perTier).toHaveLength(3)
  })

  it('rejects a tier outside good/better/best', async () => {
    const w = await createWorkItem(co.id, customerId)
    await expect(
      query(
        `insert into quote_options (work_item_id, tier, name, total) values ($1, 'platinum', 'x', 1)`,
        [w.id],
      ),
    ).rejects.toThrow()
  })

  it('removes options and items when the quote goes', async () => {
    const w = await createWorkItem(co.id, customerId)
    await query(
      `insert into quote_options (work_item_id, tier, name, total) values ($1, 'good', 'Essential', 100)`,
      [w.id],
    )
    await query(
      `insert into quote_items (work_item_id, name, quantity, unit_price) values ($1, 'x', 1, 10)`,
      [w.id],
    )

    await query('delete from work_items where id = $1 and company_id = $2', [w.id, co.id])

    const left = await query<{ n: number }>(
      `select (select count(*) from quote_items where work_item_id = $1)
            + (select count(*) from quote_options where work_item_id = $1) as n`,
      [w.id],
    )
    expect(Number(left[0].n)).toBe(0)
  })
})

describe('scheduling', () => {
  it('a scheduled job carries a date, or the calendar cannot show it', async () => {
    const w = await createWorkItem(co.id, customerId, 'quote_accepted')
    const when = new Date(Date.now() + 86_400_000).toISOString()

    await query(
      `update work_items set status = 'job_scheduled'::work_item_status, scheduled_start = $1
        where id = $2 and company_id = $3`,
      [when, w.id, co.id],
    )

    const onCalendar = await query(
      `select id from work_items
        where company_id = $1 and scheduled_start is not null
          and scheduled_start >= now() and scheduled_start < now() + interval '7 days'
          and id = $2`,
      [co.id, w.id],
    )
    expect(onCalendar).toHaveLength(1)
  })
})
