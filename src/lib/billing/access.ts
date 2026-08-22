import { query } from '@/lib/db'

/**
 * Owner decision 2026-08-20: a lapsed subscription makes the account
 * read-only. Everything stays visible; mutations on the money path return
 * this error; Settings → Billing stays writable so the card can be fixed.
 * Companies with no subscription state at all (pre-billing, trialing) are
 * writable — enforcement begins when Stripe says the money stopped.
 */

const LAPSED = new Set(['canceled', 'past_due', 'unpaid', 'incomplete_expired'])

export const READ_ONLY_ERROR =
  'Your subscription has ended, so the account is read-only. Renew it in Settings → Billing to keep working.'

export async function companyWritable(companyId: string): Promise<boolean> {
  const [row] = await query<{ subscription_status: string | null; complimentary: boolean }>(
    'select subscription_status, complimentary from companies where id = $1 limit 1',
    [companyId],
  )
  // Complimentary access (granted from Field Genie) trumps any billing state.
  if (row?.complimentary) return true
  return !LAPSED.has(row?.subscription_status ?? '')
}

/** For actions: `const ro = await readOnlyGuard(companyId); if (ro) return ro` */
export async function readOnlyGuard(
  companyId: string,
): Promise<{ ok: false; error: string } | null> {
  return (await companyWritable(companyId)) ? null : { ok: false, error: READ_ONLY_ERROR }
}
