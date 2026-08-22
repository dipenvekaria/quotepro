'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Phone } from 'lucide-react'

import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'

type Call = {
  id: string
  from_number: string | null
  started_at: string | null
  duration_seconds: number | null
  summary: string | null
  transcript: string | null
  recording_url: string | null
  work_item_id: string | null
  customer_name: string | null
  job_name: string | null
  work_status: string | null
}

export function CallRow({ call, tz }: { call: Call; tz: string }) {
  const [open, setOpen] = useState(false)
  const when = call.started_at
    ? new Date(call.started_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZone: tz,
      })
    : 'Unknown time'
  const mins = call.duration_seconds ? Math.max(1, Math.round(call.duration_seconds / 60)) : null
  const caller =
    call.customer_name ??
    call.from_number?.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') ??
    'Number withheld'

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-medium">{caller}</span>
          {call.work_status && (
            <StatusBadge status={call.work_status as never} showIcon={false} className="text-[10px]" />
          )}
        </div>
        <span className="text-xs tabular text-muted-foreground">
          {when}
          {mins ? ` · ${mins} min` : ''}
        </span>
      </div>
      {call.summary && <p className="mt-1.5 text-sm text-muted-foreground">{call.summary}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {call.work_item_id && (
          <Link
            href={`/app/pipeline/${call.work_item_id}`}
            className="text-xs font-medium underline-offset-2 hover:underline"
          >
            {call.job_name ? `Open: ${call.job_name}` : 'Open the lead'}
          </Link>
        )}
        {call.transcript && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-h-8 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            Transcript
          </button>
        )}
        {call.recording_url && (
          <a
            href={call.recording_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Recording
          </a>
        )}
      </div>
      {open && call.transcript && (
        <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-sans text-xs leading-relaxed text-muted-foreground">
          {call.transcript}
        </pre>
      )}
    </li>
  )
}
