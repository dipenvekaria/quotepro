import { beforeAll, describe, expect, it } from 'vitest'

import { query, withTransaction } from '@/lib/db'

import { requireDatabase } from './setup'

/**
 * Every view in `public` is published by PostgREST the moment a Supabase role
 * holds a grant on it — no application code involved. A view without
 * `security_invoker` executes as its owner (postgres, which bypasses RLS), so
 * "authenticated can SELECT this view" means "any trial signup can read every
 * tenant's rows through the REST API". That exact combination shipped in
 * 20260818000000 and exposed quotes, customers, revenue and public quote
 * tokens across tenants.
 *
 * The invariant, for every view, present and future:
 *   - security_invoker is on, so RLS applies as the querying role, AND
 *   - anon/authenticated hold no privileges on it, so the surface is closed.
 * Plus the behavioural check that subsumes both: querying any view as
 * `authenticated` with a JWT belonging to no company yields nothing.
 */

let views: string[] = []

beforeAll(async () => {
  await requireDatabase()
  const rows = await query<{ table_name: string }>(
    `select table_name from information_schema.views where table_schema = 'public' order by 1`,
  )
  views = rows.map((r) => r.table_name)
})

it('there are views to guard (the scan is not vacuously green)', () => {
  expect(views.length).toBeGreaterThan(0)
})

describe('every public view', () => {
  it('runs as the querying role, not as its owner', async () => {
    const rows = await query<{ relname: string; reloptions: string[] | null }>(
      `select c.relname, c.reloptions
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v'`,
    )
    const missing = rows
      .filter((r) => !(r.reloptions ?? []).some((o) => /^security_invoker=(on|true)$/.test(o)))
      .map((r) => r.relname)
    expect(missing, 'views without security_invoker').toEqual([])
  })

  it('grants nothing to anon or authenticated', async () => {
    const rows = await query<{ table_name: string; grantee: string; privilege_type: string }>(
      `select table_name, grantee, privilege_type
         from information_schema.role_table_grants
        where table_schema = 'public'
          and grantee in ('anon', 'authenticated')
          and table_name = any($1)`,
      [views],
    )
    expect(
      rows.map((r) => `${r.table_name}: ${r.grantee} ${r.privilege_type}`),
      'grants that reopen the REST surface',
    ).toEqual([])
  })

  it('yields nothing to a signed-in stranger', async () => {
    // A valid JWT whose subject belongs to no company — what every fresh
    // signup holds before onboarding, and what an attacker can mint by
    // signing up.
    const claims = JSON.stringify({
      sub: '00000000-0000-0000-0000-0000000000ff',
      role: 'authenticated',
    })

    for (const view of views) {
      // Identifiers cannot be parameterized; these names come from
      // information_schema, not from input, and are shape-checked anyway.
      expect(view).toMatch(/^[a-z_][a-z0-9_]*$/)

      // One transaction per view: a permission-denied error aborts the
      // transaction it happens in, and permission denied is a PASS here.
      const outcome = await withTransaction(async (q) => {
        await q(`set local role authenticated`)
        await q(`select set_config('request.jwt.claims', $1, true)`, [claims])
        const rows = await q<{ n: number }>(`select count(*)::int as n from public."${view}"`)
        return { readable: true as const, rows: rows[0]?.n ?? 0 }
      }).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        if (/permission denied/i.test(msg)) return { readable: false as const, rows: 0 }
        throw e
      })

      if (outcome.readable) {
        expect(outcome.rows, `${view} returned rows to a company-less user`).toBe(0)
      }
    }
  })
})
