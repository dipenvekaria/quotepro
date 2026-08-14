import { notFound } from 'next/navigation'
import Link from 'next/link'

import { sbAdmin } from '@/lib/supabase/untyped'

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
  const admin = sbAdmin()

  const { data: quote, error } = await admin
    .from('work_items')
    .select(`
      id, status, description, quote_number, customer_summary,
      subtotal, discount_amount, tax_rate, tax_amount, total,
      sent_at, viewed_at, accepted_at, rejected_at, expires_at,
      public_token, metadata,
      companies (id, name, logo_url, phone, email, address),
      customers (name, email, phone),
      addresses:customer_addresses!work_items_address_id_fkey (address, city, state, zip)
    `)
    .eq('public_token', token)
    .maybeSingle()

  // A failed query used to fall through to notFound(), so a database problem
  // reached the customer as "page not found" and left the contractor no signal
  // at all. Distinguish them: a bad token is a 404, a broken query is a 500 the
  // platform will surface and log.
  if (error) {
    console.error('public quote view failed', error)
    throw new Error(`Could not load this quote: ${error.message}`)
  }
  if (!quote) notFound()

  // Fire-and-forget view tracking (server action, safe to await here for
  // determinism — it's a single fast UPDATE).
  await markQuoteViewed(token)

  const { data: items } = await admin
    .from('quote_items')
    .select(
      'id, name, description, quantity, unit_price, is_upsell, is_discount, sort_order, option_tier',
    )
    .eq('work_item_id', quote.id)
    .order('sort_order', { ascending: true })

  // Good/better/best. Absent for most quotes, in which case the viewer renders
  // the single list it always has.
  const { data: options } = await admin
    .from('quote_options')
    .select('id, tier, name, description, total, is_selected, sort_order')
    .eq('work_item_id', quote.id)
    .order('sort_order', { ascending: true })

  return (
    <QuoteViewer
      quote={quote as unknown as Parameters<typeof QuoteViewer>[0]['quote']}
      items={(items ?? []) as Parameters<typeof QuoteViewer>[0]['items']}
      options={(options ?? []) as Parameters<typeof QuoteViewer>[0]['options']}
    />
  )
}

// ---------------------------------------------------------------------------

export function generateMetadata() {
  return { title: 'Quote — Rivet' }
}

// Custom 404 lives in app/not-found.tsx; we still export a small fallback link.
export function NotFoundLink() {
  return (
    <Link href="/" className="text-primary hover:underline">
      Go to Rivet
    </Link>
  )
}
