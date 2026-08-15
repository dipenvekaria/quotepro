'use server'

import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Closing an account.
 *
 * Two different things wear the same words. For an owner, "delete my account"
 * means the business is leaving — the company and every record in it. For
 * anyone else it means only their own login; their employer's data is not
 * theirs to destroy.
 *
 * Closing is immediate and total as far as the product is concerned: the rows
 * leave the live tables, the logins stop working, and public quote links go
 * dead. What survives is one snapshot in `archived_accounts`, kept for ninety
 * days so a mistake or a change of heart is recoverable, then purged.
 *
 * The guard rails are still all in front — the caller is shown what will be
 * removed, warned about money still in motion, and made to type the company
 * name — because getting it back means asking a human, not clicking undo.
 */

// ---------------------------------------------------------------------------

export type DeletionImpact = {
  scope: 'company' | 'self'
  companyName: string
  counts: { customers: number; workItems: number; invoices: number; catalogItems: number }
  /** Invoices with money still owed. The warning that actually stops someone. */
  unpaid: { count: number; total: number }
  /** Stripe is still connected, so a payout may be in flight. */
  stripeConnected: boolean
  /** Other people who lose their login when the company goes. */
  teammates: number
}

/** What deleting would destroy, so the dialog can state it rather than bluff. */
export async function getDeletionImpact(): Promise<
  { ok: true; data: DeletionImpact } | { ok: false; error: string }
> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const scope = session.role === 'owner' ? ('company' as const) : ('self' as const)

  const [row] = await query<{
    name: string
    stripe_account_id: string | null
    customers: number
    work_items: number
    invoices: number
    catalog_items: number
    teammates: number
    unpaid_count: number
    unpaid_total: number
  }>(
    `select c.name,
            c.stripe_account_id,
            (select count(*) from customers     where company_id = c.id)::int as customers,
            (select count(*) from work_items    where company_id = c.id)::int as work_items,
            (select count(*) from invoices      where company_id = c.id)::int as invoices,
            (select count(*) from catalog_items where company_id = c.id)::int as catalog_items,
            (select count(*) from users where company_id = c.id and id <> $2)::int as teammates,
            -- Owed means sent and not settled. A draft was never claimed and a
            -- cancelled invoice was withdrawn, so neither is money in motion.
            (select count(*) from invoices
              where company_id = c.id and status in ('sent', 'partial', 'overdue'))::int as unpaid_count,
            coalesce((select sum(total - coalesce(amount_paid, 0)) from invoices
              where company_id = c.id and status in ('sent', 'partial', 'overdue')), 0) as unpaid_total
       from companies c
      where c.id = $1`,
    [session.companyId, session.userId],
  )
  if (!row) return { ok: false, error: 'Company not found' }

  return {
    ok: true,
    data: {
      scope,
      companyName: row.name,
      counts: {
        customers: row.customers,
        workItems: row.work_items,
        invoices: row.invoices,
        catalogItems: row.catalog_items,
      },
      unpaid: { count: row.unpaid_count, total: Number(row.unpaid_total ?? 0) },
      stripeConnected: Boolean(row.stripe_account_id),
      teammates: row.teammates,
    },
  }
}

// ---------------------------------------------------------------------------

const deleteSchema = z.object({
  /** The company name, typed by hand. Forces the dialog to be read. */
  confirmation: z.string().min(1),
})

export async function deleteAccount(input: unknown) {
  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Type the company name to confirm.' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const [company] = await query<{ id: string; name: string }>(
    'select id, name from companies where id = $1',
    [session.companyId],
  )
  if (!company) return { ok: false as const, error: 'Company not found' }

  // Compared case-insensitively and trimmed: this is a speed bump to force
  // reading, not a spelling test.
  if (parsed.data.confirmation.trim().toLowerCase() !== company.name.trim().toLowerCase()) {
    return { ok: false as const, error: `That does not match "${company.name}".` }
  }

  const admin = createAdminClient()

  // Non-owners delete only themselves. An employee's resignation must not take
  // their employer's business records with it.
  if (session.role !== 'owner') {
    const { error } = await admin.auth.admin.deleteUser(session.userId)
    if (error) {
      console.error('deleteAccount: auth delete failed', error)
      return { ok: false as const, error: 'Could not close your account. Please try again.' }
    }
    // public.users cascades from auth.users, so the app row is gone with it.
    await signOut()
    return { ok: true as const, data: { scope: 'self' as const } }
  }

  // Owner: the whole company. Collect the logins first — deleting the company
  // cascades to public.users, which is where the ids live.
  const members = await query<{ id: string }>('select id from users where company_id = $1', [
    company.id,
  ])

  try {
    // Snapshots every row into archived_accounts, then deletes. Atomic, and in
    // that order: a failure anywhere leaves the company intact rather than
    // half-erased. See the migration for why this is not a deleted_at flag.
    await query('select archive_and_delete_company($1, $2, $3)', [
      company.id,
      session.userId,
      session.email,
    ])
  } catch (e) {
    console.error('deleteAccount: archive failed', e)
    return { ok: false as const, error: 'Could not close the account. Please try again.' }
  }

  // Auth lives outside Postgres' cascade, so the logins go one at a time. A
  // failure here leaves someone able to sign in with no company, which lands
  // them in onboarding — recoverable, and better than deleting the data twice.
  for (const m of members) {
    const { error } = await admin.auth.admin.deleteUser(m.id)
    if (error) console.error('deleteAccount: orphaned auth user', m.id, error)
  }

  await signOut()
  return { ok: true as const, data: { scope: 'company' as const } }
}

async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
