import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { CalendarBoard, type BoardJob } from './calendar-board'
import { WeekGrid } from './week-grid'
import { workItemScope, canAssignWork } from '@/lib/auth/scope'
import { loadBusinessHours } from '@/lib/scheduling/availability'
import { AssigneeFilter } from '@/components/shared/assignee-filter'
import { RoleFilter } from '@/components/shared/role-filter'
import { ASSIGNABLE_ROLES } from '@/lib/team-personas'
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
  searchParams: Promise<{ view?: string; date?: string; week?: string; assignee?: string; role?: string }>
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

  // Who the board is showing. Layered on top of role scoping, so it can only
  // ever narrow what that already allows — a technician picking someone else
  // still sees nothing of theirs. Built as a single assignee now; teams and
  // units slot in here as a second predicate later.
  const assignee = typeof params.assignee === 'string' ? params.assignee : ''
  const roleParam =
    typeof params.role === 'string' && ASSIGNABLE_ROLES.includes(params.role as UserRole)
      ? params.role
      : ''

  // Two predicates, numbered after the scope params. Role filters on the
  // assignee's role rather than the job, so it joins through assigned_to.
  const filterSql = [
    assignee ? ` and w.assigned_to = $${4 + scope.params.length}` : '',
    roleParam ? ` and asg.role = $${4 + scope.params.length + (assignee ? 1 : 0)}::user_role` : '',
  ].join('')

  const team = canAssignWork(role as UserRole)
    ? await query<{
        id: string
        email: string | null
        profile: Record<string, unknown> | null
        role: string
      }>(
        `select u.id, au.email, u.profile, u.role::text as role
           from users u join auth.users au on au.id = u.id
          where u.company_id = $1 and u.is_active
          order by au.email`,
        [companyId],
      )
    : []

  // Counts drive the role dropdown, so it only ever offers a role somebody
  // actually holds.
  const roleCounts = team.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1
    return acc
  }, {})

  // Picking a role narrows the people list beside it: the two controls read as
  // one question getting more specific.
  const visibleTeam = roleParam ? team.filter((m) => m.role === roleParam) : team

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
       left join users asg on asg.id = w.assigned_to
      where w.company_id = $1
        and w.scheduled_start is not null
        and w.scheduled_start >= $2
        and w.scheduled_start < $3${scope.sql}${filterSql}
      order by w.scheduled_start asc`,
    [
      companyId,
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
      ...scope.params,
      ...(assignee ? [assignee] : []),
      ...(roleParam ? [roleParam] : []),
    ],
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

  // The grid shows the working day, not a wall of empty night. Widened by an
  // hour either side so a job booked slightly outside hours is still visible
  // rather than silently clipped.
  const hours = await loadBusinessHours(companyId)
  const openTimes = Object.values(hours).filter(Boolean) as { start: string; end: string }[]
  const hourOf = (s: string) => Number(s.split(':')[0] ?? 0)
  //
  // It also has to cover the jobs that are actually there. Clipping to business
  // hours alone drew an empty week for a company whose jobs sat at 5:36am —
  // real work, silently invisible, which reads as the calendar being broken.
  const jobHours = rows.map((r) => new Date(r.scheduled_start).getHours())
  const openStart = openTimes.length ? Math.min(...openTimes.map((h) => hourOf(h.start))) : 8
  const openEnd = openTimes.length ? Math.max(...openTimes.map((h) => hourOf(h.end))) : 17

  const gridStart = Math.max(0, Math.min(openStart, ...(jobHours.length ? jobHours : [openStart])) - 1)
  const gridEnd = Math.min(
    24,
    Math.max(openEnd, ...(jobHours.length ? jobHours.map((h) => h + 1) : [openEnd])) + 1,
  )

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
        <div className="flex flex-wrap items-center gap-2">
          <RoleFilter active={roleParam} counts={roleCounts} />
          <AssigneeFilter
            members={visibleTeam.map((m) => ({
              id: m.id,
              label:
                [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(' ') ||
                (m.email ?? 'Teammate'),
            }))}
            active={assignee}
          />
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
        <>
          {view === 'week' ? (
            <WeekGrid
              days={boardDays}
              jobs={boardJobs}
              canReschedule={canAssignWork(role as UserRole)}
              dayStartHour={gridStart}
              dayEndHour={gridEnd}
            />
          ) : (
            <CalendarBoard
              days={boardDays}
              jobs={boardJobs}
              canReschedule={canAssignWork(role as UserRole)}
              view={view}
            />
          )}
        </>
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


