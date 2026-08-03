import { notFound } from 'next/navigation'

import { renderQuotePdf } from '@/lib/pdf/documents'
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

  const { data: quote } = await admin
    .from('work_items')
    .select(`
      id, quote_number, description, subtotal, tax_rate, tax_amount, total,
      created_at, expires_at, public_token,
      companies (name, phone, email, address),
      customers (name, email, phone),
      addresses:customer_addresses!work_items_address_id_fkey (address, city, state, zip),
      quote_items (name, description, quantity, unit_price, is_upsell, is_discount, sort_order)
    `)
    .eq('public_token', token)
    .maybeSingle()

  if (!quote) notFound()

  const items = ((quote.quote_items ?? []) as Array<{ name: string; description: string | null; quantity: number; unit_price: number; is_upsell: boolean; is_discount: boolean; sort_order: number }>)
    .sort((a, b) => a.sort_order - b.sort_order)

  const addr = quote.addresses as { address: string | null; city: string | null; state: string | null; zip: string | null } | null
  const addressLine = addr ? [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : null

  const buffer = await renderQuotePdf({
    quoteNumber: quote.quote_number ?? `Q-${token.slice(0, 6).toUpperCase()}`,
    createdAt: new Date(quote.created_at),
    expiresAt: quote.expires_at ? new Date(quote.expires_at) : null,
    description: quote.description,
    items,
    subtotal: Number(quote.subtotal),
    taxRate: Number(quote.tax_rate),
    taxAmount: Number(quote.tax_amount),
    total: Number(quote.total),
    company: quote.companies as { name: string; phone: string | null; email: string | null; address: string | null },
    customer: {
      ...(quote.customers as { name: string; email: string | null; phone: string | null }),
      address: addressLine,
    },
    publicUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/q/${token}`,
  })

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.quote_number ?? 'quote'}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
