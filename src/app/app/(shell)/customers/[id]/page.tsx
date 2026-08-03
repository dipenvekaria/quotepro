import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/shared/status-badge'

// ---------------------------------------------------------------------------

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      id, name, email, phone, notes, tags, source, created_at,
      addresses (id, line1, line2, city, state, postal_code, is_primary)
    `)
    .eq('company_id', profile.company_id)
    .eq('id', id)
    .maybeSingle()

  if (error || !customer) notFound()

  const { data: workItems } = await supabase
    .from('work_items')
    .select('id, kind, status, description, total, created_at, updated_at')
    .eq('company_id', profile.company_id)
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = workItems ?? []
  const totalRevenue = items
    .filter((w) => w.status === 'invoice_paid' || w.status === 'job_complete')
    .reduce((s, w) => s + Number(w.total || 0), 0)
  const openValue = items
    .filter((w) => ['quote_sent', 'quote_accepted', 'job_scheduled', 'job_in_progress'].includes(w.status as string))
    .reduce((s, w) => s + Number(w.total || 0), 0)

  const addresses = (customer.addresses ?? []) as Array<{
    id: string
    line1: string | null
    line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    is_primary: boolean
  }>
  const primary = addresses.find((a) => a.is_primary) ?? addresses[0]

  const initials = customer.name
    .split(' ')
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10 lg:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/app/customers" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          Customers
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{customer.name}</span>
      </div>

      {/* Header card */}
      <header className="mt-3 flex items-start justify-between gap-6 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-semibold text-primary">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {customer.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${customer.email}`} className="hover:text-foreground">
                    {customer.email}
                  </a>
                </span>
              )}
              {customer.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${customer.phone}`} className="hover:text-foreground">
                    {customer.phone}
                  </a>
                </span>
              )}
              {customer.source && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.source}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/app/quotes/new?customer_id=${customer.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          New quote
        </Link>
      </header>

      {/* Grid: stats + address + history */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total revenue" value={fmtMoney(totalRevenue)} accent="good" />
            <StatCard label="Open pipeline" value={fmtMoney(openValue)} />
            <StatCard label="Work items" value={items.length.toString()} />
          </div>

          {/* History */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <h2 className="text-sm font-semibold">History</h2>
              <span className="text-xs text-muted-foreground tabular">{items.length}</span>
            </header>
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium">No work yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create their first quote to start the pipeline.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {items.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/app/pipeline/${w.id}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={w.status} />
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {w.kind}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm">
                          {w.description || 'Untitled work item'}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Updated {timeAgo(w.updated_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular">{fmtMoney(Number(w.total || 0))}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Primary address</h2>
            </div>
            {primary ? (
              <address className="mt-3 text-sm not-italic leading-relaxed text-muted-foreground">
                {primary.line1}
                {primary.line2 ? (
                  <>
                    <br />
                    {primary.line2}
                  </>
                ) : null}
                <br />
                {[primary.city, primary.state, primary.postal_code].filter(Boolean).join(', ')}
              </address>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No address on file.
              </p>
            )}
            {addresses.length > 1 && (
              <div className="mt-3 text-xs text-muted-foreground">
                +{addresses.length - 1} more address{addresses.length - 1 === 1 ? '' : 'es'}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Details</h2>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Customer since</dt>
                <dd className="font-medium">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {new Date(customer.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              {customer.tags && Array.isArray(customer.tags) && customer.tags.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {(customer.tags as string[]).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            {customer.notes && (
              <div className="mt-4 rounded-md bg-muted/50 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </div>
                <p className="mt-1 text-xs leading-relaxed">{customer.notes}</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'good' }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular ${accent === 'good' ? 'text-emerald-600' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
