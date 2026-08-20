import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { refreshStripeAccountFlags } from '@/lib/stripe/connect-status'

export const dynamic = 'force-dynamic'

/** Syncs the cached Stripe flags for the caller's company, then reports them. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated' })

  await refreshStripeAccountFlags(session.companyId)

  const [company] = await query<{
    stripe_charges_enabled: boolean | null
    stripe_details_submitted: boolean | null
  }>('select stripe_charges_enabled, stripe_details_submitted from companies where id = $1 limit 1', [
    session.companyId,
  ])

  return NextResponse.json({
    ok: true,
    charges_enabled: company?.stripe_charges_enabled ?? false,
    details_submitted: company?.stripe_details_submitted ?? false,
  })
}
