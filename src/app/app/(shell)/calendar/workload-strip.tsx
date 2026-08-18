'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * Who is carrying the visible range — the owner's persona switcher.
 *
 * One card per teammate: booked hours against the company's open hours, job
 * count, and a fill bar. Tapping a card filters the whole calendar to that
 * person (the existing assignee filter), so "is Marcus overloaded?" and
 * "what is Marcus doing Tuesday?" are one tap apart. The Unassigned card is
 * the allocation queue: work that is scheduled but belongs to nobody yet.
 *
 * Booked hours come from `estimated_hours`, which the quote snapshotted from
 * the price book's labour hours — the number is real, not a guess typed into
 * a dispatch screen.
 */

export type WorkloadPerson = {
  id: string
  name: string
  role: string
  jobs: number
  hours: number
  href: string
  active: boolean
}

export function WorkloadStrip({
  people,
  unassigned,
  capacityHours,
  clearHref,
}: {
  people: WorkloadPerson[]
  unassigned: { jobs: number; hours: number; href: string; active: boolean }
  /** Open business hours across the visible range — the 100% mark. */
  capacityHours: number
  clearHref: string
}) {
  if (people.length === 0) return null

  const card = (p: {
    key: string
    title: string
    sub: string
    jobs: number
    hours: number
    href: string
    active: boolean
    queue?: boolean
  }) => {
    const pct = capacityHours > 0 ? Math.min(1, p.hours / capacityHours) : 0
    const hot = capacityHours > 0 && p.hours > capacityHours
    return (
      <Link
        key={p.key}
        href={p.active ? clearHref : p.href}
        aria-pressed={p.active}
        className={cn(
          'flex min-h-11 w-40 shrink-0 snap-start flex-col justify-between rounded-xl border p-3 transition-colors',
          p.active
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-border/70 bg-card hover:border-border',
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-semibold">{p.title}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{p.sub}</span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between text-[11px] tabular">
            <span className={cn(hot && 'font-semibold text-amber-600 dark:text-amber-400')}>
              {p.hours % 1 === 0 ? p.hours : p.hours.toFixed(1)}h
              {capacityHours > 0 && (
                <span className="text-muted-foreground"> / {Math.round(capacityHours)}h</span>
              )}
            </span>
            <span className="text-muted-foreground">
              {p.jobs} job{p.jobs === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                p.queue ? 'bg-muted-foreground/40' : hot ? 'bg-amber-500' : 'bg-primary',
              )}
              style={{ width: `${Math.max(pct * 100, p.hours > 0 ? 6 : 0)}%` }}
            />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex snap-x gap-2 pb-1">
        {unassigned.jobs > 0 &&
          card({
            key: 'unassigned',
            title: 'Unassigned',
            sub: 'queue',
            jobs: unassigned.jobs,
            hours: unassigned.hours,
            href: unassigned.href,
            active: unassigned.active,
            queue: true,
          })}
        {people.map((p) =>
          card({
            key: p.id,
            title: p.name,
            sub: p.role,
            jobs: p.jobs,
            hours: p.hours,
            href: p.href,
            active: p.active,
          }),
        )}
      </div>
    </div>
  )
}
