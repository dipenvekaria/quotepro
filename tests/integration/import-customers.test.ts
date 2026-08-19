import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { query, pool } from '@/lib/db'

/**
 * The switching engine against the real database: a Jobber-shaped export maps
 * deterministically (no AI involved), imports with addresses, dedupes on
 * re-run, and skips nameless rows. Session is mocked to a fixture company —
 * the actions derive everything else themselves.
 */

const COMPANY = '77777777-6666-5555-4444-333333333333'

vi.mock('@/lib/auth/session', () => ({
  getSession: async () => ({ companyId: COMPANY, userId: null, role: 'owner' }),
}))

import { importCustomers, mapCustomerCsv } from '@/app/app/(shell)/import/actions'

const JOBBER_CSV = [
  'First Name,Last Name,Email,Phone,Street,City,State,Zip',
  'Dana,Kowalski,dana@example.com,555-0101,12 Oak St,Frisco,TX,75035',
  'Sam,Rivera,sam@example.com,555-0102,44 Elm Ave,Plano,TX,75024',
  ',,,,No Name Rd,Allen,TX,75002',
  'Lee,Chen,,555-0103,9 Pine Ct,Frisco,TX,75035',
].join('\n')

beforeAll(async () => {
  await cleanup()
  await query(`insert into companies (id, name) values ($1, 'Import Test Co')`, [COMPANY])
})

async function cleanup() {
  await query(
    `delete from customer_addresses where customer_id in (select id from customers where company_id = $1)`,
    [COMPANY],
  )
  await query(`delete from customers where company_id = $1`, [COMPANY])
  await query(`delete from companies where id = $1`, [COMPANY])
}

afterAll(async () => {
  await cleanup()
  await pool.end()
})

describe('the switching import', () => {
  it('maps a Jobber export from headers alone', async () => {
    const res = await mapCustomerCsv({ csv: JOBBER_CSV })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.mappedBy).toBe('headers')
    expect(res.data.mapping).toEqual([
      'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip',
    ])
    expect(res.data.total).toBe(4)
  })

  it('imports rows with addresses and skips the nameless one', async () => {
    const map = await mapCustomerCsv({ csv: JOBBER_CSV })
    if (!map.ok) throw new Error('mapping failed')
    const res = await importCustomers({ csv: JOBBER_CSV, mapping: map.data.mapping })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data).toEqual({ imported: 3, merged: 0, skipped: 1 })

    const [dana] = await query<{ name: string; email: string }>(
      `select name, email from customers where company_id = $1 and email = 'dana@example.com'`,
      [COMPANY],
    )
    expect(dana.name).toBe('Dana Kowalski')

    const [addr] = await query<{ city: string }>(
      `select a.city from customer_addresses a
        join customers c on c.id = a.customer_id
       where c.company_id = $1 and c.email = 'dana@example.com' and a.is_primary`,
      [COMPANY],
    )
    expect(addr.city).toBe('Frisco')
  })

  it('re-running the same file merges instead of duplicating', async () => {
    const map = await mapCustomerCsv({ csv: JOBBER_CSV })
    if (!map.ok) throw new Error('mapping failed')
    const res = await importCustomers({ csv: JOBBER_CSV, mapping: map.data.mapping })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.data.imported).toBe(0)
    expect(res.data.merged).toBe(3)

    const [count] = await query<{ n: number }>(
      `select count(*)::int as n from customers where company_id = $1`,
      [COMPANY],
    )
    expect(count.n).toBe(3)
  })
})
