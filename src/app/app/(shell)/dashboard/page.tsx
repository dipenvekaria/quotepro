import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Bot, FileText, Inbox, Package, Plus, Sparkles, Users, Zap } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { createClient } from '@/lib/supabase/server'

// -----------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, profile')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) redirect('/app/onboarding')
  const companyId = profile.company_id as string

  // Parallel data fetch
  const [
    { data: workItems },
    { count: customerCount },
    { count: catalogCount },
  ] = await Promise.all([
    supabase
      .from('work_items')
      .select('id, status, kind, job_name, total, created_at, customer_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('catalog_items').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
  ])

  const items = workItems ?? []
  const totalCount = items.length
  const byKind = items.reduce<Record<string, { count: number; value: number }>>((acc, i) => {
    const k = i.kind ?? 'unknown'
    acc[k] ??= { count: 0, value: 0 }
    acc[k].count += 1
    acc[k].value += Number(i.total ?? 0)
    return acc
  }, {})

  const openInvoicesValue = items
    .filter((i) => i.status === 'job_completed')
    .reduce((s, i) => s + Number(i.total ?? 0), 0)

  const recent = items.slice(0, 6)

  const firstName = String((profile.profile as { first_name?: string })?.first_name ?? '')
  const greetingName = firstName || (user.email ?? '').split('@')[0]

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-foreground">Home</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {greeting()}, {greetingName || 'there'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening in your workspace today.
          </p>
        </div>
        <Link
          href="/app/quotes/new"
          className="hidden items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          New quote
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total work items" value={String(totalCount)} accent="primary" />
        <StatCard label="Leads open" value={String(byKind.lead?.count ?? 0)} accent="sky" />
        <StatCard label="Quotes value" value={fmtMoney(byKind.quote?.value ?? 0)} accent="violet" />
        <StatCard label="Outstanding" value={fmtMoney(openInvoicesValue)} accent="amber" />
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Recent work items */}
        <section className="rounded-xl border border-border/70 bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Recent activity</h2>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
                {totalCount}
              </span>
            </div>
            <Link
              href="/app/pipeline"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Open pipeline →
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                icon={Inbox}
                title="No work items yet"
                description="Create your first lead or quote to get started."
                action={
                  <Link
                    href="/app/quotes/new"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    <Plus className="h-3.5 w-3.5" /> New quote
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {recent.map((wi) => (
                <li key={wi.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {wi.job_name || 'Untitled work item'}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtDate(wi.created_at)}</span>
                      {wi.total ? (
                        <>
                          <span>·</span>
                          <span className="tabular font-medium text-foreground/80">
                            {fmtMoney(Number(wi.total))}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={wi.status as never} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-8">
          <AiCard />
          <QuickActions customerCount={customerCount ?? 0} catalogCount={catalogCount ?? 0} />
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Bits
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'primary' | 'sky' | 'violet' | 'amber' | 'emerald'
}) {
  const dot: Record<string, string> = {
    primary: 'bg-primary',
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  }
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${dot[accent]}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</div>
    </div>
  )
}

function AiCard() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5 shadow-sm">
      <div className="absolute inset-0 bg-dots opacity-30" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Ask QuoteBuilder</div>
            <div className="text-xs text-muted-foreground">Powered by Gemini · grounded on your catalog</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">
          Describe a job in plain English and get a professional quote with line items in seconds.
        </p>
        <Link
          href="/app/quotes/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Sparkles className="h-3 w-3" />
          Generate a quote
        </Link>
      </div>
    </section>
  )
}

function QuickActions({ customerCount, catalogCount }: { customerCount: number; catalogCount: number }) {
  const items = [
    { href: '/app/quotes/new', icon: Zap, label: 'New quote', desc: 'AI-drafted from a description' },
    { href: '/app/customers', icon: Users, label: 'Customers', desc: `${customerCount} in your book` },
    { href: '/app/catalog', icon: Package, label: 'Catalog', desc: `${catalogCount} pricing items` },
  ]

  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="border-b border-border/70 px-5 py-3.5">
        <h2 className="text-base font-semibold">Quick actions</h2>
      </header>
      <ul className="divide-y divide-border/70">
        {items.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className="group flex items-center gap-3 px-5 py-3 hover:bg-muted/40"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                <a.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
