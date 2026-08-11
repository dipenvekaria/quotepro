'use client'

import { useState, useTransition } from 'react'
import {
  Building2,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { acceptQuote, declineQuote } from './actions'

// ---------------------------------------------------------------------------

type LineItem = {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  is_upsell: boolean
  is_discount: boolean
  sort_order: number
}

type Quote = {
  id: string
  status: string
  description: string | null
  customer_summary: string | null
  quote_number: string | null
  subtotal: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  sent_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  expires_at: string | null
  public_token: string
  companies: {
    id: string
    name: string
    logo_url: string | null
    phone: string | null
    email: string | null
    address: string | null
  } | null
  customers: { name: string; email: string | null; phone: string | null } | null
  addresses: {
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  } | null
}

// ---------------------------------------------------------------------------

export function QuoteViewer({ quote, items }: { quote: Quote; items: LineItem[] }) {
  const [signOpen, setSignOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)

  const canAct = ['quote_sent', 'quote_viewed'].includes(quote.status)
  const isAccepted = quote.status === 'quote_accepted'
  const isRejected = quote.status === 'quote_rejected'

  const nonDiscountItems = items.filter((i) => !i.is_discount)
  const discounts = items.filter((i) => i.is_discount)

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top ribbon (company header) */}
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-3">
            {quote.companies?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.companies.logo_url}
                alt={quote.companies.name}
                className="h-8 w-auto"
              />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{quote.companies?.name ?? 'Your provider'}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {quote.companies?.phone ?? quote.companies?.email ?? ''}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              Quote {quote.quote_number ?? `#${quote.public_token.slice(0, 6).toUpperCase()}`}
            </span>
            <a
              href={`/q/${quote.public_token}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium transition-all hover:bg-muted active:scale-[0.97] active:bg-muted lg:h-8 lg:px-2.5 lg:text-[11px]"
            >
              <Download className="h-3 w-3" />
              PDF
            </a>
          </div>
        </div>
      </header>

      {/* Status ribbon */}
      {isAccepted && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/10">
          <div className="mx-auto max-w-3xl px-6 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
            Accepted on {quote.accepted_at ? new Date(quote.accepted_at).toLocaleString() : ''}
          </div>
        </div>
      )}
      {isRejected && (
        <div className="border-b border-destructive/20 bg-destructive/10">
          <div className="mx-auto max-w-3xl px-6 py-2.5 text-sm text-destructive">
            <X className="mr-1.5 inline h-4 w-4" />
            Declined on {quote.rejected_at ? new Date(quote.rejected_at).toLocaleString() : ''}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-primary">
                Estimate
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Prepared for {quote.customers?.name ?? 'you'}
              </h1>
              {quote.description && (
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  {quote.description}
                </p>
              )}
              {quote.customer_summary && (
                <div className="mt-4 max-w-lg rounded-lg border border-border/70 bg-muted/40 p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    What this covers
                  </div>
                  {quote.customer_summary
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((para: string, i: number) => (
                      <p key={i} className="mt-2 text-sm leading-relaxed text-foreground">
                        {para}
                      </p>
                    ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="mt-0.5 text-3xl font-semibold tabular sm:text-4xl">
                {fmtMoney(quote.total)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {items.length} line item{items.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* Address chip */}
          {quote.addresses?.address && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {quote.addresses.address}
              {quote.addresses.city ? `, ${quote.addresses.city}` : ''}
              {quote.addresses.state ? `, ${quote.addresses.state}` : ''}
              {quote.addresses.zip ? ` ${quote.addresses.zip}` : ''}
            </div>
          )}
        </div>

        {/* Line items */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border/70 px-6 py-4">
            <h2 className="text-sm font-semibold">What’s included</h2>
            <span className="text-xs text-muted-foreground">
              {nonDiscountItems.length} items
            </span>
          </header>
          <ul className="divide-y divide-border/70">
            {nonDiscountItems.map((item) => (
              <li key={item.id} className="flex items-start gap-4 px-6 py-4">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.is_upsell && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Recommended
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  )}
                  {item.quantity !== 1 && (
                    <p className="mt-0.5 text-[11px] tabular text-muted-foreground">
                      {item.quantity} × {fmtMoney(item.unit_price)}
                    </p>
                  )}
                </div>
                <div className="whitespace-nowrap text-right text-sm font-semibold tabular">
                  {fmtMoney(item.quantity * item.unit_price)}
                </div>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="border-t border-border/70 bg-muted/30 px-6 py-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular text-foreground">{fmtMoney(quote.subtotal)}</dd>
              </div>
              {discounts.map((d) => (
                <div key={d.id} className="flex justify-between text-emerald-600">
                  <dt>{d.name}</dt>
                  <dd className="tabular">−{fmtMoney(d.quantity * d.unit_price)}</dd>
                </div>
              ))}
              <div className="flex justify-between text-muted-foreground">
                <dt>Tax ({quote.tax_rate}%)</dt>
                <dd className="tabular text-foreground">{fmtMoney(quote.tax_amount)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-border/70 pt-2">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-xl font-semibold tabular">{fmtMoney(quote.total)}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Actions */}
        {canAct && (
          <section className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Ready to move forward?</h2>
            </div>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Approving locks in this price and lets {quote.companies?.name ?? 'us'} schedule the work.
              You’ll get a copy for your records.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => setDeclineOpen(true)}
                className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-all hover:bg-muted active:scale-[0.97] active:bg-muted lg:h-10"
              >
                Not now
              </button>
              <Button
                size="lg"
                onClick={() => setSignOpen(true)}
                className="gap-1.5 shadow-sm"
              >
                <Check className="h-4 w-4" />
                Approve quote · {fmtMoney(quote.total)}
              </Button>
            </div>
          </section>
        )}

        {/* Trust footer */}
        <footer className="mt-8 border-t border-border/70 pt-6">
          <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">Secure</div>
                <div>Private link, no login required.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">On record</div>
                <div>All approvals are timestamped.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">Questions?</div>
                <div>
                  {quote.companies?.phone && (
                    <a href={`tel:${quote.companies.phone}`} className="hover:text-foreground">
                      Call {quote.companies.phone}
                    </a>
                  )}
                  {quote.companies?.email && (
                    <>
                      {quote.companies.phone && <br />}
                      <a href={`mailto:${quote.companies.email}`} className="hover:text-foreground">
                        <Mail className="mr-1 inline h-3 w-3" />
                        {quote.companies.email}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center text-[10px] text-muted-foreground">
            Powered by <span className="font-medium text-foreground">Rivet</span>
          </div>
        </footer>
      </main>

      {/* Sign modal */}
      {signOpen && (
        <SignModal
          token={quote.public_token}
          total={quote.total}
          onClose={() => setSignOpen(false)}
        />
      )}
      {declineOpen && (
        <DeclineModal
          token={quote.public_token}
          onClose={() => setDeclineOpen(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SignModal({
  token,
  total,
  onClose,
}: {
  token: string
  total: number
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [busy, startBusy] = useTransition()

  function submit() {
    if (name.trim().length < 2) {
      toast.error('Please type your full name.')
      return
    }
    startBusy(async () => {
      const res = await acceptQuote({ token, signer_name: name.trim() })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Quote accepted')
      onClose()
      // hard refresh so the RSC re-fetches with new status
      window.location.reload()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Approve this quote</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Type your full name below to approve. This locks in the price of{' '}
          <span className="font-semibold text-foreground">{fmtMoney(total)}</span>.
        </p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="signer_name" className="text-sm font-medium">
            Your full name
          </Label>
          <Input
            id="signer_name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sarah Johnson"
            className="h-10"
          />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-9">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="h-9 gap-1.5 shadow-sm">
            {busy ? 'Approving…' : `Approve · ${fmtMoney(total)}`}
          </Button>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          By approving you agree to the scope and price above. A copy will be emailed to you.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function DeclineModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [busy, startBusy] = useTransition()

  function submit() {
    startBusy(async () => {
      const res = await declineQuote({ token, reason })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Thanks for letting us know.')
      onClose()
      window.location.reload()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Decline this quote</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mind sharing why? It’s optional but helps us learn.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Too high, going with someone else, timing…"
          className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-9">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} variant="outline" className="h-9">
            {busy ? 'Sending…' : 'Send decline'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
