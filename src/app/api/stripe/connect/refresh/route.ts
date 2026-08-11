import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { sbServer } from '@/lib/supabase/untyped'

export const dynamic = 'force-dynamic'

/**
 * Called after the tenant returns from Stripe onboarding. Refreshes the
 * cached charges_enabled / details_submitted flags on the company row so
 * the Settings page reflects the correct state.
 */
export async function GET() {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ ok: false })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' })

  const admin = await sbServer()
  const { data: profile } = await admin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ ok: false })

  const { data: company } = await admin
    .from('companies')
    .select('stripe_account_id, stripe_onboarded_at')
    .eq('id', profile.company_id)
    .maybeSingle()
  if (!company?.stripe_account_id) return NextResponse.json({ ok: false })

  const account = await stripe.accounts.retrieve(company.stripe_account_id)

  await admin
    .from('companies')
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_onboarded_at:
        account.charges_enabled && !company.stripe_onboarded_at
          ? new Date().toISOString()
          : company.stripe_onboarded_at,
    })
    .eq('id', profile.company_id)

  return NextResponse.json({
    ok: true,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
  })
}
