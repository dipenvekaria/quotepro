'server-only'

import type Stripe from 'stripe'

import { getStripe } from './client'

// ---------------------------------------------------------------------------

type CheckoutInput = {
  invoiceId: string
  invoiceNumber: string
  amountDue: number
  currency?: string
  companyName: string
  companyStripeAccountId: string | null
  customerEmail?: string | null
  successUrl: string
  cancelUrl: string
  passCardFees?: boolean
}

type CheckoutOutput =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Checkout Session for an invoice. Uses destination charges
 * so funds land in the connected company's account; QuotePro can take a
 * platform fee (currently 0 — configure later via STRIPE_PLATFORM_FEE_BPS).
 */
export async function createInvoiceCheckoutSession(
  input: CheckoutInput,
): Promise<CheckoutOutput> {
  const stripe = getStripe()
  if (!stripe) return { ok: false, error: 'Stripe not configured' }
  if (!input.companyStripeAccountId) {
    return { ok: false, error: 'This company has not connected Stripe yet.' }
  }

  const currency = (input.currency ?? 'usd').toLowerCase()
  const cents = Math.round(input.amountDue * 100)
  if (cents <= 0) return { ok: false, error: 'Nothing to charge.' }

  // If the merchant elects to pass card fees, we bump the line item by ~2.9% +
  // 30¢ so the visible charge shows the higher amount. For ACH we keep the
  // original number and Stripe caps its own fee at $5.
  const cardCents = input.passCardFees ? Math.round(cents * 1.029 + 30) : cents

  const platformFeeBps = Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? '0')
  const platformFeeCents =
    platformFeeBps > 0 ? Math.round((cents * platformFeeBps) / 10_000) : 0

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['us_bank_account', 'card'],
    payment_method_options: {
      us_bank_account: { verification_method: 'instant' },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: cardCents,
          product_data: {
            name: `Invoice ${input.invoiceNumber}`,
            description: `Payment to ${input.companyName}`,
          },
        },
      },
    ],
    customer_email: input.customerEmail ?? undefined,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      quotepro_source: 'invoice_checkout',
    },
    payment_intent_data: {
      metadata: {
        invoice_id: input.invoiceId,
        invoice_number: input.invoiceNumber,
      },
      // Destination charge — funds settle in the connected account, not ours.
      transfer_data: {
        destination: input.companyStripeAccountId,
      },
      ...(platformFeeCents > 0
        ? { application_fee_amount: platformFeeCents }
        : {}),
    },
  }

  try {
    const session = await stripe.checkout.sessions.create(params)
    return { ok: true, url: session.url ?? '', sessionId: session.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
