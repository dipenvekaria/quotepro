/**
 * Lazy Stripe client — returns null when STRIPE_SECRET_KEY isn't set so the
 * app degrades gracefully (manual pay-by-check invoices keep working).
 */

import Stripe from 'stripe'

let _stripe: Stripe | null | undefined

export function getStripe(): Stripe | null {
  if (_stripe !== undefined) return _stripe
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  _stripe = key
    ? new Stripe(key, {
        apiVersion: '2025-06-30.basil' as unknown as Stripe.LatestApiVersion,
        typescript: true,
      })
    : null
  return _stripe
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null
}

export function getConnectRefreshUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/app/integrations?stripe=refresh`
}

export function getConnectReturnUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/app/integrations?stripe=connected`
}
