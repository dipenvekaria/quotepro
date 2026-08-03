import { notFound } from 'next/navigation'
import Link from 'next/link'

import { createAdminClient } from '@/lib/supabase/admin'

import { QuoteViewer } from './quote-viewer'
import { markQuoteViewed } from './actions'

// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: token } = await params
  const admin = createAdminClient()

  const { data: quote } = await admin
    .from('work_items')
    .select(`
      id, status, description, quote_number,
      subtotal, discount_amount, tax_rate, tax_amount, total,
      sent_at, viewed_at, accepted_at, rejected_at, expires_at,
      public_token, metadata,
      companies (id, name, logo_url, phone, email, address),
      customers (name, email, phone),
      addresses:customer_addresses!work_items_address_id_fkey (address, city, state, zip)
    `)
    .eq('public_token', token)
    .maybeSingle()

  if (!quote) notFound()

  // Fire-and-forget view tracking (server action, safe to await here for
  // determinism — it's a single fast UPDATE).
  await markQuoteViewed(token)

  const { data: items } = await admin
    .from('quote_items')
    .select('id, name, description, quantity, unit_price, is_upsell, is_discount, sort_order')
    .eq('work_item_id', quote.id)
    .order('sort_order', { ascending: true })

  return (
    <QuoteViewer
      quote={quote as unknown as Parameters<typeof QuoteViewer>[0]['quote']}
      items={(items ?? []) as Parameters<typeof QuoteViewer>[0]['items']}
    />
  )
}

// ---------------------------------------------------------------------------

export function generateMetadata() {
  return { title: 'Quote — QuotePro' }
}

// Custom 404 lives in app/not-found.tsx; we still export a small fallback link.
export function NotFoundLink() {
  return (
    <Link href="/" className="text-primary hover:underline">
      Go to QuotePro
    </Link>
  )
}
