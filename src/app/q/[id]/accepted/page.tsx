import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, Mail, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { sbAdmin } from '@/lib/supabase/untyped'

/**
 * Where a customer lands after signing.
 *
 * This was a client component that fetched with the browser's anon key and
 * matched `.eq('id', token)`. Two failures at once: a 32-hex public token is not
 * a UUID so it matched nothing, and `anon` has no select grant on `work_items`
 * anyway. It failed silently — the page rendered its generic "Thank You!" with
 * no quote number, no amount and no way to reach the contractor, and only the
 * browser console said why.
 *
 * That is the worst possible moment for a blank page. Someone has just committed
 * to a five-figure contract with a company they met once, and the screen
 * confirming it knew nothing about their quote.
 *
 * Now a Server Component reading through the service role by `public_token`,
 * the same way `/q/[id]` has always worked.
 */

export default async function AcceptedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params

  const { data: quote } = await sbAdmin()
    .from('work_items')
    .select('quote_number, total, accepted_at, companies(name, phone, email)')
    .eq('public_token', token)
    .single()

  if (!quote) notFound()

  const company = quote.companies as { name?: string; phone?: string; email?: string } | null
  const money = (n: number | null) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0))

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Signed and accepted</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {company?.name ?? 'Your contractor'} has been notified.
            </p>
          </div>

          {/* The specifics, because a confirmation that names nothing confirms
              nothing. This is the receipt for a decision worth thousands. */}
          <dl className="mt-6 space-y-2 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm">
            {quote.quote_number && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quote</dt>
                <dd className="font-medium">{quote.quote_number}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold tabular">{money(quote.total)}</dd>
            </div>
            {quote.accepted_at && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Accepted</dt>
                <dd>{new Date(quote.accepted_at).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6">
            <h2 className="text-sm font-semibold">What happens next</h2>
            <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>1. {company?.name ?? 'Your contractor'} will call to book a time.</li>
              <li>2. You will get an invoice when the work is done.</li>
              <li>3. Keep this page — it is your copy of what you agreed to.</li>
            </ol>
          </div>

          {/* No dead ends: every terminal state says how to reach a human. */}
          {(company?.phone || company?.email) && (
            <div className="mt-6 space-y-2 border-t border-border/70 pt-4 text-sm">
              <p className="text-muted-foreground">Questions?</p>
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex min-h-11 items-center gap-2 font-medium">
                  <Phone className="h-4 w-4" />
                  {company.phone}
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex min-h-11 items-center gap-2 font-medium">
                  <Mail className="h-4 w-4" />
                  {company.email}
                </a>
              )}
            </div>
          )}

          <div className="mt-6">
            <Button asChild variant="outline" className="h-11 w-full gap-2">
              <Link href={`/q/${token}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to the quote
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
