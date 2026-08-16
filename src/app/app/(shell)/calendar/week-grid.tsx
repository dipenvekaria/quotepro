'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock, Clock, ExternalLink, MapPin, User } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { dayKey, toDateTimeLocal } from '@/lib/scheduling/day'
import { formatTravel } from '@/lib/scheduling/travel'
import type { JobLeg } from '@/lib/scheduling/legs'
import { cn } from '@/lib/utils'

import { rescheduleJob } from './actions'
import type { BoardJob } from './calendar-board'

/**
 * The week, as a time grid.
 *
 * The day-column board this sits beside answers "what is on Thursday". It does
 * not answer "can I fit a three-hour job in at 2pm", which is the question a
 * contractor is actually holding the phone to ask. That needs the day drawn
 * against a clock, with each job occupying the height it will really take.
 *
 * Block height comes from `estimated_hours`, summed from the quote's own line
 * items. Every dispatch board on the market draws blocks from a duration
 * somebody typed; ours draws them from the price book, so a day that looks full
 * is full. That is the whole reason this view is worth building rather than
 * borrowing.
 */

/** 30-minute rows: fine enough to place a job, coarse enough to stay readable. */
const SLOT_MINUTES = 30
const SLOT_PX = 26

export function WeekGrid({
  days,
  jobs,
  legs = {},
  canReschedule,
  dayStartHour,
  dayEndHour,
}: {
  days: { date: string }[]
  jobs: BoardJob[]
  /** Drive from the previous job, keyed by the job it arrives at. */
  legs?: Record<string, JobLeg>
  canReschedule: boolean
  /** Business hours, so the grid shows the working day rather than midnight. */
  dayStartHour: number
  dayEndHour: number
}) {
  const router = useRouter()
  const [dragging, setDragging] = useState<BoardJob | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [moved, setMoved] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<BoardJob | null>(null)
  const [, startMove] = useTransition()
  // A drag must not also register as a click, or every move opens the dialog.
  const draggedRef = useRef(false)

  const startMin = dayStartHour * 60
  const endMin = dayEndHour * 60
  const slots = Math.max(1, Math.round((endMin - startMin) / SLOT_MINUTES))

  /** Where a job actually is, honouring an optimistic move. */
  function startOf(job: BoardJob): Date {
    return new Date(moved[job.id] ?? job.scheduled_start)
  }

  const columns = useMemo(
    () =>
      days.map((d) => {
        const date = new Date(d.date)
        const key = dayKey(date)
        return {
          key,
          date,
          jobs: jobs
            .filter((j) => dayKey(startOf(j)) === key)
            .sort((a, b) => startOf(a).getTime() - startOf(b).getTime()),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, jobs, moved],
  )

  /**
   * One reschedule path, reached by dragging and by the date field in the job
   * dialog. WCAG 2.2 SC 2.5.7 requires a single-pointer alternative to any
   * dragging movement, and this was drag-only — which also excluded anyone
   * holding a phone one-handed in a truck.
   */
  const applyReschedule = useCallback(
    (job: BoardJob, next: Date, onDone?: () => void) => {
      if (!canReschedule) return
      const previous = moved[job.id] ?? job.scheduled_start
      if (new Date(previous).getTime() === next.getTime()) {
        onDone?.()
        return
      }

      setMoved((m) => ({ ...m, [job.id]: next.toISOString() }))
      onDone?.()

      startMove(async () => {
        const res = await rescheduleJob({ id: job.id, scheduled_start: next.toISOString() })
        if (!res.ok) {
          setMoved((m) => ({ ...m, [job.id]: previous }))
          toast.error(res.error)
          return
        }
        toast.success(
          `Moved to ${next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        )
        router.refresh()
      })
    },
    [canReschedule, moved, router],
  )

  function drop(day: Date, slotIndex: number) {
    const job = dragging
    setDragging(null)
    setHovered(null)
    if (!job || !canReschedule) return

    const next = new Date(day)
    const minutes = startMin + slotIndex * SLOT_MINUTES
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
    applyReschedule(job, next)
  }

  const hourRows = Array.from({ length: Math.ceil((endMin - startMin) / 60) }, (_, i) => dayStartHour + i)

  return (
    <>
      {/* Horizontal scroll is correct here: seven columns against a clock cannot
          compress to 375px, and squeezing them makes both axes unreadable. */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border/70 bg-card">
        <div className="min-w-[720px]">
          {/* Day headings */}
          <div
            className="sticky top-0 z-20 grid border-b border-border/70 bg-card"
            style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            <div />
            {columns.map((c) => {
              const isToday = c.key === dayKey(new Date())
              return (
                <div key={c.key} className="border-l border-border/60 px-2 py-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {c.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div
                    className={cn(
                      'text-sm font-medium tabular',
                      isToday && 'text-primary',
                    )}
                  >
                    {c.date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="relative grid"
            style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {/* Hour gutter */}
            <div>
              {hourRows.map((h) => (
                <div
                  key={h}
                  style={{ height: (60 / SLOT_MINUTES) * SLOT_PX }}
                  className="relative border-b border-border/40 pr-2 text-right"
                >
                  <span className="absolute -top-2 right-2 text-[10px] tabular text-muted-foreground">
                    {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                  </span>
                </div>
              ))}
            </div>

            {columns.map((col) => (
              <div key={col.key} className="relative border-l border-border/60">
                {/* Drop targets, one per slot */}
                {Array.from({ length: slots }, (_, i) => {
                  const id = `${col.key}:${i}`
                  return (
                    <div
                      key={i}
                      style={{ height: SLOT_PX }}
                      onDragOver={(e) => {
                        if (!canReschedule || !dragging) return
                        e.preventDefault()
                        setHovered(id)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        drop(col.date, i)
                      }}
                      className={cn(
                        'border-b',
                        i % 2 === 1 ? 'border-border/40' : 'border-transparent',
                        hovered === id && 'bg-primary/10',
                      )}
                    />
                  )
                })}

                {/* Jobs, positioned against the clock */}
                {col.jobs.map((job) => {
                  const s = startOf(job)
                  const offsetMin = s.getHours() * 60 + s.getMinutes() - startMin
                  const hours = job.estimated_hours ?? 1
                  const top = (offsetMin / SLOT_MINUTES) * SLOT_PX
                  const height = Math.max(SLOT_PX, (hours * 60 / SLOT_MINUTES) * SLOT_PX)
                  if (offsetMin < 0 || offsetMin > endMin - startMin) return null

                  return (
                    <button
                      key={job.id}
                      type="button"
                      draggable={canReschedule}
                      onDragStart={() => {
                        draggedRef.current = true
                        setDragging(job)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setHovered(null)
                        // Cleared on a timeout so the click that follows a drop
                        // is swallowed, not the next genuine click.
                        setTimeout(() => (draggedRef.current = false), 0)
                      }}
                      onClick={() => {
                        if (draggedRef.current) return
                        setOpen(job)
                      }}
                      style={{ top, height }}
                      className={cn(
                        'absolute inset-x-1 overflow-hidden rounded-md border border-primary/30 bg-primary/10 px-1.5 py-1 text-left transition-colors hover:bg-primary/20',
                        canReschedule && 'cursor-grab active:cursor-grabbing',
                        dragging?.id === job.id && 'opacity-40',
                        // The whole reason drive times are here: this job cannot
                        // be reached from the previous one in the gap available.
                        legs[job.id]?.impossible && 'border-destructive/60 bg-destructive/10',
                      )}
                    >
                      {legs[job.id] && (
                        /*
                          Drive from the previous job, on the block it arrives
                          at rather than floating between two — a label between
                          blocks has nowhere to live when they are adjacent, and
                          this reads as a property of arriving here.
                        */
                        <div
                          className={cn(
                            'truncate text-[10px] leading-tight',
                            legs[job.id].impossible
                              ? 'font-medium text-destructive'
                              : 'text-muted-foreground',
                          )}
                        >
                          {legs[job.id].impossible
                            ? `${formatTravel(legs[job.id].travel.seconds)} drive — won't make it`
                            : `${formatTravel(legs[job.id].travel.seconds)} drive`}
                        </div>
                      )}
                      <div className="truncate text-[11px] font-medium leading-tight">
                        {job.customer_name ?? 'Job'}
                      </div>
                      <div className="truncate text-[10px] leading-tight text-muted-foreground">
                        {s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {job.estimated_hours ? ` · ${job.estimated_hours}h` : ''}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <JobDialog
        job={open}
        canReschedule={canReschedule}
        onReschedule={applyReschedule}
        onClose={() => setOpen(null)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------

/** What you need before deciding whether to move a job or ring the customer. */
function JobDialog({
  job,
  canReschedule,
  onReschedule,
  onClose,
}: {
  job: BoardJob | null
  canReschedule: boolean
  onReschedule: (job: BoardJob, next: Date, onDone?: () => void) => void
  onClose: () => void
}) {
  if (!job) return null
  const start = new Date(job.scheduled_start)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{job.customer_name ?? 'Job'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <StatusBadge status={job.status as Parameters<typeof StatusBadge>[0]['status']} />

          <dl className="space-y-2 text-sm">
            <Row icon={<Clock className="h-3.5 w-3.5" />}>
              {start.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {job.estimated_hours ? ` · ${job.estimated_hours}h` : ''}
            </Row>
            {job.place && <Row icon={<MapPin className="h-3.5 w-3.5" />}>{job.place}</Row>}
            <Row icon={<User className="h-3.5 w-3.5" />}>
              ${Number(job.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Row>
          </dl>

          {canReschedule && (
            <RescheduleField job={job} start={start} onReschedule={onReschedule} onClose={onClose} />
          )}

          <Link
            href={`/app/pipeline/${job.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Open job <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}

/**
 * Rescheduling without dragging.
 *
 * WCAG 2.2 SC 2.5.7 (Dragging Movements, AA) requires a single-pointer path to
 * anything achievable by dragging. Until this existed, moving a job required a
 * press-drag-release across a seven-column grid — impossible with a keyboard,
 * hard with a tremor, and unpleasant on a phone held one-handed.
 *
 * A native datetime-local control on purpose: iOS and Android render their own
 * wheel pickers, which are already accessible and already familiar, and it is
 * keyboard-operable for free.
 */
function RescheduleField({
  job,
  start,
  onReschedule,
  onClose,
}: {
  job: BoardJob
  start: Date
  onReschedule: (job: BoardJob, next: Date, onDone?: () => void) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(() => toDateTimeLocal(start))
  const parsed = new Date(value)
  const valid = !Number.isNaN(parsed.getTime())
  const changed = valid && parsed.getTime() !== start.getTime()

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <label htmlFor="reschedule-at" className="flex items-center gap-1.5 text-xs font-medium">
        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
        Move this job
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="reschedule-at"
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm shadow-sm lg:h-9"
        />
        <button
          type="button"
          onClick={() => onReschedule(job, parsed, onClose)}
          disabled={!changed}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50 lg:h-9"
        >
          Move
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        The job keeps its length — the end time shifts with the start.
      </p>
    </div>
  )
}
