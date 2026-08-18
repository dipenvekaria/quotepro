import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query, pool } from '@/lib/db'
import { nextOccurrence, runRecurringSpawns } from '@/lib/recurring'

/**
 * The recurring engine against the real database: spawn happens exactly once
 * per due date, copies the visit whole, and the auto-invoice arrives already
 * sent. The cadence math is checked around the traps — DST and short months.
 */

const COMPANY = '99999999-8888-7777-6666-555555555555'
const OTHER_COMPANY = '99999999-8888-7777-6666-555555555556'
let templateId = ''
let customerId = ''

beforeAll(async () => {
  await cleanup()
  await query(`insert into companies (id, name, settings) values ($1, 'Recurring Test Co', '{"timezone":"America/Chicago"}')`, [COMPANY])
  await query(`insert into companies (id, name) values ($1, 'Other Co')`, [OTHER_COMPANY])
  const [c] = await query<{ id: string }>(
    `insert into customers (company_id, name, email) values ($1, 'Repeat Customer', 'delivered@resend.dev') returning id`,
    [COMPANY],
  )
  customerId = c.id
  const [w] = await query<{ id: string }>(
    `insert into work_items
       (company_id, customer_id, status, kind, job_name, description, subtotal, tax_rate, tax_amount, total, estimated_hours, recurrence)
     values ($1, $2, 'job_completed'::work_item_status, 'job', 'Weekly clean', 'Standard weekly clean',
             100, 8.5, 8.5, 108.5, 2,
             jsonb_build_object('cadence','weekly','auto_invoice',true,'next_at', (now() - interval '1 hour')::text))
     returning id`,
    [COMPANY, customerId],
  )
  templateId = w.id
  await query(
    `insert into quote_items (work_item_id, name, quantity, unit_price, labor_hours, unit, sort_order)
     values ($1, 'Standard Clean', 1, 100, 2, 'visit', 0)`,
    [templateId],
  )
})

async function cleanup() {
  await query(`delete from activity_log where company_id in ($1, $2)`, [COMPANY, OTHER_COMPANY])
  await query(`delete from invoices where company_id in ($1, $2)`, [COMPANY, OTHER_COMPANY])
  await query(
    `delete from quote_items where work_item_id in (select id from work_items where company_id in ($1, $2))`,
    [COMPANY, OTHER_COMPANY],
  )
  await query(`delete from work_items where company_id in ($1, $2)`, [COMPANY, OTHER_COMPANY])
  await query(`delete from customers where company_id in ($1, $2)`, [COMPANY, OTHER_COMPANY])
  await query(`delete from companies where id in ($1, $2)`, [COMPANY, OTHER_COMPANY])
}

afterAll(async () => {
  await cleanup()
  await pool.end()
})

describe('nextOccurrence', () => {
  const tz = 'America/Chicago'

  it('weekly adds exactly seven days', () => {
    const from = new Date('2026-06-01T14:00:00Z')
    expect(nextOccurrence(from, 'weekly', tz).toISOString()).toBe('2026-06-08T14:00:00.000Z')
  })

  it('monthly keeps the wall clock across a DST switch', () => {
    // Oct 15 9:00 Chicago (CDT, UTC-5) → Nov 15 9:00 Chicago (CST, UTC-6)
    const from = new Date('2026-10-15T14:00:00Z')
    const next = nextOccurrence(from, 'monthly', tz)
    expect(next.toISOString()).toBe('2026-11-15T15:00:00.000Z')
  })

  it('monthly clamps a day-31 anniversary to shorter months', () => {
    const from = new Date('2027-01-31T15:00:00Z') // Jan 31, 9:00 Chicago
    const next = nextOccurrence(from, 'monthly', tz)
    expect(next.toISOString().slice(0, 10)).toBe('2027-02-28')
  })
})

describe('runRecurringSpawns', () => {
  it('spawns the due visit with items, invoice, and an advanced pointer', async () => {
    const results = await runRecurringSpawns()
    const mine = results.filter((r) => r.template_id === templateId)
    expect(mine).toHaveLength(1)

    const [visit] = await query<{
      id: string
      status: string
      total: number
      estimated_hours: number
      metadata: { recurred_from?: string }
      recurrence: unknown
    }>(
      `select id, status, total, estimated_hours, metadata, recurrence
         from work_items where company_id = $1 and id <> $2`,
      [COMPANY, templateId],
    )
    expect(visit.status).toBe('job_scheduled')
    expect(Number(visit.total)).toBe(108.5)
    expect(Number(visit.estimated_hours)).toBe(2)
    expect(visit.metadata.recurred_from).toBe(templateId)
    // Spawned visits never recur themselves.
    expect(visit.recurrence).toBeNull()

    const items = await query<{ name: string; unit: string }>(
      `select name, unit from quote_items where work_item_id = $1`,
      [visit.id],
    )
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Standard Clean')
    expect(items[0].unit).toBe('visit')

    const [inv] = await query<{ status: string; total: number }>(
      `select status, total from invoices where work_item_id = $1 and company_id = $2`,
      [visit.id, COMPANY],
    )
    expect(inv.status).toBe('sent')
    expect(Number(inv.total)).toBe(108.5)

    const [tpl] = await query<{ next_at: string }>(
      `select recurrence->>'next_at' as next_at from work_items where id = $1`,
      [templateId],
    )
    expect(new Date(tpl.next_at).getTime()).toBeGreaterThan(Date.now())
  })

  it('a second run spawns nothing — the pointer moved', async () => {
    const results = await runRecurringSpawns()
    expect(results.filter((r) => r.template_id === templateId)).toHaveLength(0)
    const rows = await query<{ n: number }>(
      `select count(*)::int as n from work_items where company_id = $1`,
      [COMPANY],
    )
    expect(rows[0].n).toBe(2)
  })

  it('never touches another company', async () => {
    const rows = await query<{ n: number }>(
      `select count(*)::int as n from work_items where company_id = $1`,
      [OTHER_COMPANY],
    )
    expect(rows[0].n).toBe(0)
  })
})
