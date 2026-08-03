import { notFound } from 'next/navigation'

import { sbAdmin } from '@/lib/supabase/untyped'

import { InvoiceViewer } from './invoice-viewer'

// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: token } = await params
  const admin = sbAdmin()

  const { data: invoice } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, subtotal, tax_amount, total, amount_paid, status,
      due_date, sent_at, paid_at, public_token, notes,
      companies (id, name, logo_url, phone, email, address),
      customers (name, email, phone),
      work_items (
        id, description, tax_rate,
        quote_items (id, name, description, quantity, unit_price, is_upsell, is_discount, sort_order)
      )
    `)
    .eq('public_token', token)
    .maybeSingle()

  if (!invoice) notFound()

  const wi = invoice.work_items as unknown as {
    id: string
    description: string | null
    tax_rate: number
    quote_items: Parameters<typeof InvoiceViewer>[0]['items']
  } | null
  const items = (wi?.quote_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)

  const { data: payments } = await admin
    .from('payments')
    .select('id, amount, method, reference_number, paid_at')
    .eq('invoice_id', invoice.id)
    .order('paid_at', { ascending: false })

  return (
    <InvoiceViewer
      invoice={invoice as unknown as Parameters<typeof InvoiceViewer>[0]['invoice']}
      items={items}
      payments={(payments ?? []) as Parameters<typeof InvoiceViewer>[0]['payments']}
      workItemDescription={wi?.description ?? null}
    />
  )
}

export function generateMetadata() {
  return { title: 'Invoice — QuotePro' }
}
