import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { withTransaction } from '@/lib/db'
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
    // Loud on purpose: a wrong STRIPE_WEBHOOK_SECRET otherwise looks like
    // payments silently not recording.
    console.error('stripe webhook signature verification failed', msg)
    return NextResponse.json({ error: `Signature verification failed: ${msg}` }, { status: 400 })
  }

  const admin = sbAdmin()

  console.log('stripe webhook event', event.type)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'payment' || session.payment_status !== 'paid') break
      await handleInvoicePaid(session)
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
      await creditPaymentByInvoiceId({
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
async function handleInvoicePaid(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id
  if (!invoiceId) return

  const amount = (session.amount_total ?? 0) / 100
  const method = methodFromPaymentMethod(session.payment_method_types ?? undefined)

  // The PaymentIntent id is what Stripe's Payments page lists — store that as
  // the reference; the session id rides along so either event dedupes.
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : null
  await creditPaymentByInvoiceId({
    invoiceId,
    amount,
    method,
    reference: pi ?? session.id,
  })
}

/**
 * Records one Stripe payment against an invoice, exactly once. The unique
 * index on payments.reference_number is the real guard — both checkout events
 * (session + payment_intent) carry the same PaymentIntent id, so the second
 * insert conflicts and does nothing, and the amount is applied as an atomic
 * increment inside the same transaction rather than a read-then-write.
 */
export async function creditPaymentByInvoiceId(input: {
  invoiceId: string
  amount: number
  method: 'card' | 'bank_transfer' | 'stripe'
  reference: string
}) {
  await withTransaction(async (q) => {
    const inserted = await q<{ id: string }>(
      `insert into payments (invoice_id, amount, method, reference_number, notes)
       select i.id, $2, $3, $4, 'Stripe hosted checkout'
         from invoices i where i.id = $1
       on conflict (reference_number) where reference_number is not null
       do nothing
       returning id`,
      [input.invoiceId, input.amount, input.method, input.reference],
    )
    // No row inserted → the invoice was missing or this reference is already
    // recorded. Either way, do not touch the total.
    if (!inserted.length) return

    await q(
      `update invoices
          set amount_paid = amount_paid + $2,
              status = case when amount_paid + $2 >= total then 'paid'::invoice_status else 'partial'::invoice_status end,
              paid_at = case when amount_paid + $2 >= total and paid_at is null then now() else paid_at end
        where id = $1`,
      [input.invoiceId, input.amount],
    )
  })
}

function methodFromPaymentMethod(
  types: string[] | undefined,
): 'card' | 'bank_transfer' | 'stripe' {
  if (!types) return 'stripe'
  if (types.includes('us_bank_account')) return 'bank_transfer'
  if (types.includes('card')) return 'card'
  return 'stripe'
}
