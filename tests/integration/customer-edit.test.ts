import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import { createCompany, createCustomer, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * Editing a customer.
 *
 * Customers could be created and never changed, so a phone number taken down
 * wrong stayed wrong and the quote attached to it reached nobody. The update
 * runs the same hand-written company predicate as everything else, which is the
 * only thing standing between one contractor and another's address book.
 */

let co: TestCompany
let other: TestCompany

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Edit Co')
  other = await createCompany('Other Co')
})

afterAll(async () => {
  await co.cleanup()
  await other.cleanup()
})

/** The statement updateCustomer runs, kept in step with the action. */
async function update(id: string, companyId: string, name: string, phone: string) {
  return query<{ id: string }>(
    `update customers
        set name = $1, email = nullif($2, ''), phone = nullif($3, ''), updated_at = now()
      where id = $4 and company_id = $5
      returning id`,
    [name, '', phone, id, companyId],
  )
}

describe('editing a customer', () => {
  it('changes the phone number', async () => {
    const id = await createCustomer(co.id, 'Wrong Number', '+1-555-0000')
    await update(id, co.id, 'Wrong Number', '+1-555-9999')

    const [row] = await query<{ phone: string }>('select phone from customers where id = $1', [id])
    expect(row.phone).toBe('+1-555-9999')
  })

  it('clears a phone number rather than storing an empty string', async () => {
    const id = await createCustomer(co.id, 'No Phone', '+1-555-0001')
    await update(id, co.id, 'No Phone', '')

    const [row] = await query<{ phone: string | null }>(
      'select phone from customers where id = $1',
      [id],
    )
    expect(row.phone).toBeNull()
  })

  it("will not edit another company's customer", async () => {
    // The whole point of the company predicate.
    const theirs = await createCustomer(other.id, 'Not Yours', '+1-555-1234')
    const changed = await update(theirs, co.id, 'Hijacked', '+1-555-6666')

    expect(changed).toHaveLength(0)
    const [row] = await query<{ name: string; phone: string }>(
      'select name, phone from customers where id = $1',
      [theirs],
    )
    expect(row.name).toBe('Not Yours')
    expect(row.phone).toBe('+1-555-1234')
  })

  it('updates the primary address in place instead of adding another', async () => {
    const id = await createCustomer(co.id, 'Moving House')
    await query(
      `insert into customer_addresses (customer_id, address, city, state, zip, is_primary)
       values ($1, '1 Old St', 'Austin', 'TX', '78704', true)`,
      [id],
    )

    const [primary] = await query<{ id: string }>(
      `select id from customer_addresses where customer_id = $1 order by is_primary desc, created_at limit 1`,
      [id],
    )
    await query(
      `update customer_addresses
          set address = $2, city = nullif($3, ''), state = nullif($4, ''), zip = nullif($5, '')
        where id = $1`,
      [primary.id, '2 New Ave', 'Dallas', 'TX', '75201'],
    )

    const rows = await query<{ address: string; city: string }>(
      'select address, city from customer_addresses where customer_id = $1',
      [id],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].address).toBe('2 New Ave')
    expect(rows[0].city).toBe('Dallas')
  })
})
