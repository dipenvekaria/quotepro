import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { CalendarBoard, type BoardJob } from './calendar-board'
import { workItemScope, canAssignWork } from '@/lib/auth/scope'
import type { UserRole } from '@/lib/permissions'
import { query } from '@/lib/db'
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
    estimated_hours: number | null
    customer_name: string | null
    address: string | null
    city: string | null
    state: string | null
  }>(
    `select w.id, w.status, w.scheduled_start, w.total, w.estimated_hours,
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

  // Only the instants. Day keys are derived in the browser, because the
  // server's timezone is not the contractor's and two sets of keys that must
  // agree will eventually not.
  const boardDays = Array.from({ length: view === 'month' ? 42 : 7 }, (_, i) => ({
    date: addDays(rangeStart, i).toISOString(),
  }))

  const boardJobs: BoardJob[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    scheduled_start: r.scheduled_start,
    total: Number(r.total ?? 0),
    customer_name: r.customer_name,
    place: [r.city, r.state].filter(Boolean).join(', ') || r.address,
    estimated_hours: r.estimated_hours === null ? null : Number(r.estimated_hours),
  }))

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
      ) : (
        <CalendarBoard
          days={boardDays}
          jobs={boardJobs}
          canReschedule={canAssignWork(role as UserRole)}
          view={view}
        />
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


