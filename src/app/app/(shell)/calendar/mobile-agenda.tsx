import Link from 'next/link'
import { ChevronRight, TriangleAlert } from 'lucide-react'

import { zonedDayKey } from '@/lib/time'
import { formatTravel } from '@/lib/scheduling/travel-format'
import type { JobLeg } from '@/lib/scheduling/legs'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import type { BoardJob } from './calendar-board'

/**
 * The phone calendar: a day-by-day agenda instead of a shrunken grid.
 *
 * The week grid is an hour×day matrix, and at 375px a seventh of the screen
 * per day means every job is a sliver — desktop furniture pretending to be a
 * phone screen. What a tech actually asks their phone is "what's next and
 * where", which is a list: today's jobs in order, with the time, the customer,
 * the place, and the drive between stops. Tap through to the job itself.
 *
 * Server component on purpose — day keys and time labels are all derived in
 * the company timezone here, so there is nothing to hydrate and no UTC server
 * repainting 7pm jobs onto the wrong day.
 */

const dayLabel = (d: Date, tz: string) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz })

const timeLabel = (iso: string, tz: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })

export function MobileAgenda({
  tz,
  days,
  jobs,
  legs = {},
}: {
  tz: string
  days: { date: string }[]
  jobs: BoardJob[]
  legs?: Record<string, JobLeg>
}) {
  const byDay = new Map<string, BoardJob[]>()
  for (const j of jobs) {
    const key = zonedDayKey(new Date(j.scheduled_start), tz)
    byDay.set(key, [...(byDay.get(key) ?? []), j])
  }
  for (const list of byDay.values())
    list.sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))

  const todayKey = zonedDayKey(new Date(), tz)
  // A week shows every day, quiet ones included — the gap is information. A
  // month as 30 mostly-empty rows is noise, so there only booked days render.
  const showEmpty = days.length <= 7

  const visible = days.filter((d) => {
    const key = zonedDayKey(new Date(d.date), tz)
    return showEmpty || (byDay.get(key)?.length ?? 0) > 0
  })

  return (
    <div className="space-y-5">
      {visible.map((d) => {
        const date = new Date(d.date)
        const key = zonedDayKey(date, tz)
        const dayJobs = byDay.get(key) ?? []
        const hours = dayJobs.reduce((s, j) => s + (j.estimated_hours ?? 0), 0)
        const isToday = key === todayKey

        return (
          <section key={key}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {dayLabel(date, tz)}
                {isToday && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Today
                  </span>
                )}
              </h2>
              {dayJobs.length > 0 && (
                <span className="text-xs tabular text-muted-foreground">
                  {dayJobs.length} job{dayJobs.length === 1 ? '' : 's'}
                  {hours > 0 && ` · ${hours % 1 === 0 ? hours : hours.toFixed(1)}h`}
                </span>
              )}
            </div>

            {dayJobs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-xs text-muted-foreground">
                Nothing scheduled
              </p>
            ) : (
              <ol className="space-y-2">
                {dayJobs.map((job) => {
                  const leg = legs[job.id]
                  return (
                    <li key={job.id}>
                      {leg && (
                        <p
                          className={cn(
                            'mb-1 flex items-center gap-1.5 pl-3 text-[11px]',
                            leg.impossible
                              ? 'font-medium text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground',
                          )}
                        >
                          {leg.impossible && <TriangleAlert className="h-3 w-3" />}
                          {formatTravel(leg.travel.seconds)} drive
                          {leg.impossible && " — won't make it"}
                        </p>
                      )}
                      <Link
                        href={`/app/pipeline/${job.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-border"
                      >
                        <div className="w-14 shrink-0 text-right">
                          <div
                            className={cn(
                              'text-sm font-semibold tabular',
                              isToday && 'text-primary',
                            )}
                          >
                            {timeLabel(job.scheduled_start, tz).replace(/ (AM|PM)/, '')}
                          </div>
                          <div className="text-[10px] uppercase text-muted-foreground">
                            {/ PM$/.test(timeLabel(job.scheduled_start, tz)) ? 'pm' : 'am'}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {job.customer_name ?? 'No customer'}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {job.place && <span className="truncate">{job.place}</span>}
                            <StatusBadge
                              status={job.status as Parameters<typeof StatusBadge>[0]['status']}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold tabular">
                            ${Number(job.total).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </div>
                          {job.estimated_hours != null && job.estimated_hours > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              {job.estimated_hours % 1 === 0
                                ? job.estimated_hours
                                : job.estimated_hours.toFixed(1)}
                              h
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      </Link>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )
      })}
      {visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing scheduled this month
        </p>
      )}
    </div>
  )
}
