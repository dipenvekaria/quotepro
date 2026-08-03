import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  getConnectRefreshUrl,
  getConnectReturnUrl,
  getStripe,
} from '@/lib/stripe/client'
import { sbServer } from '@/lib/supabase/untyped'

export const dynamic = 'force-dynamic'

/**
 * Starts (or resumes) Stripe Connect Express onboarding.
 * - Creates a Stripe Account for the caller's company if none exists.
 * - Creates an Account Link and redirects the browser to Stripe.
 */
export async function POST() {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured on this server.' },
      { status: 500 },
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = await sbServer()
  const { data: profile } = await admin
    .from('users')
    .select('company_id, role, email')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No company on this user' }, { status: 400 })
  }
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only owners and admins can connect Stripe.' },
      { status: 403 },
    )
  }

  const { data: company } = await admin
    .from('companies')
    .select('id, name, email, stripe_account_id')
    .eq('id', profile.company_id)
    .maybeSingle()
  if (!company) return NextResponse.json({ error: 'Company missing' }, { status: 404 })

  let accountId: string = company.stripe_account_id
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: company.email ?? profile.email,
      business_type: 'company',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        us_bank_account_ach_payments: { requested: true },
      },
      metadata: {
        quotepro_company_id: company.id,
      },
    })
    accountId = account.id

    await admin
      .from('companies')
      .update({ stripe_account_id: accountId })
      .eq('id', company.id)
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: getConnectRefreshUrl(),
    return_url: getConnectReturnUrl(),
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: link.url })
}
