'use server'

import { getSession } from '@/lib/auth/session'
import { createPortalSession, createSubscriptionCheckout, type PlanId } from '@/lib/stripe/billing'

export async function startSubscription(plan: PlanId) {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins manage billing' }
  }
  try {
    const { url } = await createSubscriptionCheckout({
      companyId: session.companyId,
      plan: plan === 'solo' ? 'solo' : 'team',
    })
    return { ok: true as const, data: { url } }
  } catch (e) {
    console.error('startSubscription failed', e)
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not start checkout' }
  }
}

export async function openBillingPortal() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins manage billing' }
  }
  try {
    const { url } = await createPortalSession(session.companyId)
    return { ok: true as const, data: { url } }
  } catch (e) {
    console.error('openBillingPortal failed', e)
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not open billing' }
  }
}
