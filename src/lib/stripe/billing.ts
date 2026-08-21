import Stripe from 'stripe'

import { query } from '@/lib/db'
import { env } from '@/lib/env'
import { getStripe } from './client'

/**
 * Rivet's own subscriptions — distinct from Connect, which moves the
 * contractor's money. This moves ours.
 *
 * Prices are found by lookup_key and created on first use, so a fresh Stripe
 * account needs no dashboard setup and test/live modes each self-provision.
 * Card collected up front; nobody is charged until day 14, and Stripe sends
 * the trial-ending reminder itself.
 */

export const PLANS = {
  solo: { lookup: 'rivet_solo_monthly', amount: 3900, name: 'Rivet Solo' },
  team: { lookup: 'rivet_team_monthly', amount: 9900, name: 'Rivet Team' },
} as const

export type PlanId = keyof typeof PLANS

const TRIAL_DAYS = 14

async function ensurePrice(stripe: Stripe, plan: PlanId): Promise<string> {
  const { lookup, amount, name } = PLANS[plan]
  const found = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 })
  if (found.data[0]) return found.data[0].id

  const price = await stripe.prices.create({
    lookup_key: lookup,
    currency: 'usd',
    unit_amount: amount,
    recurring: { interval: 'month' },
    product_data: { name },
  })
  return price.id
}

async function ensureCustomer(
  stripe: Stripe,
  company: { id: string; name: string; email: string | null; stripe_customer_id: string | null },
): Promise<string> {
  if (company.stripe_customer_id) return company.stripe_customer_id
  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email ?? undefined,
    metadata: { rivet_company_id: company.id },
  })
  await query(`update companies set stripe_customer_id = $2 where id = $1`, [
    company.id,
    customer.id,
  ])
  return customer.id
}

export async function createSubscriptionCheckout(input: {
  companyId: string
  plan: PlanId
}): Promise<{ url: string }> {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured')

  const [company] = await query<{
    id: string
    name: string
    email: string | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
  }>(
    `select id, name, email, stripe_customer_id, stripe_subscription_id
       from companies where id = $1 limit 1`,
    [input.companyId],
  )
  if (!company) throw new Error('Company not found')
  if (company.stripe_subscription_id) throw new Error('This company already has a subscription')

  const customerId = await ensureCustomer(stripe, company)
  const priceId = await ensurePrice(stripe, input.plan)
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Card up front; the charge waits out the trial. Stripe emails the
    // trial-ending reminder and handles the day-14 conversion.
    payment_method_collection: 'always',
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { rivet_company_id: input.companyId, rivet_plan: input.plan },
    },
    metadata: { rivet_company_id: input.companyId, rivet_plan: input.plan },
    success_url: `${base}/app/settings?billing=started`,
    cancel_url: `${base}/app/settings?billing=cancelled`,
  })
  if (!session.url) throw new Error('Stripe returned no checkout URL')
  return { url: session.url }
}

/** The Stripe-hosted portal: cancel, switch plan, update card, invoices. */
export async function createPortalSession(companyId: string): Promise<{ url: string }> {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured')
  const [company] = await query<{ stripe_customer_id: string | null }>(
    `select stripe_customer_id from companies where id = $1 limit 1`,
    [companyId],
  )
  if (!company?.stripe_customer_id) throw new Error('No billing account yet')
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${base}/app/settings`,
  })
  return { url: session.url }
}

/** Webhook-side sync: one subscription object → the company's billing row. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const companyId = sub.metadata?.rivet_company_id
  if (!companyId) return
  const plan = sub.metadata?.rivet_plan === 'solo' ? 'solo' : 'team'
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
  // A terminated subscription leaves the status behind (which drives the
  // read-only lock) but drops the id, so the company can start a fresh
  // checkout instead of hitting "already has a subscription".
  const terminal = sub.status === 'canceled' || sub.status === 'incomplete_expired'
  const subId = terminal ? null : sub.id

  await query(
    `update companies
        set stripe_subscription_id = $2,
            subscription_status = $3,
            plan = $4,
            trial_ends_at = $5
      where id = $1`,
    [companyId, subId, sub.status, plan, trialEnd],
  )
}
