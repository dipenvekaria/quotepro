import { notFound } from 'next/navigation'

import { renderInvoicePdf } from '@/lib/pdf/documents'
import { showsRivetBadge } from '@/lib/branding'
import { env } from '@/lib/env'
import { sbAdmin } from '@/lib/supabase/untyped'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: token } = await params
  const admin = sbAdmin()

  const { data: inv } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, subtotal, tax_amount, total, amount_paid, status,
      due_date, sent_at, paid_at, public_token, notes, created_at,
      companies (name, phone, email, address, plan),
      customers (name, email, phone),
      work_items (
        id, description, tax_rate,
        addresses:customer_addresses!work_items_address_id_fkey (address, city, state, zip),
        quote_items (name, description, quantity, unit_price, is_upsell, is_discount, sort_order)
      )
    `)
    .eq('public_token', token)
    .maybeSingle()

  if (!inv) notFound()

  const wi = inv.work_items as {
    id: string
    description: string | null
    tax_rate: number
    addresses: { address: string | null; city: string | null; state: string | null; zip: string | null } | null
    quote_items: Array<{ name: string; description: string | null; quantity: number; unit_price: number; is_upsell: boolean; is_discount: boolean; sort_order: number }>
  } | null

  const items = (wi?.quote_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const addr = wi?.addresses
  const addressLine = addr ? [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : null
  const amountDue = Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0))

  const buffer = await renderInvoicePdf({
    invoiceNumber: inv.invoice_number,
    createdAt: new Date(inv.created_at),
    dueDate: inv.due_date ? new Date(inv.due_date) : null,
    paidAt: inv.paid_at ? new Date(inv.paid_at) : null,
    isPaid: inv.status === 'paid',
    amountDue,
    amountPaid: Number(inv.amount_paid ?? 0),
    description: wi?.description ?? null,
    items,
    subtotal: Number(inv.subtotal),
    taxAmount: Number(inv.tax_amount),
    total: Number(inv.total),
    company: inv.companies as { name: string; phone: string | null; email: string | null; address: string | null },
    customer: {
      ...(inv.customers as { name: string; email: string | null; phone: string | null }),
      address: addressLine,
    },
    publicUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/i/${token}`,
    notes: inv.notes,
    showBadge: showsRivetBadge(
      (inv as unknown as { companies?: { plan?: string | null } }).companies?.plan,
    ),
  })

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${inv.invoice_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
