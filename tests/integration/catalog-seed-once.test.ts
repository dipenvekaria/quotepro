import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import { createCompany, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * Onboarding must not stock the same price book twice.
 *
 * `bootstrap_company()` is idempotent and hands an existing company back to a
 * caller who already has one, but the seed that ran after it was not, and
 * `catalog_items` has no uniqueness to fall back on. A second submit — a back
 * button, a reload, a stale tab, all of which still render a working form —
 * inserted the whole starter catalog again. A production account showed 202
 * items across 13 categories where the residential HVAC starter carries 101
 * across the same 13, every item listed twice at the same price.
 *
 * The action now checks for an existing company first. These cover the second
 * line of defence: the insert itself, which declines to seed a company that
 * already has items no matter how it was reached.
 */

let co: TestCompany
let other: TestCompany

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Seed Once Co')
  other = await createCompany('Seed Once Other Co')
})

afterAll(async () => {
  for (const c of [co, other]) {
    if (c?.id) await query('delete from companies where id = $1', [c.id])
  }
})

/** The shape the onboarding seed uses, reduced to two rows. */
async function seed(companyId: string) {
  await query(
    `insert into catalog_items
       (company_id, name, description, category, base_price, unit)
     select v.* from (values
       ($1::uuid, $2::text, $3::text, $4::text, $5::numeric, $6::text),
       ($7, $8, $9, $10, $11, $12)
     ) as v (company_id, name, description, category, base_price, unit)
     where not exists (select 1 from catalog_items c where c.company_id = $1)`,
    [
      companyId, 'Defrost Control Board Replacement', 'Replace outdoor board', 'Controls', 441.25, 'each',
      companyId, 'Fan Control Board Replacement', 'Replace furnace board', 'Controls', 420.25, 'each',
    ],
  )
}

const countFor = async (companyId: string) => {
  const [row] = await query<{ n: string }>(
    'select count(*)::text as n from catalog_items where company_id = $1',
    [companyId],
  )
  return Number(row.n)
}

describe('starter catalog seeding', () => {
  it('stocks an empty company', async () => {
    await seed(co.id)
    expect(await countFor(co.id)).toBe(2)
  })

  it('declines to seed a company that already has items', async () => {
    await seed(co.id)
    await seed(co.id)
    // 2, not 6. This is the assertion the production bug would have failed.
    expect(await countFor(co.id)).toBe(2)
  })

  it('is scoped per company — a stocked tenant does not block a new one', async () => {
    // `not exists` without the company_id predicate would silently stop every
    // subsequent signup from getting a catalog at all, which is a worse bug
    // than the one being fixed.
    await seed(other.id)
    expect(await countFor(other.id)).toBe(2)
  })
})
