'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/shared/status-badge'
import { dayKey, moveToDay } from '@/lib/scheduling/day'
import { cn } from '@/lib/utils'

import { rescheduleJob } from './actions'

export type BoardJob = {
  id: string
  status: string
  scheduled_start: string
  total: number
  customer_name: string | null
  place: string | null
  /** From the quote's own line items. Null when nothing carries hours. */
  estimated_hours: number | null
}

/**
 * The calendar, with jobs you can drag between days.
 *
 * Jobber and Housecall Pro both ship drag-and-drop, so this is parity — but
 * their blocks are sized by whatever a dispatcher typed. Ours come from
 * `estimated_hours`, summed from the quote's own line items, so a day that
 * looks full is full. That is the difference their price book cannot produce.
 *
 * Uses the HTML drag-and-drop API rather than a library: this is one drag
 * target per day, and a dependency for that would be more code than the
 * feature.
 */
export function CalendarBoard({
  days,
  jobs: allJobs,
  canReschedule,
  view,
}: {
  /** ISO timestamps for each column. Keys are derived here, not sent. */
  days: { date: string }[]
  jobs: BoardJob[]
  canReschedule: boolean
  view: 'week' | 'month'
}) {
  const router = useRouter()
  const [dragging, setDragging] = useState<BoardJob | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [pending, startMove] = useTransition()
  // Moved jobs render in their new column immediately; the server confirms after.
  const [moved, setMoved] = useState<Record<string, string>>({})

  // Every key on this board — columns and jobs alike — comes from dayKey, in
  // the browser. See src/lib/scheduling/day.ts for why that matters.
  function dayOf(job: BoardJob) {
    return moved[job.id] ?? dayKey(job.scheduled_start)
  }

  const todayKey = dayKey(new Date())

  function drop(targetDay: string) {
    const job = dragging
    setDragging(null)
    setOver(null)
    if (!job || dayOf(job) === targetDay) return

    const next = moveToDay(job.scheduled_start, targetDay)
    const previousDay = dayOf(job)
    setMoved((prev) => ({ ...prev, [job.id]: targetDay }))

    startMove(async () => {
      const res = await rescheduleJob({ id: job.id, scheduled_start: next.toISOString() })
      if (!res.ok) {
        // Put it back where it was rather than leaving the board lying.
        setMoved((prev) => ({ ...prev, [job.id]: previousDay }))
        toast.error(res.error)
        return
      }
      toast.success(`Moved to ${next.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`)
      router.refresh()
    })
  }

  // Grouped here, not on the server, so an optimistic move lands in the right
  // column before the refresh — and so columns and jobs share one clock.
  const grouped: Record<string, BoardJob[]> = {}
  for (const job of allJobs) {
    ;(grouped[dayOf(job)] ??= []).push(job)
  }
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
  }

  return (
    <div
      className={cn(
        'mt-6 grid gap-3',
        view === 'month' ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7' : 'grid-cols-1 sm:grid-cols-4 lg:grid-cols-7',
      )}
    >
      {days.map((raw) => {
        const d = new Date(raw.date)
        const key = dayKey(d)
        const day = {
          key,
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: d.getDate(),
          isToday: key === todayKey,
        }
        const jobs = grouped[day.key] ?? []
        const hours = jobs.reduce((sum, j) => sum + (j.estimated_hours ?? 0), 0)
        const isOver = over === day.key

        return (
          <div
            key={day.key}
            onDragOver={(e) => {
              if (!canReschedule || !dragging) return
              // Without this the browser refuses the drop.
              e.preventDefault()
              setOver(day.key)
            }}
            onDragLeave={() => setOver((o) => (o === day.key ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              drop(day.key)
            }}
            className={cn(
              'min-h-[9rem] rounded-xl border p-2 transition-colors',
              isOver ? 'border-primary bg-primary/5' : 'border-border/70 bg-card',
              day.isToday && !isOver && 'bg-muted/40',
              pending && 'opacity-90',
            )}
          >
            <div className="flex items-baseline justify-between px-1 pb-1.5">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {day.label}
                </div>
                <div className={cn('text-sm font-medium tabular', day.isToday && 'text-primary')}>
                  {day.dayNumber}
                </div>
              </div>
              {hours > 0 && (
                <span className="text-[10px] tabular text-muted-foreground" title="Estimated hours booked">
                  {hours}h
                </span>
              )}
            </div>

            {jobs.length === 0 ? (
              <div className="grid h-16 place-items-center text-xs text-muted-foreground">—</div>
            ) : (
              <div className="space-y-1.5">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    draggable={canReschedule}
                    onDragStart={() => setDragging(job)}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                    className={cn(
                      'rounded-lg border border-border/70 bg-background p-2 shadow-sm',
                      canReschedule && 'cursor-grab active:cursor-grabbing',
                      dragging?.id === job.id && 'opacity-40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <StatusBadge status={job.status as Parameters<typeof StatusBadge>[0]['status']} />
                      <span className="text-[10px] tabular text-muted-foreground">
                        {new Date(job.scheduled_start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <Link
                      href={`/app/pipeline/${job.id}`}
                      className="mt-1 block truncate text-xs font-medium hover:underline"
                    >
                      {job.customer_name ?? 'Job'}
                    </Link>

                    {job.place && (
                      <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{job.place}</span>
                      </div>
                    )}

                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      {job.estimated_hours ? (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {job.estimated_hours}h
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="tabular">
                        ${Number(job.total).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
