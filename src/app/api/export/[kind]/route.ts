import { NextResponse } from 'next/server'

import { canSeeCatalogPrices } from '@/lib/auth/scope'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import type { UserRole } from '@/lib/permissions'
import { liveTierPredicate } from '@/lib/quotes/items'
import {
  customersToCsv,
  invoicesToCsv,
  paymentsToCsv,
  type CustomerExportRow,
  type InvoiceExportRow,
  type PaymentExportRow,
} from '@/lib/export/quickbooks'

/**
 * Bookkeeping exports.
 *
 * /api/* is outside the auth middleware, so this authenticates itself — three
 * routes here have been found open, and every one of them was written assuming
 * something else did the checking.
 *
 * Gated on the same permission as catalog prices: this is the company's revenue
 * broken down by customer, and a technician who can download it can hand a
 * competitor the whole book of business.
 */

const KINDS = ['invoices', 'payments', 'customers'] as const
type Kind = (typeof KINDS)[number]

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!KINDS.includes(kind as Kind)) {
    return NextResponse.json({ error: 'Unknown export' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!canSeeCatalogPrices(session.role as UserRole)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const { companyId } = session

  let csv: string
  if (kind === 'invoices') {
    // One row per line item, scoped to the live tier so a good/better/best
    // quote does not export three times its own value.
    const rows = await query<InvoiceExportRow>(
      `select i.invoice_number, c.name as customer_name, c.email as customer_email,
              i.created_at, i.due_date,
              qi.name as item_name, qi.description as item_description,
              qi.quantity, qi.unit_price, qi.total as line_total,
              i.tax_amount, i.total as invoice_total
         from invoices i
         left join customers c on c.id = i.customer_id
         left join quote_items qi
           on qi.work_item_id = i.work_item_id${liveTierPredicate(1, 'qi')}
        where i.company_id = $1
        order by i.created_at desc, qi.sort_order`,
      [companyId],
    )
    csv = invoicesToCsv(rows)
  } else if (kind === 'payments') {
    const rows = await query<PaymentExportRow>(
      `select i.invoice_number, c.name as customer_name,
              p.paid_at, p.amount, p.method, p.reference_number
         from payments p
         join invoices i on i.id = p.invoice_id
         left join customers c on c.id = i.customer_id
        where i.company_id = $1
        order by p.paid_at desc nulls last`,
      [companyId],
    )
    csv = paymentsToCsv(rows)
  } else {
    const rows = await query<CustomerExportRow>(
      `select c.name, c.email, c.phone, a.address, a.city, a.state, a.zip
         from customers c
         left join lateral (
           select address, city, state, zip from customer_addresses
            where customer_id = c.id order by is_primary desc, created_at limit 1
         ) a on true
        where c.company_id = $1
        order by c.name`,
      [companyId],
    )
    csv = customersToCsv(rows)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rivet-${kind}-${stamp}.csv"`,
      // Revenue data, and the URL is guessable by design.
      'Cache-Control': 'no-store',
    },
  })
}
