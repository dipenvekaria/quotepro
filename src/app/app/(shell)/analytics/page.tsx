import { notFound } from 'next/navigation'

import Link from 'next/link'
import { ArrowUpRight, DollarSign, FileText, Sparkles, TrendingUp, Users } from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { canSeeAnalytics } from '@/lib/auth/scope'
import type { UserRole } from '@/lib/permissions'
import { query } from '@/lib/db'

// ---------------------------------------------------------------------------

export default async function AnalyticsPage() {
  const { companyId, role } = await requireSession()

  // Revenue, close rate and pipeline value are the owner's numbers.
  if (!canSeeAnalytics(role as UserRole)) notFound()

  // Server Component: this runs once per request on the server, not during a
  // client render, so the purity rule does not apply.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const since30 = new Date(now - 30 * 86_400_000).toISOString()
  const WEEKS = 12
  const since12w = new Date(now - WEEKS * 7 * 86_400_000).toISOString()

  const [sentRows, openItems, customerCountRows, recentSentRows] = await Promise.all([
    query<{
      id: string
      status: string
      total: number
      sent_at: string | null
      accepted_at: string | null
      updated_at: string | null
      rep_profile: Record<string, unknown> | null
    }>(
      `select w.id, w.status, w.total, w.sent_at, w.accepted_at, w.updated_at, u.profile as rep_profile
         from work_items w
         left join users u on u.id = w.created_by
        where w.company_id = $1 and w.sent_at is not null and w.sent_at >= $2`,
      [companyId, since12w],
    ),
    query<{ id: string; status: string; total: number }>(
      `select id, status, total
         from work_items
        where company_id = $1 and status::text = any($2::text[])`,
      [companyId, ['quote_sent', 'quote_accepted', 'job_scheduled', 'job_in_progress']],
    ),
    query<{ count: number }>(
      `select count(*)::int as count from customers where company_id = $1`,
      [companyId],
    ),
    query<{
      id: string
      total: number
      sent_at: string | null
      rep_profile: Record<string, unknown> | null
    }>(
      `select w.id, w.total, w.sent_at, u.profile as rep_profile
         from work_items w
         left join users u on u.id = w.created_by
        where w.company_id = $1 and w.sent_at is not null
        order by w.sent_at desc
        limit 20`,
      [companyId],
    ),
  ])

  const sent = sentRows.map((r) => ({
    id: r.id,
    status: r.status,
    total: r.total,
    sent_at: r.sent_at,
    accepted_at: r.accepted_at,
    updated_at: r.updated_at,
    users: r.rep_profile ? { profile: r.rep_profile } : null,
  }))
  const customerCount = customerCountRows[0]?.count ?? 0
  const recentSent = recentSentRows.map((r) => ({
    id: r.id,
    total: r.total,
    sent_at: r.sent_at,
    users: r.rep_profile ? { profile: r.rep_profile } : null,
  }))
  const inLast30 = (iso: string | null) => !!iso && new Date(iso).getTime() >= now - 30 * 86_400_000

  const sent30 = sent.filter((w) => inLast30(w.sent_at))
  const quotesSent30 = sent30.length
  const quotesAccepted30 = sent.filter((w) => inLast30(w.accepted_at)).length
  const acceptanceRate = quotesSent30 > 0 ? (quotesAccepted30 / quotesSent30) * 100 : 0
  const revenue30 = sent
    .filter((w) => w.status === 'job_completed' && inLast30(w.updated_at))
    .reduce((s, w) => s + Number(w.total || 0), 0)
  const pipelineValue = (openItems ?? []).reduce((s, w) => s + Number(w.total || 0), 0)

  // Weekly quote volume by sent date, last 12 weeks (Mon-anchored).
  const weekStartMs = (ms: number) => {
    const d = new Date(ms)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return d.getTime()
  }
  const firstBucketStart = weekStartMs(now) - (WEEKS - 1) * 7 * 86_400_000
  const weekBuckets = Array.from({ length: WEEKS }, (_, i) => ({
    start: firstBucketStart + i * 7 * 86_400_000,
    count: 0,
  }))
  for (const w of sent) {
    if (!w.sent_at) continue
    const idx = Math.round((weekStartMs(new Date(w.sent_at).getTime()) - firstBucketStart) / (7 * 86_400_000))
    if (idx >= 0 && idx < WEEKS) weekBuckets[idx].count += 1
  }
  const maxCount = Math.max(1, ...weekBuckets.map((b) => b.count))

  // Rep breakdown (sent in last 30 days)
  const byRep = new Map<string, { name: string; sent: number; accepted: number; revenue: number }>()
  for (const w of sent30) {
    const rep = (w as { users?: { profile?: { full_name?: string } } }).users
    const name = rep?.profile?.full_name || 'Team member'
    const entry = byRep.get(name) ?? { name, sent: 0, accepted: 0, revenue: 0 }
    entry.sent += 1
    if (w.accepted_at) {
      entry.accepted += 1
      entry.revenue += Number(w.total || 0)
    }
    byRep.set(name, entry)
  }
  const repList = Array.from(byRep.values())
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
            {sent.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                Not enough data yet.
              </div>
            ) : (
              weekBuckets.map((b) => (
                <div key={b.start} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary/30 to-primary/60 transition-all group-hover:from-primary/50 group-hover:to-primary"
                      style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count ? '4px' : 0 }}
                    />
                  </div>
                  <div className="text-[10px] tabular text-muted-foreground">
                    {new Date(b.start).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  </div>
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
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Insight</span>
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
          <>
            {/* Cards on a phone, table from md. Five numeric columns cannot fit
                375px, and this one was overflowing the viewport by 50px. */}
            <ul className="divide-y divide-border/70 md:hidden">
              {repList.map((r) => (
                <li key={r.name} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">{r.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular">
                      {fmtMoney(r.revenue)}
                    </span>
                  </div>
                  <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>Sent</dt>
                      <dd className="tabular text-foreground">{r.sent}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Accepted</dt>
                      <dd className="tabular text-foreground">{r.accepted}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Close rate</dt>
                      <dd className="tabular text-foreground">
                        {r.sent > 0 ? `${Math.round((r.accepted / r.sent) * 100)}%` : '—'}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <table className="hidden w-full text-sm md:table">
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
          </>
        )}
      </div>

      {/* Recent sends */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Recently sent quotes</h2>
          <Link href="/app/pipeline" className="inline-flex items-center gap-1 -my-3 py-3 lg:my-0 lg:py-0 text-xs text-primary hover:underline">
            Open pipeline <ArrowUpRight className="h-3 w-3" />
          </Link>
        </header>
        {(recentSent ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No sent quotes in the window.
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {(recentSent ?? []).slice(0, 10).map((r) => {
              const rep = (r as { users?: { profile?: { full_name?: string } } }).users
              return (
                <li key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">
                      Sent by {rep?.profile?.full_name || 'a teammate'}
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
