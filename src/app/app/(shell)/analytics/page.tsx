import { redirect } from 'next/navigation'
import { ArrowUpRight, DollarSign, FileText, Sparkles, TrendingUp, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString()

  const [{ data: items30 }, { data: items90 }, { count: customerCount }, { data: recentSent }] =
    await Promise.all([
      supabase
        .from('work_items')
        .select('id, kind, status, total, created_at, sent_at, accepted_at, users!work_items_created_by_fkey(email, profile)')
        .eq('company_id', profile.company_id)
        .gte('created_at', since30),
      supabase
        .from('work_items')
        .select('id, status, total, created_at')
        .eq('company_id', profile.company_id)
        .gte('created_at', since90),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', profile.company_id),
      supabase
        .from('work_items')
        .select('id, total, sent_at, users!work_items_created_by_fkey(email, profile)')
        .eq('company_id', profile.company_id)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(20),
    ])

  const list30 = items30 ?? []
  const list90 = items90 ?? []

  const quotesSent30 = list30.filter((w) => w.sent_at).length
  const quotesAccepted30 = list30.filter((w) => w.accepted_at).length
  const acceptanceRate = quotesSent30 > 0 ? (quotesAccepted30 / quotesSent30) * 100 : 0
  const revenue30 = list30
    .filter((w) => w.status === 'invoice_paid' || w.status === 'job_complete')
    .reduce((s, w) => s + Number(w.total || 0), 0)
  const pipelineValue = list30
    .filter((w) => ['quote_sent', 'quote_accepted', 'job_scheduled', 'job_in_progress'].includes(w.status as string))
    .reduce((s, w) => s + Number(w.total || 0), 0)

  // Group by week for a mini trend
  const weeks = new Map<string, { count: number; revenue: number }>()
  for (const w of list90) {
    const d = new Date(w.created_at)
    const key = `${d.getFullYear()}-W${Math.floor((d.getDate() - 1) / 7) + 1}-${d.getMonth() + 1}`
    const entry = weeks.get(key) ?? { count: 0, revenue: 0 }
    entry.count += 1
    entry.revenue += Number(w.total || 0)
    weeks.set(key, entry)
  }
  const weekEntries = Array.from(weeks.entries()).slice(-12)
  const maxCount = Math.max(1, ...weekEntries.map(([, v]) => v.count))

  // Rep breakdown
  const byRep = new Map<string, { name: string; sent: number; accepted: number; revenue: number }>()
  for (const w of list30) {
    const rep = (w as { users?: { email?: string; profile?: { full_name?: string } } }).users
    const name = rep?.profile?.full_name || rep?.email || 'Unknown'
    const entry = byRep.get(name) ?? { name, sent: 0, accepted: 0, revenue: 0 }
    if (w.sent_at) entry.sent += 1
    if (w.accepted_at) {
      entry.accepted += 1
      entry.revenue += Number(w.total || 0)
    }
    byRep.set(name, entry)
  }
  const repList = Array.from(byRep.values())
    .filter((r) => r.sent > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header>
        <div className="text-xs text-muted-foreground">Workspace</div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Last 30 days</p>
      </header>

      {/* Top-line KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={FileText}
          label="Quotes sent"
          value={quotesSent30.toString()}
          hint={`${quotesAccepted30} accepted`}
        />
        <Kpi
          icon={TrendingUp}
          label="Acceptance rate"
          value={`${acceptanceRate.toFixed(1)}%`}
          hint="Sent → accepted"
          accent={acceptanceRate >= 40 ? 'good' : 'neutral'}
        />
        <Kpi
          icon={DollarSign}
          label="Revenue"
          value={fmtMoney(revenue30)}
          hint="Paid + jobs done"
        />
        <Kpi
          icon={Users}
          label="Customers"
          value={(customerCount ?? 0).toString()}
          hint="All-time active"
        />
      </div>

      {/* Trend + pipeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card shadow-sm lg:col-span-2">
          <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
            <h2 className="text-sm font-semibold">Weekly quote volume</h2>
            <span className="text-xs text-muted-foreground">Last 12 weeks</span>
          </header>
          <div className="flex h-56 items-end gap-2 px-5 py-4">
            {weekEntries.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                Not enough data yet.
              </div>
            ) : (
              weekEntries.map(([label, entry]) => (
                <div key={label} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary/30 to-primary/60 transition-all group-hover:from-primary/50 group-hover:to-primary"
                      style={{ height: `${(entry.count / maxCount) * 100}%`, minHeight: entry.count ? '4px' : 0 }}
                    />
                  </div>
                  <div className="text-[10px] tabular text-muted-foreground">{entry.count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card shadow-sm">
          <header className="border-b border-border/70 px-5 py-3.5">
            <h2 className="text-sm font-semibold">Open pipeline</h2>
          </header>
          <div className="p-5">
            <div className="text-3xl font-semibold tabular">{fmtMoney(pipelineValue)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Quote-sent + won + in-progress</div>
            <div className="mt-4 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">AI insight</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {acceptanceRate >= 40
                  ? `Strong ${acceptanceRate.toFixed(0)}% acceptance rate — consider raising average ticket size.`
                  : `Acceptance is ${acceptanceRate.toFixed(0)}%. Test faster response times or lower upfront quotes.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rep leaderboard */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Team leaderboard</h2>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </header>
        {repList.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No quote-sending activity yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/70 bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Rep</th>
                <th className="px-5 py-2.5 text-right font-medium">Sent</th>
                <th className="px-5 py-2.5 text-right font-medium">Accepted</th>
                <th className="px-5 py-2.5 text-right font-medium">Close rate</th>
                <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {repList.map((r) => (
                <tr key={r.name} className="hover:bg-muted/20">
                  <td className="px-5 py-3 font-medium">{r.name}</td>
                  <td className="px-5 py-3 text-right tabular">{r.sent}</td>
                  <td className="px-5 py-3 text-right tabular">{r.accepted}</td>
                  <td className="px-5 py-3 text-right tabular">
                    {r.sent > 0 ? `${Math.round((r.accepted / r.sent) * 100)}%` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular">{fmtMoney(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent sends */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Recently sent quotes</h2>
          <a href="/app/pipeline" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Open pipeline <ArrowUpRight className="h-3 w-3" />
          </a>
        </header>
        {(recentSent ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No sent quotes in the window.
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {(recentSent ?? []).slice(0, 10).map((r) => {
              const rep = (r as { users?: { email?: string; profile?: { full_name?: string } } }).users
              return (
                <li key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">
                      Sent by {rep?.profile?.full_name || rep?.email || 'unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.sent_at as string).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular">{fmtMoney(Number(r.total || 0))}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
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
}: {
  icon: typeof FileText
  label: string
  value: string
  hint: string
  accent?: 'good' | 'neutral'
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`grid h-7 w-7 place-items-center rounded-md ${
            accent === 'good' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
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
