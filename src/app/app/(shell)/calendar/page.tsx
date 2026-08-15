import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { workItemScope, customerScope } from '@/lib/auth/scope'
import type { UserRole } from '@/lib/permissions'
import { query } from '@/lib/db'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------

type ScheduledJob = {
  id: string
  status: string
  scheduled_start: string
  total: number
  customers: { name: string } | null
  addresses: { address: string | null; city: string | null; state: string | null } | null
}

// ---------------------------------------------------------------------------

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; week?: string }>
}) {
  const { companyId, userId, role } = await requireSession()
  // "Only sees their own schedule" is what permissions.ts already promised.
  const scope = workItemScope({ companyId, userId, role: role as UserRole }, 3)

  // View (week | month) + anchor date from the query string.
  const params = await searchParams
  const view = params.view === 'month' ? 'month' : 'week'
  const anchor = params.date
    ? new Date(params.date)
    : params.week
      ? new Date(params.week)
      : new Date()

  // Query window: the visible week, or the full 6-week grid for a month.
  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(anchor)) : startOfWeek(anchor)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeEnd.getDate() + (view === 'month' ? 42 : 7))

  const rows = await query<{
    id: string
    status: string
    scheduled_start: string
    total: number
    customer_name: string | null
    address: string | null
    city: string | null
    state: string | null
  }>(
    `select w.id, w.status, w.scheduled_start, w.total,
            c.name as customer_name,
            a.address, a.city, a.state
       from work_items w
       left join customers c on c.id = w.customer_id
       left join customer_addresses a on a.id = w.address_id
      where w.company_id = $1
        and w.scheduled_start is not null
        and w.scheduled_start >= $2
        and w.scheduled_start < $3${scope.sql}
      order by w.scheduled_start asc`,
    [companyId, rangeStart.toISOString(), rangeEnd.toISOString(), ...scope.params],
  )

  const list: ScheduledJob[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    scheduled_start: r.scheduled_start,
    total: r.total,
    customers: r.customer_name ? { name: r.customer_name } : null,
    addresses:
      r.address || r.city || r.state
        ? { address: r.address, city: r.city, state: r.state }
        : null,
  }))

  const jobsByDay: Record<string, ScheduledJob[]> = {}
  for (const j of list) {
    const key = new Date(j.scheduled_start).toISOString().slice(0, 10)
    ;(jobsByDay[key] ??= []).push(j)
  }

  // Prev/next anchors depend on the active view.
  const prev = view === 'month' ? addMonths(anchor, -1) : addDays(startOfWeek(anchor), -7)
  const next = view === 'month' ? addMonths(anchor, 1) : addDays(startOfWeek(anchor), 7)
  const hrefFor = (d: Date, v: 'week' | 'month' = view) =>
    `/app/calendar?view=${v}&date=${d.toISOString().slice(0, 10)}`
  const title =
    view === 'month'
      ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `Week of ${fmtRange(rangeStart)}`

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Workspace</div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {title} · {list.length} scheduled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card p-0.5 shadow-sm">
            <Link
              href={hrefFor(anchor, 'week')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Week
            </Link>
            <Link
              href={hrefFor(anchor, 'month')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Month
            </Link>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 shadow-sm">
            <Link
              href={hrefFor(prev)}
              className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/app/calendar?view=${view}`}
              className="rounded px-3 text-xs font-medium hover:bg-muted"
              style={{ lineHeight: '32px' }}
            >
              Today
            </Link>
            <Link
              href={hrefFor(next)}
              className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border/70 bg-card">
          <EmptyState
            icon={Calendar}
            title={view === 'month' ? 'No jobs scheduled this month' : 'No jobs scheduled this week'}
            description="Won quotes with a scheduled date will appear here. Set a schedule on a work item from its detail page."
          />
        </div>
      ) : view === 'month' ? (
        <MonthGrid gridStart={rangeStart} month={startOfMonth(anchor).getMonth()} jobsByDay={jobsByDay} />
      ) : (
        <WeekGrid weekStart={rangeStart} jobsByDay={jobsByDay} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const day = out.getDay() // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day // shift so Monday = start
  out.setDate(out.getDate() + diff)
  return out
}

function fmtRange(start: Date): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function startOfMonth(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(1)
  return out
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(1)
  out.setMonth(out.getMonth() + n)
  return out
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

function WeekGrid({ weekStart, jobsByDay }: { weekStart: Date; jobsByDay: Record<string, ScheduledJob[]> }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayKey = new Date().toISOString().slice(0, 10)
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-7">
      {days.map((d) => {
        const key = d.toISOString().slice(0, 10)
        const dayJobs = jobsByDay[key] ?? []
        const isToday = key === todayKey
        return (
          <div key={key} className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className={cn('border-b border-border/70 px-3 py-2', isToday && 'bg-primary/5')}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={cn('text-lg font-semibold tabular', isToday && 'text-primary')}>{d.getDate()}</div>
            </header>
            <div className="space-y-1.5 p-2">
              {dayJobs.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-muted-foreground">—</div>
              ) : (
                dayJobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/app/pipeline/${j.id}`}
                    className="block rounded-md border border-border/60 bg-background p-2 text-xs hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge status={j.status as Parameters<typeof StatusBadge>[0]['status']} />
                      <span className="tabular text-[10px] text-muted-foreground">
                        {new Date(j.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1.5 truncate text-sm font-medium">{j.customers?.name ?? 'Customer'}</div>
                    {j.addresses?.city ? (
                      <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">
                          {j.addresses.city}
                          {j.addresses.state ? `, ${j.addresses.state}` : ''}
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-1 text-[11px] font-semibold tabular text-foreground/80">{fmtMoney(j.total)}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthGrid({ gridStart, month, jobsByDay }: { gridStart: Date; month: number; jobsByDay: Record<string, ScheduledJob[]> }) {
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayKey = new Date().toISOString().slice(0, 10)
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b border-border/70 bg-muted/40">
        {weekdays.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = d.toISOString().slice(0, 10)
          const inMonth = d.getMonth() === month
          const isToday = key === todayKey
          const dayJobs = jobsByDay[key] ?? []
          return (
            <div
              key={key}
              className={cn(
                'min-h-[104px] border-b border-border/60 p-1.5',
                i % 7 !== 6 && 'border-r',
                !inMonth && 'bg-muted/20',
              )}
            >
              <div
                className={cn(
                  'mb-1 grid h-6 w-6 place-items-center rounded-full text-xs tabular',
                  isToday ? 'bg-primary font-semibold text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                )}
              >
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayJobs.slice(0, 3).map((j) => (
                  <Link
                    key={j.id}
                    href={`/app/pipeline/${j.id}`}
                    className="block truncate rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                  >
                    <span className="tabular">{new Date(j.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric' })}</span>{' '}
                    {j.customers?.name ?? 'Customer'}
                  </Link>
                ))}
                {dayJobs.length > 3 ? (
                  <div className="px-1 text-[10px] text-muted-foreground">+{dayJobs.length - 3} more</div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
