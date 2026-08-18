'use client'

import {
  CalendarClock,
  CheckCircle2,
  Eye,
  FileText,
  Mail,
  Receipt,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react'

import type { TimelineEntry } from '@/lib/activity'

/**
 * What happened on this quote, oldest first — one story merging the activity
 * trail with the AI runs, so "why is this line here" and "did the customer
 * open it" have the same answer surface.
 *
 * Deliberately quiet: a vertical list, one line per event, no chips. The
 * timeline is reference material, not a dashboard.
 */

const ICON: Record<string, typeof FileText> = {
  quote_created: FileText,
  quote_sent: Mail,
  quote_viewed: Eye,
  quote_accepted: CheckCircle2,
  quote_declined: XCircle,
  job_scheduled: CalendarClock,
  invoice_created: Receipt,
  invoice_sent: Mail,
  payment_recorded: Wallet,
}

const LABEL: Record<string, string> = {
  quote_created: 'Quote created',
  quote_sent: 'Quote sent',
  quote_viewed: 'Customer opened the quote',
  quote_accepted: 'Customer accepted',
  quote_declined: 'Customer declined',
  job_scheduled: 'Job scheduled',
  invoice_created: 'Invoice created',
  invoice_sent: 'Invoice sent',
  payment_recorded: 'Payment recorded',
  quote_generation: 'AI drafted line items',
  quote_tiers: 'AI built good/better/best options',
  quote_edit: 'AI edited the quote',
}

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null

  return (
    <section aria-label="Activity">
      <h2 className="text-sm font-semibold">Activity</h2>
      <ol className="mt-3 space-y-0">
        {entries.map((e, i) => {
          const Icon = e.kind === 'ai' ? Sparkles : (ICON[e.action] ?? FileText)
          const label = LABEL[e.action] ?? e.action.replaceAll('_', ' ')
          const degraded = e.kind === 'ai' && e.detail?.status !== 'success'
          return (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {/* connecting rail */}
              {i < entries.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-6 h-full w-px bg-border"
                />
              )}
              <span
                className={`relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  degraded
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">{label}</span>
                {e.description && (
                  <span className="text-muted-foreground"> — {e.description}</span>
                )}
                {degraded && (
                  <span className="text-amber-600 dark:text-amber-400"> — failed, nothing was drafted</span>
                )}
                <div className="mt-0.5 text-xs text-muted-foreground">{when(e.at)}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
