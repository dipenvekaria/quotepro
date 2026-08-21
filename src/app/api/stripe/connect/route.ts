import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import {
  getConnectRefreshUrl,
  getConnectReturnUrl,
  getStripe,
} from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

/**
 * Starts (or resumes) Stripe Connect Express onboarding.
 *
 * Reads through pg like the rest of the app. The previous version read
 * `users` through PostgREST and discarded the error, so any API-layer
 * failure surfaced as "No company on this user" — with the row sitting
 * right there in the database.
 */
export async function POST() {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured on this server.' }, { status: 500 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { companyId, role, email } = session

  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners and admins can connect Stripe.' }, { status: 403 })
  }

  const [company] = await query<{
    id: string
    name: string
    email: string | null
    stripe_account_id: string | null
  }>('select id, name, email, stripe_account_id from companies where id = $1 limit 1', [companyId])
  if (!company) return NextResponse.json({ error: 'Company missing' }, { status: 404 })

  let accountId = company.stripe_account_id
  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: company.email ?? email,
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

      await query('update companies set stripe_account_id = $1 where id = $2', [accountId, companyId])
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: getConnectRefreshUrl(),
      return_url: getConnectReturnUrl(),
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url })
  } catch (e) {
    // A Stripe rejection must come back as JSON, not an HTML 500 the client
    // can't parse. Their messages are operator-actionable — pass them through.
    const message = e instanceof Error ? e.message : 'Stripe rejected the request.'
    console.error('stripe connect failed', e)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
