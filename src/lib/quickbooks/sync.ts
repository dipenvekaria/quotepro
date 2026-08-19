import { query } from '@/lib/db'
import {
  createQboInvoice,
  createQboPayment,
  ensureQboItem,
  ensureServiceItem,
  findOrCreateCustomer,
  qboConnection,
} from './client'

/**
 * The push side of bookkeeping sync. Called from `after()` on the invoice and
 * payment actions — the contractor's action never waits on Intuit and never
 * fails because of it. Failures are loud where they belong: `last_error` on
 * the connection row, shown on the integrations card. No retries and no
 * queue on purpose — the next invoice or payment tries again, and a book
 * entry that needs urgency has a human behind it anyway.
 */

async function recordOutcome(companyId: string, error: string | null): Promise<void> {
  await query(
    `update quickbooks_connections
        set last_synced_at = case when $2::text is null then now() else last_synced_at end,
            last_error = $2
      where company_id = $1`,
    [companyId, error],
  ).catch(() => {})
}

/** Mirror a Rivet invoice into QBO. Idempotent via invoices.qbo_invoice_id. */
export async function syncInvoiceToQbo(companyId: string, invoiceId: string): Promise<void> {
  if (!(await qboConnection(companyId))) return

  try {
    const [inv] = await query<{
      id: string
      invoice_number: string
      tax_amount: number | null
      due_date: string | null
      qbo_invoice_id: string | null
      work_item_id: string | null
      customer_id: string | null
      customer_name: string | null
      customer_email: string | null
      customer_qbo_id: string | null
    }>(
      `select i.id, i.invoice_number, i.tax_amount, i.due_date::text, i.qbo_invoice_id,
              i.work_item_id, i.customer_id,
              c.name as customer_name, c.email as customer_email, c.qbo_customer_id as customer_qbo_id
         from invoices i
         left join customers c on c.id = i.customer_id
        where i.id = $1 and i.company_id = $2
        limit 1`,
      [invoiceId, companyId],
    )
    if (!inv || inv.qbo_invoice_id) return
    if (!inv.customer_id || !inv.customer_name) {
      throw new Error('Invoice has no customer to book against')
    }

    const lines = await query<{
      name: string
      description: string | null
      quantity: number
      unit_price: number
      total: number
      catalog_item_id: string | null
      catalog_name: string | null
      catalog_qbo_item_id: string | null
    }>(
      `select qi.name, qi.description, qi.quantity, qi.unit_price, qi.total,
              qi.catalog_item_id, ci.name as catalog_name, ci.qbo_item_id as catalog_qbo_item_id
         from quote_items qi
         join work_items w on w.id = qi.work_item_id
         left join catalog_items ci on ci.id = qi.catalog_item_id and ci.company_id = $2
        where qi.work_item_id = $1 and w.company_id = $2
        order by qi.sort_order asc, qi.created_at asc`,
      [inv.work_item_id, companyId],
    )
    if (lines.length === 0) throw new Error('Invoice has no line items to book')

    const qboCustomerId = await findOrCreateCustomer(companyId, {
      id: inv.customer_id,
      name: inv.customer_name,
      email: inv.customer_email,
      qbo_customer_id: inv.customer_qbo_id,
    })

    // Price book lines post under their real QBO item (find-or-create by the
    // catalog name, cached on the catalog row); one-offs, estimates and
    // discounts share the generic item so ad-hoc lines never litter their
    // item list. The bookkeeper's sales-by-item report reads like the truth.
    const itemIdByCatalog = new Map<string, string>()
    for (const l of lines) {
      if (!l.catalog_item_id || itemIdByCatalog.has(l.catalog_item_id)) continue
      let qboItemId = l.catalog_qbo_item_id
      if (!qboItemId) {
        qboItemId = await ensureQboItem(companyId, l.catalog_name ?? l.name)
        await query(
          `update catalog_items set qbo_item_id = $2 where id = $1 and company_id = $3`,
          [l.catalog_item_id, qboItemId, companyId],
        )
      }
      itemIdByCatalog.set(l.catalog_item_id, qboItemId)
    }
    const fallbackItemId = lines.some((l) => !l.catalog_item_id)
      ? await ensureServiceItem(companyId)
      : null

    const qboId = await createQboInvoice(companyId, {
      qboCustomerId,
      docNumber: inv.invoice_number,
      dueDate: inv.due_date,
      taxAmount: Number(inv.tax_amount ?? 0),
      lines: lines.map((l) => ({
        itemId:
          (l.catalog_item_id ? itemIdByCatalog.get(l.catalog_item_id) : null) ??
          (fallbackItemId as string),
        description: l.description ? `${l.name} — ${l.description}` : l.name,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unit_price),
        amount: Number(l.total),
      })),
    })

    await query(
      `update invoices set qbo_invoice_id = $2 where id = $1 and company_id = $3`,
      [invoiceId, qboId, companyId],
    )
    await recordOutcome(companyId, null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`qbo: invoice sync failed for ${invoiceId}: ${msg}`)
    await recordOutcome(companyId, `Invoice sync: ${msg.slice(0, 500)}`)
  }
}

/** Mirror a recorded payment. Requires the invoice to be in QBO already. */
export async function syncPaymentToQbo(companyId: string, paymentId: string): Promise<void> {
  if (!(await qboConnection(companyId))) return

  try {
    const [p] = await query<{
      id: string
      amount: number
      paid_at: string
      qbo_payment_id: string | null
      invoice_id: string
      qbo_invoice_id: string | null
      customer_id: string | null
      customer_name: string | null
      customer_email: string | null
      customer_qbo_id: string | null
    }>(
      `select p.id, p.amount, p.paid_at::text, p.qbo_payment_id,
              i.id as invoice_id, i.qbo_invoice_id,
              i.customer_id, c.name as customer_name, c.email as customer_email,
              c.qbo_customer_id as customer_qbo_id
         from payments p
         join invoices i on i.id = p.invoice_id and i.company_id = $2
         left join customers c on c.id = i.customer_id
        where p.id = $1
        limit 1`,
      [paymentId, companyId],
    )
    if (!p || p.qbo_payment_id) return

    // The invoice may not have synced (connected after invoicing, or a prior
    // failure). Book it first so the payment has something to land on.
    let qboInvoiceId = p.qbo_invoice_id
    if (!qboInvoiceId) {
      await syncInvoiceToQbo(companyId, p.invoice_id)
      const [again] = await query<{ qbo_invoice_id: string | null }>(
        `select qbo_invoice_id from invoices where id = $1 and company_id = $2`,
        [p.invoice_id, companyId],
      )
      qboInvoiceId = again?.qbo_invoice_id ?? null
    }
    if (!qboInvoiceId) throw new Error('Invoice is not in QuickBooks yet')
    if (!p.customer_id || !p.customer_name) throw new Error('Payment has no customer')

    const qboCustomerId = await findOrCreateCustomer(companyId, {
      id: p.customer_id,
      name: p.customer_name,
      email: p.customer_email,
      qbo_customer_id: p.customer_qbo_id,
    })

    const qboId = await createQboPayment(companyId, {
      qboCustomerId,
      qboInvoiceId,
      amount: Number(p.amount),
      date: p.paid_at,
    })

    await query(
      `update payments p set qbo_payment_id = $2
         from invoices i
        where p.id = $1 and p.invoice_id = i.id and i.company_id = $3`,
      [paymentId, qboId, companyId],
    )
    await recordOutcome(companyId, null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`qbo: payment sync failed for ${paymentId}: ${msg}`)
    await recordOutcome(companyId, `Payment sync: ${msg.slice(0, 500)}`)
  }
}
