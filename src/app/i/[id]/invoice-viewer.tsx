'use client'

import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Mail,
  Phone,
  Shield,
} from 'lucide-react'

import { formatDateLong, formatPhone, formatQuantity, unitSuffix } from '@/lib/format'

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
}

type Payment = {
  id: string
  amount: number
  method: string
  reference_number: string | null
  paid_at: string
}

type Invoice = {
  id: string
  invoice_number: string
  subtotal: number
  tax_amount: number
  total: number
  amount_paid: number
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  due_date: string | null
  sent_at: string | null
  paid_at: string | null
  public_token: string
  notes: string | null
  companies: {
    id: string
    name: string
    logo_url: string | null
    phone: string | null
    email: string | null
    address: string | null
    stripe_charges_enabled?: boolean | null
  } | null
  customers: { name: string; email: string | null; phone: string | null } | null
}

// ---------------------------------------------------------------------------

export function InvoiceViewer({
  invoice,
  items,
  payments,
  showBadge = true,
}: {
  invoice: Invoice
  items: LineItem[]
  payments: Payment[]
  /** False on a paid plan — see src/lib/branding.ts. */
  showBadge?: boolean
}) {
  const amountDue = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid ?? 0))
  const isPaid = invoice.status === 'paid'
  const isRefunded = invoice.status === 'refunded'
  const isPartial = invoice.status === 'partial'
  const nonDiscountItems = items.filter((i) => !i.is_discount)
  const discounts = items.filter((i) => i.is_discount)

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-3">
            {invoice.companies?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.companies.logo_url}
                alt={invoice.companies.name}
                className="h-8 w-auto"
              />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{invoice.companies?.name ?? 'Your provider'}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {formatPhone(invoice.companies?.phone) || invoice.companies?.email || ''}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] tabular text-muted-foreground sm:inline">
              {invoice.invoice_number}
            </span>
            <a
              href={`/i/${invoice.public_token}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted lg:h-8 lg:px-2.5 lg:text-[11px]"
            >
              <Download className="h-3 w-3" />
              PDF
            </a>
          </div>
        </div>
      </header>

      {/* Status ribbon */}
      {isRefunded && (
        <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
          <div className="rounded-xl border border-border/70 bg-muted/50 p-4 text-sm">
            This invoice was refunded — nothing is owed.
          </div>
        </div>
      )}
      {isPaid && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/10">
          <div className="mx-auto max-w-3xl px-6 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
            Paid in full on {formatDateLong(invoice.paid_at)}
          </div>
        </div>
      )}
      {isPartial && !isPaid && (
        <div className="border-b border-amber-500/20 bg-amber-500/10">
          <div className="mx-auto max-w-3xl px-6 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            Partial payment received —{' '}
            <span className="tabular">{fmtMoney(Number(invoice.amount_paid))}</span> of{' '}
            <span className="tabular">{fmtMoney(Number(invoice.total))}</span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        {/* Hero. Stacks on phones; `justify-between` alone squeezed the
            heading into a ragged sliver at 375px. The internal job description
            is deliberately not rendered — it is the contractor's own prompt
            text, not customer copy; invoice.notes below is the field written
            for the customer. */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-primary">
                Invoice · <span className="whitespace-nowrap">{invoice.invoice_number}</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {invoice.customers?.name ?? 'Customer'}
              </h1>
            </div>
            <div className="sm:text-right">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {isPaid ? 'Paid' : isRefunded ? 'Refunded' : 'Amount due'}
              </div>
              <div className={`mt-0.5 text-3xl font-semibold tabular sm:text-4xl ${isPaid ? 'text-emerald-600' : ''}`}>
                {fmtMoney(isPaid ? Number(invoice.total) : isRefunded ? 0 : amountDue)}
              </div>
              {invoice.due_date && !isPaid && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items. The totals block sits OUTSIDE the items condition: an
            invoice without line items still owes its customer the arithmetic —
            a bare "amount due" with no subtotal, tax or breakdown reads as a
            demand, not a bill. */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <header className="border-b border-border/70 px-6 py-4">
            <h2 className="text-sm font-semibold">Work performed</h2>
          </header>
          {nonDiscountItems.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Itemised work is on the accepted quote — the totals below are what remains to pay.
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {nonDiscountItems.map((item) => (
                <li key={item.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {(item.quantity !== 1 || unitSuffix(item.unit)) && (
                      <p className="mt-0.5 text-[11px] tabular text-muted-foreground">
                        {formatQuantity(item.quantity, item.unit)} × {fmtMoney(item.unit_price)}
                        {unitSuffix(item.unit)}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm font-semibold tabular">
                    {fmtMoney(item.quantity * item.unit_price)}
                  </div>
                </li>
              ))}
            </ul>
          )}
            <div className="border-t border-border/70 bg-muted/30 px-6 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd className="tabular text-foreground">{fmtMoney(Number(invoice.subtotal))}</dd>
                </div>
                {discounts.map((d) => (
                  <div key={d.id} className="flex justify-between text-emerald-600">
                    <dt>{d.name}</dt>
                    <dd className="tabular">−{fmtMoney(d.quantity * d.unit_price)}</dd>
                  </div>
                ))}
                <div className="flex justify-between text-muted-foreground">
                  <dt>Tax</dt>
                  <dd className="tabular text-foreground">{fmtMoney(Number(invoice.tax_amount))}</dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-border/70 pt-2">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="text-xl font-semibold tabular">{fmtMoney(Number(invoice.total))}</dd>
                </div>
              </dl>
            </div>
        </section>

        {/* A note the contractor wrote for the customer. */}
        {invoice.notes && (
          <section className="mt-6 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold">A note from {invoice.companies?.name ?? 'your provider'}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {invoice.notes}
            </p>
          </section>
        )}

        {/* Payments */}
        {payments.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <header className="border-b border-border/70 px-6 py-4">
              <h2 className="text-sm font-semibold">Payments received</h2>
            </header>
            <ul className="divide-y divide-border/70">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <div className="text-sm font-medium capitalize">{p.method.replace('_', ' ')}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.paid_at).toLocaleDateString()}
                      {p.reference_number ? ` · ${p.reference_number}` : ''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular text-emerald-600">
                    +{fmtMoney(Number(p.amount))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Payment methods (informational) */}
        {!isPaid && !isRefunded && (
          <section className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                {invoice.companies?.stripe_charges_enabled ? 'Pay online' : 'How to pay'}
              </h2>
            </div>
            {invoice.companies?.stripe_charges_enabled ? (
              <>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Fast, secure, no account needed. Choose bank transfer (usually cheapest) or card at
                  checkout. Your receipt arrives instantly.
                </p>
                <div className="mt-4">
                  <a
                    href={`/api/stripe/checkout/${invoice.public_token}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay {fmtMoney(amountDue)} now
                  </a>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Powered by Stripe · PCI compliant · Instant confirmation</p>
              </>
            ) : (
              <>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  {invoice.companies?.name ?? 'Your provider'} accepts payment by check, bank transfer,
                  cash, or card. Contact them directly to arrange payment — details below.
                </p>
              </>
            )}
          </section>
        )}

        {/* Trust footer */}
        <footer className="mt-8 border-t border-border/70 pt-6">
          <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">Secure link</div>
                <div>Private, no login required.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">On record</div>
                <div>All payments are timestamped.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-foreground">Questions?</div>
                {invoice.companies?.phone && (
                  <a
                    href={`tel:${invoice.companies.phone}`}
                    className="flex min-h-11 items-center gap-1.5 hover:text-foreground"
                  >
                    Call or text {formatPhone(invoice.companies.phone)}
                  </a>
                )}
                {invoice.companies?.email && (
                  <a
                    href={`mailto:${invoice.companies.email}`}
                    className="flex min-h-11 items-center gap-1.5 truncate hover:text-foreground"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {invoice.companies.email}
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
    </div>
  )
}

// ---------------------------------------------------------------------------

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
