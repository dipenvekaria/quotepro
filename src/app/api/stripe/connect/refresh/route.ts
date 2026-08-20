import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { getStripe } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

/**
 * Called after the tenant returns from Stripe onboarding. Refreshes the
 * cached charges_enabled / details_submitted flags on the company row so
 * Settings reflects the true state. pg, like everything else.
 */
export async function GET() {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ ok: false })

  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated' })

  const [company] = await query<{
    stripe_account_id: string | null
    stripe_onboarded_at: string | null
  }>('select stripe_account_id, stripe_onboarded_at from companies where id = $1 limit 1', [
    session.companyId,
  ])
  if (!company?.stripe_account_id) return NextResponse.json({ ok: false })

  const account = await stripe.accounts.retrieve(company.stripe_account_id)

  await query(
    `update companies
        set stripe_charges_enabled = $1,
            stripe_details_submitted = $2,
            stripe_onboarded_at = coalesce(stripe_onboarded_at, case when $1 then now() end)
      where id = $3`,
    [account.charges_enabled, account.details_submitted, session.companyId],
  )

  return NextResponse.json({
    ok: true,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
  })
}
