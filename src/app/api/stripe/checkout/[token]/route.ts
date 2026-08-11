import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { createInvoiceCheckoutSession } from '@/lib/stripe/checkout'
import { sbAdmin } from '@/lib/supabase/untyped'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint invoked from the /i/{token} viewer.
 * Creates a Stripe Checkout Session for the invoice + redirects to hosted UI.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = sbAdmin()

  const { data: inv } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, total, amount_paid, status, stripe_checkout_session_id,
      customers (email),
      companies (name, stripe_account_id, stripe_charges_enabled, pass_card_fees)
    `)
    .eq('public_token', token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const comp = inv.companies as { name: string; stripe_account_id: string | null; stripe_charges_enabled: boolean; pass_card_fees: boolean } | null
  if (!comp?.stripe_account_id || !comp.stripe_charges_enabled) {
    return NextResponse.json(
      { error: 'This company has not connected Stripe yet.' },
      { status: 409 },
    )
  }

  if (inv.status === 'paid') {
    return NextResponse.json({ error: 'Invoice already paid.' }, { status: 409 })
  }

  const cust = inv.customers as { email: string | null } | null
  const amountDue = Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0))
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

  const res = await createInvoiceCheckoutSession({
    invoiceId: inv.id,
    invoiceNumber: inv.invoice_number,
    amountDue,
    companyName: comp.name,
    companyStripeAccountId: comp.stripe_account_id,
    customerEmail: cust?.email,
    successUrl: `${base}/i/${token}?paid=1`,
    cancelUrl: `${base}/i/${token}?cancelled=1`,
    passCardFees: comp.pass_card_fees,
  })

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 500 })
  }

  await admin
    .from('invoices')
    .update({ stripe_checkout_session_id: res.sessionId, payment_link_url: res.url })
    .eq('id', inv.id)

  return NextResponse.redirect(res.url, 303)
}
