import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Package,
  Plug,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'

import { StatusBadge } from '@/components/shared/status-badge'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

import { SendRemindersButton } from './send-reminders-button'

// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, profile, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  const companyId = profile.company_id as string
  const fullName = (profile.profile as { full_name?: string } | null)?.full_name?.trim()
  const emailLocal = (user.email ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim()
  const rawFirst = (fullName || emailLocal || 'there').split(' ')[0]
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : 'there'
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
  const twoDaysAgo = new Date(now.getTime() - 48 * 3_600_000).toISOString()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000).toISOString()

  // Parallel fetch — 6 lightweight queries
  const [
    todaysJobsQ,
    stalledQuotesQ,
    overdueInvoicesQ,
    recentActivityQ,
    metricsQ,
    stripeQ,
  ] = await Promise.all([
    supabase
      .from('work_items')
      .select('id, status, description, total, scheduled_start, customers!work_items_customer_id_fkey(name)')
      .eq('company_id', companyId)
      .gte('scheduled_start', dayStart.toISOString())
      .lt('scheduled_start', dayEnd.toISOString())
      .order('scheduled_start', { ascending: true }),
    supabase
      .from('work_items')
      .select('id, description, total, sent_at, viewed_at, customers!work_items_customer_id_fkey(name)')
      .eq('company_id', companyId)
      .eq('status', 'quote_sent')
      .lt('sent_at', twoDaysAgo)
      .order('sent_at', { ascending: true })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, invoice_number, total, amount_paid, due_date, public_token, customers(name, email)')
      .eq('company_id', companyId)
      .in('status', ['sent', 'partial', 'overdue'])
      .lt('due_date', todayIso)
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('work_items')
      .select('id, status, description, total, updated_at, customers!work_items_customer_id_fkey(name)')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('work_items')
      .select('id, status, total, sent_at, accepted_at, created_at, updated_at')
      .eq('company_id', companyId)
      .gte('created_at', sixtyDaysAgo),
    supabase
      .from('companies')
      .select('stripe_charges_enabled')
      .eq('id', companyId)
      .maybeSingle(),
  ])

  const todaysJobs = (todaysJobsQ.data ?? []) as unknown as Array<{ id: string; status: string; description: string | null; total: number; scheduled_start: string; customers: { name: string } | null }>
  const stalledQuotes = (stalledQuotesQ.data ?? []) as unknown as Array<{ id: string; description: string | null; total: number; sent_at: string; viewed_at: string | null; customers: { name: string } | null }>
  const overdueInvoices = (overdueInvoicesQ.data ?? []) as unknown as Array<{ id: string; invoice_number: string; total: number; amount_paid: number; due_date: string; public_token: string; customers: { name: string; email: string | null } | null }>
  const activity = (recentActivityQ.data ?? []) as unknown as Array<{ id: string; status: string; description: string | null; total: number; updated_at: string; customers: { name: string } | null }>
  const metrics = (metricsQ.data ?? []) as Array<{ id: string; status: string; total: number; sent_at: string | null; accepted_at: string | null; created_at: string; updated_at: string | null }>
  const stripeConnected = Boolean((stripeQ.data as { stripe_charges_enabled?: boolean } | null)?.stripe_charges_enabled)

  // KPI metrics: current 30d vs prior 30d (for trend), plus 30-day cumulative sparklines.
  const T = now.getTime()
  const d30 = T - 30 * 86_400_000
  const d60 = T - 60 * 86_400_000
  const inWin = (iso: string | null, a: number, b: number) => {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return t >= a && t < b
  }
  const isCompleted = (s: string) => s === 'job_completed'
  const isOpen = (s: string) => ['quote_sent', 'quote_accepted', 'job_scheduled', 'job_in_progress'].includes(s)

  const sentCur = metrics.filter((m) => inWin(m.sent_at, d30, T)).length
  const sentPrior = metrics.filter((m) => inWin(m.sent_at, d60, d30)).length
  const accCur = metrics.filter((m) => inWin(m.accepted_at, d30, T)).length
  const accPrior = metrics.filter((m) => inWin(m.accepted_at, d60, d30)).length
  const revCur = metrics.filter((m) => isCompleted(m.status) && inWin(m.updated_at, d30, T)).reduce((s, m) => s + Number(m.total || 0), 0)
  const revPrior = metrics.filter((m) => isCompleted(m.status) && inWin(m.updated_at, d60, d30)).reduce((s, m) => s + Number(m.total || 0), 0)

  const quotesSent = sentCur
  const quotesAccepted = accCur
  const acceptanceRate = sentCur > 0 ? Math.round((accCur / sentCur) * 100) : 0
  const acceptanceRatePrior = sentPrior > 0 ? (accPrior / sentPrior) * 100 : 0
  const revenue = revCur
  const pipelineValue = metrics.filter((m) => isOpen(m.status)).reduce((s, m) => s + Number(m.total || 0), 0)

  const pctDelta = (cur: number, prior: number): number | null =>
    prior > 0 ? Math.round(((cur - prior) / prior) * 100) : null
  const quotesSentDelta = pctDelta(sentCur, sentPrior)
  const closeRateDelta = pctDelta(acceptanceRate, acceptanceRatePrior)
  const revenueDelta = pctDelta(revCur, revPrior)

  // 30-day cumulative series for the KPI sparklines.
  const dayStartMs = new Date(dayStart).getTime()
  const keyOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const dayIndex = new Map(Array.from({ length: 30 }, (_, i) => [keyOf(dayStartMs - (29 - i) * 86_400_000), i] as const))
  const sentPerDay = new Array(30).fill(0)
  const accPerDay = new Array(30).fill(0)
  const revPerDay = new Array(30).fill(0)
  const pipePerDay = new Array(30).fill(0)
  for (const m of metrics) {
    if (m.sent_at) {
      const i = dayIndex.get(m.sent_at.slice(0, 10))
      if (i !== undefined) { sentPerDay[i] += 1; pipePerDay[i] += Number(m.total || 0) }
    }
    if (m.accepted_at) {
      const i = dayIndex.get(m.accepted_at.slice(0, 10))
      if (i !== undefined) accPerDay[i] += 1
    }
    if (isCompleted(m.status) && m.updated_at) {
      const i = dayIndex.get(m.updated_at.slice(0, 10))
      if (i !== undefined) revPerDay[i] += Number(m.total || 0)
    }
  }
  let cSent = 0, cAcc = 0, cRev = 0, cPipe = 0
  const sentSeries: number[] = []
  const rateSeries: number[] = []
  const revSeries: number[] = []
  const pipeSeries: number[] = []
  for (let i = 0; i < 30; i++) {
    cSent += sentPerDay[i]; cAcc += accPerDay[i]; cRev += revPerDay[i]; cPipe += pipePerDay[i]
    sentSeries.push(cSent)
    rateSeries.push(cSent > 0 ? Math.round((cAcc / cSent) * 100) : 0)
    revSeries.push(cRev)
    pipeSeries.push(cPipe)
  }

  const showSetupChecklist = !stripeConnected

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Greeting */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs text-muted-foreground">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Good {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summaryLine(todaysJobs.length, stalledQuotes.length, overdueInvoices.length)}
          </p>
        </div>
      </header>

      {/* Setup checklist (only when stripe not connected) */}
      {showSetupChecklist && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Finish setting up</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A few one-time steps to start collecting online payments.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/app/integrations"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-background px-3 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  <Plug className="h-3 w-3" />
                  Connect Stripe
                </Link>
                <Link
                  href="/app/catalog"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
                >
                  <Package className="h-3 w-3" />
                  Add catalog items
                </Link>
                <Link
                  href="/app/settings"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
                >
                  <Users className="h-3 w-3" />
                  Invite team
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          icon={FileText}
          label="Quotes sent"
          value={quotesSent.toString()}
          hint={`${quotesAccepted} accepted (30d)`}
          delta={quotesSentDelta}
          series={sentSeries}
        />
        <Kpi
          icon={TrendingUp}
          label="Close rate"
          value={`${acceptanceRate}%`}
          hint={acceptanceRate >= 40 ? 'On target' : 'Room to grow'}
          accent={acceptanceRate >= 40 ? 'good' : undefined}
          delta={closeRateDelta}
          series={rateSeries}
        />
        <Kpi
          icon={CreditCard}
          label="Revenue"
          value={fmtCompact(revenue)}
          hint="Last 30 days"
          delta={revenueDelta}
          series={revSeries}
        />
        <Kpi
          icon={Zap}
          label="Pipeline"
          value={fmtCompact(pipelineValue)}
          hint="Open + in progress"
          series={pipeSeries}
        />
      </div>

      {/* Priority zones */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Today's schedule */}
        <Zone
          icon={Calendar}
          title="Today's schedule"
          count={todaysJobs.length}
          linkHref="/app/calendar"
          linkLabel="Calendar"
        >
          {todaysJobs.length === 0 ? (
            <EmptyRow
              icon={Calendar}
              title="Nothing scheduled today"
              hint="Won quotes with a start time show up here."
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {todaysJobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/app/pipeline/${j.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                    <div className="min-w-[42px] rounded-md bg-primary/10 px-2 py-1 text-center">
                      <div className="text-[9px] font-medium uppercase text-primary">
                        {new Date(j.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric' })}
                      </div>
                      <div className="text-xs font-semibold tabular text-primary">
                        {new Date(j.scheduled_start).getMinutes().toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {j.customers?.name ?? 'Customer'}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {j.description ?? 'Scheduled work'}
                      </div>
                    </div>
                    <StatusBadge status={j.status as Parameters<typeof StatusBadge>[0]['status']} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Zone>

        {/* Stalled quotes (AI nudge) */}
        <Zone
          icon={Sparkles}
          title="AI nudges"
          count={stalledQuotes.length}
          tone={stalledQuotes.length > 0 ? 'warn' : 'default'}
          linkHref="/app/pipeline"
          linkLabel="Pipeline"
        >
          {stalledQuotes.length === 0 ? (
            <EmptyRow
              icon={CheckCircle2}
              title="No stalled quotes"
              hint="Sent quotes older than 48h will show up here."
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {stalledQuotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/app/pipeline/${q.id}`} className="block px-4 py-2.5 hover:bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">{q.customers?.name ?? 'Customer'}</div>
                      <div className="text-xs font-semibold tabular">{fmtMoney(q.total)}</div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Sent {daysAgo(q.sent_at)} ago
                      {q.viewed_at ? (
                        <>
                          <span>·</span>
                          <Eye className="h-3 w-3" />
                          Viewed {daysAgo(q.viewed_at)} ago
                        </>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-300">· Not viewed yet</span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-primary">
                      <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                      {q.viewed_at
                        ? 'Follow up — they saw it but haven\'t decided.'
                        : 'Nudge — a quick call often reopens interest.'}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Zone>

        {/* Overdue invoices */}
        <Zone
          icon={AlertCircle}
          title="Overdue invoices"
          count={overdueInvoices.length}
          tone={overdueInvoices.length > 0 ? 'danger' : 'default'}
          linkHref="/app/pipeline"
          linkLabel="Pipeline"
        >
          {overdueInvoices.length === 0 ? (
            <EmptyRow
              icon={CheckCircle2}
              title="No overdue invoices"
              hint="Nice — customers are paying on time."
            />
          ) : (
            <>
              <ul className="divide-y divide-border/70">
                {overdueInvoices.map((i) => {
                  const due = Math.max(0, Number(i.total) - Number(i.amount_paid ?? 0))
                  return (
                    <li key={i.id}>
                      <Link
                        href={`/i/${i.public_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-4 py-2.5 hover:bg-muted/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium">
                            {i.customers?.name ?? 'Customer'}
                          </div>
                          <div className="text-xs font-semibold tabular text-destructive">
                            {fmtMoney(due)}
                          </div>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="tabular">{i.invoice_number}</span>
                          <span>·</span>
                          <span className="text-destructive">
                            Due {daysAgo(i.due_date)} ago
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <div className="border-t border-border/70 p-3">
                <SendRemindersButton />
              </div>
            </>
          )}
        </Zone>
      </div>

      {/* Recent activity */}
      <section className="mt-6 rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          <Link
            href="/app/pipeline"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Pipeline <ArrowUpRight className="h-3 w-3" />
          </Link>
        </header>
        {activity.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No activity yet — create your first quote to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {activity.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/app/pipeline/${a.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(a.customers?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium">
                        {a.customers?.name ?? 'Customer'}
                      </div>
                      <StatusBadge status={a.status as Parameters<typeof StatusBadge>[0]['status']} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.description ?? 'Work item'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular">{fmtMoney(a.total)}</div>
                    <div className="text-[10px] text-muted-foreground">{daysAgo(a.updated_at)} ago</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  delta,
  series,
}: {
  icon: typeof FileText
  label: string
  value: string
  hint: string
  accent?: 'good'
  delta?: number | null
  series?: number[]
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            'grid h-6 w-6 place-items-center rounded-md',
            accent === 'good' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-xl font-semibold tabular sm:text-2xl">{value}</div>
        <TrendChip delta={delta ?? null} />
      </div>
      {series && series.length > 1 ? <Sparkline data={series} className="mt-2.5" /> : null}
      <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}

function TrendChip({ delta }: { delta: number | null }) {
  if (delta === null || !Number.isFinite(delta) || delta === 0) return null
  const up = delta > 0
  return (
    <span
      className={cn(
        'mb-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular',
        up ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600',
      )}
      title="vs. prior 30 days"
    >
      {up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {up ? '+' : ''}{delta}%
    </span>
  )
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null
  const w = 100
  const h = 26
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn('h-6 w-full text-primary', className)}
      aria-hidden="true"
    >
      <path d={area} className="fill-primary opacity-10" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Zone({
  icon: Icon,
  title,
  count,
  tone = 'default',
  linkHref,
  linkLabel,
  children,
}: {
  icon: typeof FileText
  title: string
  count: number
  tone?: 'default' | 'warn' | 'danger'
  linkHref: string
  linkLabel: string
  children: React.ReactNode
}) {
  const iconCls =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'warn'
        ? 'bg-amber-500/10 text-amber-600'
        : 'bg-primary/10 text-primary'
  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn('grid h-6 w-6 place-items-center rounded-md', iconCls)}>
            <Icon className="h-3 w-3" />
          </div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
            {count}
          </span>
        </div>
        <Link
          href={linkHref}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          {linkLabel}
        </Link>
      </header>
      {children}
    </section>
  )
}

function EmptyRow({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof FileText
  title: string
  hint: string
}) {
  return (
    <div className="px-4 py-8 text-center">
      <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
      <div className="mt-2 text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'evening'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function summaryLine(jobs: number, stalled: number, overdue: number): string {
  const bits: string[] = []
  if (jobs > 0) bits.push(`${jobs} job${jobs === 1 ? '' : 's'} scheduled`)
  if (stalled > 0) bits.push(`${stalled} quote${stalled === 1 ? '' : 's'} stalled`)
  if (overdue > 0) bits.push(`${overdue} overdue invoice${overdue === 1 ? '' : 's'}`)
  if (bits.length === 0) return 'A quiet day — good time to prospect.'
  return bits.join(' · ')
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}k`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function daysAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86_400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86_400)}d`
}
