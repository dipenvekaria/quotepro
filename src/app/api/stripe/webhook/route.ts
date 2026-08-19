import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { syncSubscription } from '@/lib/stripe/billing'
import { getStripe, getWebhookSecret } from '@/lib/stripe/client'
import { sbAdmin } from '@/lib/supabase/untyped'

export const dynamic = 'force-dynamic'

/**
 * Stripe webhook handler. Handles two flows:
 * 1. checkout.session.completed / payment_intent.succeeded — a customer paid
 *    an invoice via our /i/[token] hosted checkout. Insert a payments row +
 *    mark the invoice paid.
 * 2. account.updated — a connected company's onboarding status changed.
 *    Refresh the cached flags on companies row.
 *
 * NOTE: STRIPE_WEBHOOK_SECRET must be set; use `stripe listen` in dev.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = getWebhookSecret()
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Signature verification failed: ${msg}` }, { status: 400 })
  }

  const admin = sbAdmin()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'payment' || session.payment_status !== 'paid') break
      await handleInvoicePaid(admin, session)
      break
    }
    // Rivet's own subscriptions. One handler for the whole lifecycle:
    // created (trialing), trial→active, plan switches, cancel-at-period-end
    // (status stays active until the period closes), and final cancellation.
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    }
    case 'payment_intent.succeeded': {
      // Belt-and-suspenders: if the session event didn't fire but PI did,
      // still credit the invoice. Idempotency guaranteed by session id.
      const pi = event.data.object as Stripe.PaymentIntent
      const invoiceId = pi.metadata?.invoice_id
      if (!invoiceId) break
      await creditPaymentByInvoiceId(admin, {
        invoiceId,
        amount: (pi.amount_received ?? pi.amount) / 100,
        method: methodFromPaymentMethod(pi.payment_method_types),
        reference: pi.id,
      })
      break
    }
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      await admin
        .from('companies')
        .update({
          stripe_charges_enabled: account.charges_enabled,
          stripe_details_submitted: account.details_submitted,
        })
        .eq('stripe_account_id', account.id)
      break
    }
    default:
      // Ignore all other events.
      break
  }

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaid(admin: any, session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id
  if (!invoiceId) return

  const amount = (session.amount_total ?? 0) / 100
  const method = methodFromPaymentMethod(session.payment_method_types ?? undefined)

  await creditPaymentByInvoiceId(admin, {
    invoiceId,
    amount,
    method,
    reference: session.id,
  })
}

async function creditPaymentByInvoiceId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  input: {
    invoiceId: string
    amount: number
    method: 'card' | 'bank_transfer' | 'stripe'
    reference: string
  },
) {
  // Idempotency: if we already recorded a payment for this session id, skip.
  const { data: existing } = await admin
    .from('payments')
    .select('id')
    .eq('reference_number', input.reference)
    .maybeSingle()
  if (existing) return

  const { data: inv } = await admin
    .from('invoices')
    .select('id, total, amount_paid, work_item_id')
    .eq('id', input.invoiceId)
    .maybeSingle()
  if (!inv) return

  await admin.from('payments').insert({
    invoice_id: inv.id,
    amount: input.amount,
    method: input.method,
    reference_number: input.reference,
    notes: 'Stripe hosted checkout',
  })

  const newPaid = Number(inv.amount_paid ?? 0) + input.amount
  const total = Number(inv.total)
  const newStatus: 'paid' | 'partial' = newPaid >= total ? 'paid' : 'partial'

  const patch: Record<string, unknown> = {
    amount_paid: newPaid,
    status: newStatus,
  }
  if (newStatus === 'paid') patch.paid_at = new Date().toISOString()

  await admin.from('invoices').update(patch).eq('id', inv.id)
}

function methodFromPaymentMethod(
  types: string[] | undefined,
): 'card' | 'bank_transfer' | 'stripe' {
  if (!types) return 'stripe'
  if (types.includes('us_bank_account')) return 'bank_transfer'
  if (types.includes('card')) return 'card'
  return 'stripe'
}
