import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'

// ---------------------------------------------------------------------------

type ScheduledJob = {
  id: string
  status: string
  scheduled_at: string
  total: number
  customers: { name: string } | null
  addresses: { line1: string | null; city: string | null; state: string | null } | null
}

// ---------------------------------------------------------------------------

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  // Week window (Mon-Sun) from ?week=YYYY-MM-DD (defaults to today)
  const params = await searchParams
  const anchor = params.week ? new Date(params.week) : new Date()
  const weekStart = startOfWeek(anchor)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data: jobs } = await supabase
    .from('work_items')
    .select(`
      id, status, scheduled_at, total,
      customers!work_items_customer_id_fkey (name),
      addresses!work_items_address_id_fkey (line1, city, state)
    `)
    .eq('company_id', profile.company_id)
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', weekStart.toISOString())
    .lt('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at', { ascending: true })

  const list = (jobs ?? []) as unknown as ScheduledJob[]

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const jobsByDay: Record<string, ScheduledJob[]> = {}
  for (const j of list) {
    const key = new Date(j.scheduled_at).toISOString().slice(0, 10)
    ;(jobsByDay[key] ??= []).push(j)
  }

  const prevWeek = new Date(weekStart)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10 lg:py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Workspace</div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Week of {fmtRange(weekStart)} · {list.length} scheduled
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 shadow-sm">
          <Link
            href={`/app/calendar?week=${prevWeek.toISOString().slice(0, 10)}`}
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/app/calendar"
            className="rounded px-3 text-xs font-medium hover:bg-muted"
            style={{ lineHeight: '32px' }}
          >
            Today
          </Link>
          <Link
            href={`/app/calendar?week=${nextWeek.toISOString().slice(0, 10)}`}
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border/70 bg-card">
          <EmptyState
            icon={Calendar}
            title="No jobs scheduled this week"
            description="Won quotes with a scheduled date will appear here. Set a schedule on a work item from its detail page."
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-7">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10)
            const dayJobs = jobsByDay[key] ?? []
            const isToday = key === new Date().toISOString().slice(0, 10)
            return (
              <div
                key={key}
                className="rounded-xl border border-border/70 bg-card shadow-sm"
              >
                <header className={`border-b border-border/70 px-3 py-2 ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-semibold tabular ${isToday ? 'text-primary' : ''}`}>
                    {d.getDate()}
                  </div>
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
                          <StatusBadge status={j.status} />
                          <span className="tabular text-[10px] text-muted-foreground">
                            {new Date(j.scheduled_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="mt-1.5 truncate text-sm font-medium">
                          {j.customers?.name ?? 'Customer'}
                        </div>
                        {j.addresses?.city ? (
                          <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">
                              {j.addresses.city}
                              {j.addresses.state ? `, ${j.addresses.state}` : ''}
                            </span>
                          </div>
                        ) : null}
                        <div className="mt-1 text-[11px] font-semibold tabular text-foreground/80">
                          {fmtMoney(j.total)}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
