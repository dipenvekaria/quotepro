import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import {
  asUser,
  createCompany,
  createUser,
  setMembership,
  type TestCompany,
} from './fixtures'
import { requireDatabase } from './setup'

/**
 * Invitation acceptance.
 *
 * These exist because of a production incident on 2026-08-15: an owner opened an
 * invitation they had sent — the obvious way to check the link works — and was
 * demoted to technician, leaving their company with no owner and no way to
 * repair itself.
 *
 * The flow predated this test suite and had never been exercised, which is the
 * actual lesson. Anything that can change who someone is belongs here.
 */

let co: TestCompany
let secondCo: TestCompany

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Invite Co')
  secondCo = await createCompany('Other Co')
})

afterAll(async () => {
  await co.cleanup()
  await secondCo.cleanup()
})

async function invite(companyId: string, email: string, role = 'technician') {
  const rows = await query<{ token: string }>(
    `insert into invitations (company_id, email, role, token)
     values ($1, $2, $3::user_role, $4) returning token`,
    [companyId, email, role, `tok-${crypto.randomUUID()}`],
  )
  return rows[0].token
}

async function roleOf(userId: string) {
  const rows = await query<{ role: string; company_id: string | null }>(
    'select role, company_id from public.users where id = $1',
    [userId],
  )
  return rows[0]
}

describe('accept_invitation', () => {
  it('does not demote an owner who opens an invitation addressed to themselves', async () => {
    const token = await invite(co.id, co.owner.email, 'technician')

    await asUser(co.owner.id, async () => {
      // Whether it throws or no-ops is an implementation choice; the role is not.
      await query('select accept_invitation($1)', [token]).catch(() => null)
    })

    const after = await roleOf(co.owner.id)
    expect(after.role).toBe('owner')
    expect(after.company_id).toBe(co.id)
  })

  it('refuses an invitation addressed to someone else', async () => {
    const outsider = await createUser(`outsider-${crypto.randomUUID().slice(0, 8)}@test.local`)
    const token = await invite(co.id, 'not-them@test.local', 'office')

    await asUser(outsider.id, async () => {
      await expect(query('select accept_invitation($1)', [token])).rejects.toThrow()
    })

    const after = await roleOf(outsider.id)
    expect(after.company_id).toBeNull()
    await query('delete from auth.users where id = $1', [outsider.id])
  })

  it('lets the invited person join when they belong to no company', async () => {
    const joiner = await createUser(`joiner-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(joiner.id, null, 'technician')
    const token = await invite(co.id, joiner.email, 'technician')

    await asUser(joiner.id, async () => {
      await query('select accept_invitation($1)', [token])
    })

    const after = await roleOf(joiner.id)
    expect(after.company_id).toBe(co.id)
    expect(after.role).toBe('technician')

    await query('delete from auth.users where id = $1', [joiner.id])
  })

  it('will not move someone out of a company they already belong to', async () => {
    const token = await invite(co.id, secondCo.owner.email, 'office')

    await asUser(secondCo.owner.id, async () => {
      await expect(query('select accept_invitation($1)', [token])).rejects.toThrow()
    })

    const after = await roleOf(secondCo.owner.id)
    expect(after.company_id).toBe(secondCo.id)
    expect(after.role).toBe('owner')
  })

  it('refuses an expired invitation', async () => {
    const joiner = await createUser(`late-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(joiner.id, null, 'technician')
    const rows = await query<{ token: string }>(
      `insert into invitations (company_id, email, role, token, expires_at)
       values ($1, $2, 'technician', $3, now() - interval '1 day') returning token`,
      [co.id, joiner.email, `tok-${crypto.randomUUID()}`],
    )

    await asUser(joiner.id, async () => {
      await expect(query('select accept_invitation($1)', [rows[0].token])).rejects.toThrow()
    })

    expect((await roleOf(joiner.id)).company_id).toBeNull()
    await query('delete from auth.users where id = $1', [joiner.id])
  })

  it('refuses an invitation that was already accepted', async () => {
    const first = await createUser(`first-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(first.id, null, 'technician')
    const token = await invite(co.id, first.email, 'technician')

    await asUser(first.id, async () => {
      await query('select accept_invitation($1)', [token])
    })
    // A second use of a spent token must not work, even by the same person.
    await asUser(first.id, async () => {
      await expect(query('select accept_invitation($1)', [token])).rejects.toThrow()
    })

    await query('delete from auth.users where id = $1', [first.id])
  })
})

describe('a company always keeps an owner', () => {
  it('refuses to demote the only owner', async () => {
    await expect(
      query(`update public.users set role = 'technician' where id = $1`, [co.owner.id]),
    ).rejects.toThrow()

    expect((await roleOf(co.owner.id)).role).toBe('owner')
  })

  it('allows demotion once someone else is an owner', async () => {
    const second = await createUser(`co-owner-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(second.id, co.id, 'owner')

    await query(`update public.users set role = 'office' where id = $1`, [second.id])
    expect((await roleOf(second.id)).role).toBe('office')

    await query('delete from auth.users where id = $1', [second.id])
  })
})
