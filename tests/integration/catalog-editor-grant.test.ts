import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { canEditCatalog } from '@/lib/auth/scope'
import { query } from '@/lib/db'
import type { UserRole } from '@/lib/permissions'

import { createCompany, createUser, setMembership, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * Who may change the price book.
 *
 * The price book is the margin, so the default is closed — but a salesperson
 * who just quoted something the catalog does not carry is the person who knows
 * it belongs there, and making them ask every time is how a price book stays
 * wrong. The resolution is a grant the owner controls per person.
 *
 * The important properties are that the default is closed, that an owner cannot
 * be locked out, and that a grant can be taken back.
 */

let co: TestCompany
let owner: { id: string }
let sales: { id: string }

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Catalog Grant Co')
  const uniq = () => crypto.randomUUID().slice(0, 8)
  owner = await createUser(`owner-${uniq()}@test.local`)
  sales = await createUser(`sales-${uniq()}@test.local`)
  await setMembership(owner.id, co.id, 'owner')
  await setMembership(sales.id, co.id, 'sales')
})

afterAll(async () => {
  if (co?.id) await query('delete from companies where id = $1', [co.id])
})

const grantOf = async (userId: string) =>
  (
    await query<{ can_edit_catalog: boolean }>(
      'select can_edit_catalog from users where id = $1',
      [userId],
    )
  )[0]?.can_edit_catalog

describe('the default is closed', () => {
  it('a new teammate cannot edit the price book', async () => {
    expect(await grantOf(sales.id)).toBe(false)
    expect(canEditCatalog('sales', false)).toBe(false)
  })

  it.each<UserRole>(['sales', 'technician', 'office'])('%s needs an explicit grant', (role) => {
    expect(canEditCatalog(role, false)).toBe(false)
    expect(canEditCatalog(role, true)).toBe(true)
  })
})

describe('an owner cannot be locked out', () => {
  it('edits regardless of the flag', () => {
    // A revocable owner would be a way to lock a company out of its own pricing.
    expect(canEditCatalog('owner', false)).toBe(true)
    expect(canEditCatalog('owner', true)).toBe(true)
  })

  it('the update statement refuses to write the flag for an owner', async () => {
    const rows = await query<{ id: string }>(
      `update users set can_edit_catalog = true
        where id = $1 and company_id = $2 and role <> 'owner'
        returning id`,
      [owner.id, co.id],
    )
    expect(rows).toHaveLength(0)
    expect(await grantOf(owner.id)).toBe(false)
  })
})

describe('a grant can be given and taken back', () => {
  it('round-trips', async () => {
    // Withdrawing matters as much as granting: somebody who left, or whose
    // pricing judgement turned out optimistic, has to be closable without
    // changing their role and removing everything else they do.
    for (const value of [true, false]) {
      const rows = await query<{ id: string }>(
        `update users set can_edit_catalog = $1
          where id = $2 and company_id = $3 and role <> 'owner'
          returning id`,
        [value, sales.id, co.id],
      )
      expect(rows).toHaveLength(1)
      expect(await grantOf(sales.id)).toBe(value)
    }
  })

  it('cannot reach another company’s user', async () => {
    const other = await createCompany('Bystander Grant Co')
    const outsider = await createUser(`out-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(outsider.id, other.id, 'sales')

    const rows = await query<{ id: string }>(
      `update users set can_edit_catalog = true
        where id = $1 and company_id = $2 and role <> 'owner'
        returning id`,
      [outsider.id, co.id],
    )
    expect(rows).toHaveLength(0)
    expect(await grantOf(outsider.id)).toBe(false)

    await query('delete from companies where id = $1', [other.id])
  })
})
