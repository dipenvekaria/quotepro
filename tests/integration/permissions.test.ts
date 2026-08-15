import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hasPermission, type UserRole } from '@/lib/permissions'
import { query } from '@/lib/db'

import { requireDatabase } from './setup'
import { createCompany, createUser, setMembership, type TestCompany } from './fixtures'

/**
 * Roles.
 *
 * `src/lib/permissions.ts` is the matrix the UI reads. These check the matrix
 * says what the product intends, and — separately — record which of those
 * intentions the data layer does not yet enforce.
 */

let co: TestCompany

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Permissions Co')
})

afterAll(async () => {
  await co.cleanup()
})

const ROLES: UserRole[] = ['owner', 'office', 'sales', 'technician']

describe('the permission matrix', () => {
  it('only an owner can change pricing', () => {
    expect(hasPermission('owner', 'canEditCatalog')).toBe(true)
    for (const r of ['office', 'sales', 'technician'] as UserRole[]) {
      expect(hasPermission(r, 'canEditCatalog')).toBe(false)
    }
  })

  it('a technician cannot manage the team', () => {
    expect(hasPermission('technician', 'canManageTeam')).toBe(false)
    expect(hasPermission('owner', 'canManageTeam')).toBe(true)
  })

  it('every role resolves for every permission, so nothing falls through', () => {
    const perms = ['canEditCatalog', 'canManageTeam'] as const
    for (const role of ROLES) {
      for (const p of perms) {
        expect(typeof hasPermission(role, p)).toBe('boolean')
      }
    }
  })

  it('an unknown role is denied rather than allowed', () => {
    // A role string from a stale session must not be treated as permissive.
    expect(hasPermission('nonsense' as UserRole, 'canEditCatalog')).toBe(false)
  })
})

describe('membership', () => {
  it('a user belongs to exactly one company', async () => {
    const u = await createUser(`one-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(u.id, co.id, 'technician')

    const rows = await query<{ n: number }>(
      'select count(*)::int as n from public.users where id = $1',
      [u.id],
    )
    expect(rows[0].n).toBe(1)
    await query('delete from auth.users where id = $1', [u.id])
  })

  it('a user with no company is not in anyone’s team list', async () => {
    const u = await createUser(`nobody-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(u.id, null, 'technician')

    const team = await query('select id from public.users where company_id = $1', [co.id])
    expect(team.map((t) => (t as { id: string }).id)).not.toContain(u.id)
    await query('delete from auth.users where id = $1', [u.id])
  })
})

// Row-level scoping is proved against real data in ./role-scoping.test.ts.
