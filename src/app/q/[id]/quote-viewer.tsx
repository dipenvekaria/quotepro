'use client'

import { useState, useTransition } from 'react'
import {
  Building2,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Mail,

  Phone,
  Shield,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateLong, formatDateShort, formatPhone, formatQuantity, unitSuffix } from '@/lib/format'

import { acceptQuote, declineQuote } from './actions'
import { cn } from '@/lib/utils'
import { computeTotals } from '@/lib/money'

// ---------------------------------------------------------------------------

type LineItem = {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  unit?: string | null
  is_upsell: boolean
  is_discount: boolean
  sort_order: number
  option_tier?: string | null
}

export type ViewerPhoto = {
  id: string
  url: string
  caption: string | null
  quote_item_id: string | null
}

export type QuoteOption = {
  id: string
  tier: 'good' | 'better' | 'best'
  name: string
  description: string | null
  total: number
  is_selected: boolean
  sort_order: number
}

type Quote = {
  id: string
  status: string
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

export function QuoteViewer({
  quote,
  items,
  options = [],
  photos = [],
  showBadge = true,
}: {
  quote: Quote
  items: LineItem[]
  options?: QuoteOption[]
  photos?: ViewerPhoto[]
  /** False on a paid plan — see src/lib/branding.ts. */
  showBadge?: boolean
}) {
  const [signOpen, setSignOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)

  const canAct = ['quote_sent', 'quote_viewed'].includes(quote.status)
  const isAccepted = quote.status === 'quote_accepted'
  const isRejected = quote.status === 'quote_rejected'

  // The deadline is the one visual cue on this page that moves a decision.
  // Quiet while distant, amber inside a week, muted once passed — and absent
  // entirely once the customer has already decided. `now` is captured once in
  // state: the react-compiler lint forbids Date.now() during render, and a
  // deadline chip has no business re-evaluating on every keystroke anyway.
  const [now] = useState(() => Date.now())
  const validity = (() => {
    if (!quote.expires_at || isAccepted || isRejected) return null
    const days = Math.ceil((new Date(quote.expires_at).getTime() - now) / 86_400_000)
    if (days < 0) return { tone: 'expired' as const, label: `Expired ${formatDateShort(quote.expires_at)}` }
    if (days <= 7)
      return {
        tone: 'urgent' as const,
        label: days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}`,
      }
    return { tone: 'quiet' as const, label: `Valid until ${formatDateShort(quote.expires_at)}` }
  })()

  // Good/better/best — legacy: new quotes no longer create options, but sent
  // links must keep rendering. Only trust the options when the live items are
  // actually tiered: a quote whose lines were later edited flat still has the
  // option rows, and rendering three columns over untiered items showed the
  // customer three empty $0.00 choices. The real quote is the items.
  const anyTieredItems = items.some((i) => i.option_tier)
  const hasOptions = options.length >= 2 && anyTieredItems
  const [chosenTier, setChosenTier] = useState<string>(() => {
    if (options.length === 0) return ''
    const already = options.find((o) => o.is_selected)
    if (already) return already.tier
    return options[Math.min(1, options.length - 1)].tier
  })

  // With options, the quote shows the chosen column; without, everything.
  const visibleItems = hasOptions ? items.filter((i) => i.option_tier === chosenTier) : items
  const chosenOption = hasOptions ? options.find((o) => o.tier === chosenTier) : undefined

  const photosFor = (itemId: string) => photos.filter((p) => p.quote_item_id === itemId)
  const generalPhotos = photos.filter((p) => !p.quote_item_id)

  const nonDiscountItems = visibleItems.filter((i) => !i.is_discount)
  const discounts = visibleItems.filter((i) => i.is_discount)

  // Every figure on the page follows the selection. The stored total is the
  // recommended tier, so a customer choosing Complete would otherwise see the
  // Recommended price on the button they are about to approve — which is the
  // single worst place in the product to show a number that is not the one they
  // picked.
  const shown = hasOptions
    ? computeTotals(visibleItems, quote.tax_rate)
    : { subtotal: quote.subtotal, taxAmount: quote.tax_amount, total: quote.total }

  /**
   * Option prices are computed from their own line items, not read from
   * `quote_options.total`.
   *
   * The stored figure was correct when it was written, but it drifts: the
   * contractor can edit a line afterwards, and the two paths rounded
   * differently anyway — a card read $4,720.84 while the same option totalled
   * $4,721.06 everywhere else on the page. One source of truth is worth more
   * here than one fewer calculation, because this is the screen where a
   * stranger agrees to a number.
   */
  const optionTotal = (tier: string) =>
    computeTotals(
      items.filter((i) => i.option_tier === tier),
      quote.tax_rate,
    ).total

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
                {formatPhone(quote.companies?.phone) || quote.companies?.email || ''}
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
            Accepted on {formatDateLong(quote.accepted_at)}
          </div>
        </div>
      )}
      {isRejected && (
        <div className="border-b border-destructive/20 bg-destructive/10">
          <div className="mx-auto max-w-3xl px-6 py-2.5 text-sm text-destructive">
            <X className="mr-1.5 inline h-4 w-4" />
            Declined on {formatDateLong(quote.rejected_at)}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        {/* Hero. Stacks on phones — `justify-between` alone squeezed the title
            into a ~127px column at 375px, on the page a customer sees exactly
            once. The internal job description is deliberately not rendered
            here: it is the contractor's prompt ("customer also wants…"), not
            customer copy — the AI summary below is the version written for
            them. */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-primary">
                Estimate
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Prepared for {quote.customers?.name ?? 'you'}
              </h1>
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
            <div className="sm:text-right">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="mt-0.5 text-3xl font-semibold tabular sm:text-4xl">
                {fmtMoney(shown.total)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {visibleItems.length} line item{visibleItems.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* The facts, as quiet prose — chips are for state, not data. The one
              chip on this page is the validity state below, because a deadline
              is the cue that actually moves a decision. */}
          <dl className="mt-6 grid gap-x-8 gap-y-2 border-t border-border/70 pt-4 text-sm sm:grid-cols-2">
            {quote.addresses?.address && (
              <div className="flex items-baseline justify-between gap-4 sm:block">
                <dt className="text-xs text-muted-foreground">Service address</dt>
                <dd className="text-right sm:mt-0.5 sm:text-left">
                  {quote.addresses.address}
                  {quote.addresses.city ? `, ${quote.addresses.city}` : ''}
                  {quote.addresses.state ? `, ${quote.addresses.state}` : ''}
                  {quote.addresses.zip ? ` ${quote.addresses.zip}` : ''}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 sm:block">
              <dt className="text-xs text-muted-foreground">Quote number</dt>
              <dd className="tabular sm:mt-0.5">
                {quote.quote_number ?? `#${quote.public_token.slice(0, 6).toUpperCase()}`}
              </dd>
            </div>
            {validity && (
              <div className="flex items-baseline justify-between gap-4 sm:block">
                <dt className="text-xs text-muted-foreground">Validity</dt>
                <dd className="sm:mt-0.5">
                  <span
                    className={
                      validity.tone === 'urgent'
                        ? 'inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'
                        : validity.tone === 'expired'
                          ? 'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                          : 'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {validity.label}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Options. The customer picks a level of work rather than answering
            yes or no, which is the entire reason for offering three. Each tier
            contains everything in the one below, so the differences read as
            additions. */}
        {hasOptions && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold">Choose your option</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Each option includes everything in the one before it.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {options.map((o, oi) => {
                const chosen = o.tier === chosenTier
                const count = items.filter((i) => i.option_tier === o.tier && !i.is_discount).length
                // The cue a customer actually needs is the step, not three
                // totals to diff in their head: "+$162 over Recommended".
                const prev = oi > 0 ? options[oi - 1] : null
                const delta = prev ? optionTotal(o.tier) - optionTotal(prev.tier) : 0
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setChosenTier(o.tier)}
                    aria-pressed={chosen}
                    className={cn(
                      'relative flex flex-col rounded-2xl border p-4 text-left transition-colors',
                      chosen
                        ? 'border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary'
                        : 'border-border/70 bg-card hover:border-border',
                    )}
                  >
                    {o.tier === 'better' && (
                      <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Most popular
                      </span>
                    )}
                    <span className="text-sm font-semibold">{o.name}</span>
                    <span className="mt-1 text-2xl font-semibold tabular">
                      {fmtMoney(optionTotal(o.tier))}
                    </span>
                    {prev && delta > 0 && (
                      <span className="mt-0.5 text-[11px] tabular text-muted-foreground">
                        +{fmtMoney(delta)} over {prev.name}
                      </span>
                    )}
                    {o.description && (
                      <span className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {o.description}
                      </span>
                    )}
                    <span className="mt-3 text-[11px] text-muted-foreground">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {generalPhotos.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <header className="border-b border-border/70 px-6 py-4">
              <h2 className="text-sm font-semibold">Photos</h2>
            </header>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              {generalPhotos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt={p.caption ?? 'Photo of the work'}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg border border-border/70 object-cover"
                />
              ))}
            </div>
          </section>
        )}

        {/* Line items */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border/70 px-6 py-4">
            <h2 className="text-sm font-semibold">
              {chosenOption ? `What’s included — ${chosenOption.name}` : 'What’s included'}
            </h2>
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
                  {(item.quantity !== 1 || unitSuffix(item.unit)) && (
                    <p className="mt-0.5 text-[11px] tabular text-muted-foreground">
                      {formatQuantity(item.quantity, item.unit)} × {fmtMoney(item.unit_price)}
                      {unitSuffix(item.unit)}
                    </p>
                  )}
                  {/* A photo of the actual part, beside the line that charges
                      for it — which is where the question "what am I paying for?"
                      gets asked. */}
                  {photosFor(item.id).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {photosFor(item.id).map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.id}
                          src={p.url}
                          alt={p.caption ?? item.name}
                          loading="lazy"
                          className="h-16 w-16 rounded-md border border-border/70 object-cover"
                        />
                      ))}
                    </div>
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
                <dd className="tabular text-foreground">{fmtMoney(shown.subtotal)}</dd>
              </div>
              {discounts.map((d) => (
                <div key={d.id} className="flex justify-between text-emerald-600">
                  <dt>{d.name}</dt>
                  <dd className="tabular">−{fmtMoney(d.quantity * d.unit_price)}</dd>
                </div>
              ))}
              <div className="flex justify-between text-muted-foreground">
                <dt>Tax ({quote.tax_rate}%)</dt>
                <dd className="tabular text-foreground">{fmtMoney(shown.taxAmount)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-border/70 pt-2">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-xl font-semibold tabular">{fmtMoney(shown.total)}</dd>
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
                Approve quote · {fmtMoney(shown.total)}
              </Button>
            </div>
          </section>
        )}

        {/* Thumb-reachable decision. On a phone the approve button otherwise
            lives below the line items, the photos and the fine print — the
            sticky bar keeps the total and the action in reach the whole way
            down, the way a checkout does. Phones only; desktop keeps the
            in-flow section. */}
        {canAct && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</div>
                <div className="text-lg font-semibold tabular">{fmtMoney(shown.total)}</div>
              </div>
              <Button onClick={() => setSignOpen(true)} className="h-12 flex-1 gap-1.5 text-sm shadow-sm">
                <Check className="h-4 w-4" />
                Approve quote
              </Button>
            </div>
          </div>
        )}

        {/* Trust footer */}
        <footer className={cn('mt-8 border-t border-border/70 pt-6', canAct && 'pb-24 sm:pb-0')}>
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
              <div className="min-w-0">
                <div className="font-medium text-foreground">Questions?</div>
                {/* The nervous customer's escape hatch — full-height touch
                    targets, not 15px text links. */}
                {quote.companies?.phone && (
                  <a
                    href={`tel:${quote.companies.phone}`}
                    className="flex min-h-11 items-center gap-1.5 hover:text-foreground"
                  >
                    Call or text {formatPhone(quote.companies.phone)}
                  </a>
                )}
                {quote.companies?.email && (
                  <a
                    href={`mailto:${quote.companies.email}`}
                    className="flex min-h-11 items-center gap-1.5 truncate hover:text-foreground"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {quote.companies.email}
                  </a>
                )}
              </div>
            </div>
          </div>
          {showBadge && (
            <div className="mt-6 text-center text-[10px] text-muted-foreground">
              Powered by <span className="font-medium text-foreground">Rivet</span>
            </div>
          )}
        </footer>
      </main>

      {/* Sign modal */}
      {signOpen && (
        <SignModal
          token={quote.public_token}
          total={shown.total}
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
            className="h-11 lg:h-10"
          />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-11 lg:h-9">
            Cancel
          </Button>
          {/* 44px, and not smaller than the Cancel beside it. This was h-9 —
              36px — which made the highest-stakes tap in the product both below
              the touch minimum and harder to hit than the way out of it. */}
          <Button onClick={submit} disabled={busy} className="h-11 gap-1.5 shadow-sm lg:h-9">
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
          <Button variant="outline" onClick={onClose} className="h-11 lg:h-9">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} variant="outline" className="h-11 lg:h-9">
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
