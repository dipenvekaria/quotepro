import { query } from '@/lib/db'
import { getStripe } from '@/lib/stripe/client'

/**
 * Re-reads the connected account from Stripe and caches its flags on the
 * company row. The return from Express onboarding carries no signal of its
 * own — Stripe just redirects — so whoever renders the status calls this
 * first. Safe no-op when Stripe is unconfigured or no account exists.
 */
export async function refreshStripeAccountFlags(companyId: string): Promise<void> {
  const stripe = getStripe()
  if (!stripe) return

  const [company] = await query<{ stripe_account_id: string | null }>(
    'select stripe_account_id from companies where id = $1 limit 1',
    [companyId],
  )
  if (!company?.stripe_account_id) return

  try {
    const account = await stripe.accounts.retrieve(company.stripe_account_id)
    await query(
      `update companies
          set stripe_charges_enabled = $1,
              stripe_details_submitted = $2,
              stripe_onboarded_at = coalesce(stripe_onboarded_at, case when $1 then now() end)
        where id = $3`,
      [account.charges_enabled, account.details_submitted, companyId],
    )
  } catch (e) {
    // Status stays stale rather than the page failing; the next visit retries.
    console.error('stripe flag refresh failed', e)
  }
}
