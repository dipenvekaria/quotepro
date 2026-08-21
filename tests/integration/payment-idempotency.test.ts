import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'
import { creditPaymentByInvoiceId } from '@/app/api/stripe/webhook/route'

/**
 * The Stripe webhook double-credit guard. A card checkout fires two events
 * (checkout.session.completed + payment_intent.succeeded) carrying the same
 * PaymentIntent id; both used to be able to pass an application-level check
 * and credit the invoice twice. The unique index on reference_number plus an
 * atomic increment must make the second one a no-op.
 */
describe('payment idempotency', () => {
  let companyId: string
  let customerId: string
  let invoiceId: string
  const ref = `pi_test_${Date.now()}`

  beforeAll(async () => {
    ;[{ id: companyId }] = await query<{ id: string }>(
      `insert into companies (name) values ('Idem Test Co') returning id`,
    )
    ;[{ id: customerId }] = await query<{ id: string }>(
      `insert into customers (company_id, name) values ($1, 'Idem Cust') returning id`,
      [companyId],
    )
    ;[{ id: invoiceId }] = await query<{ id: string }>(
      `insert into invoices (company_id, customer_id, invoice_number, subtotal, tax_amount, total, amount_paid, status)
       values ($1, $2, 'INV-IDEM-1', 5000, 0, 5000, 0, 'sent') returning id`,
      [companyId, customerId],
    )
  })

  afterAll(async () => {
    await query(`delete from payments where invoice_id = $1`, [invoiceId])
    await query(`delete from invoices where id = $1`, [invoiceId])
    await query(`delete from customers where id = $1`, [customerId])
    await query(`delete from companies where id = $1`, [companyId])
  })

  it('credits once even when both events fire concurrently', async () => {
    // The two events, delivered in parallel, same PaymentIntent reference.
    await Promise.all([
      creditPaymentByInvoiceId({ invoiceId, amount: 5000, method: 'card', reference: ref }),
      creditPaymentByInvoiceId({ invoiceId, amount: 5000, method: 'card', reference: ref }),
    ])

    const payments = await query<{ id: string }>(
      `select id from payments where reference_number = $1`,
      [ref],
    )
    expect(payments).toHaveLength(1)

    const [inv] = await query<{ amount_paid: number; status: string }>(
      `select amount_paid, status from invoices where id = $1`,
      [invoiceId],
    )
    expect(Number(inv.amount_paid)).toBe(5000)
    expect(inv.status).toBe('paid')
  })

  it('a replayed event after settle does not double-credit', async () => {
    await creditPaymentByInvoiceId({ invoiceId, amount: 5000, method: 'card', reference: ref })
    const [inv] = await query<{ amount_paid: number }>(
      `select amount_paid from invoices where id = $1`,
      [invoiceId],
    )
    expect(Number(inv.amount_paid)).toBe(5000)
  })
})
