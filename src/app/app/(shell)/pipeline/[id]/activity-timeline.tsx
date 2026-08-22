'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarClock,
  Star,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Receipt,
  Send,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import type { TimelineEntry } from '@/lib/activity'
import { Button } from '@/components/ui/button'
import { addWorkItemNote } from './actions'

/**
 * What happened on this quote, oldest first — one story merging the activity
 * trail, the AI runs, and the team's own notes, so "why is this line here",
 * "did the customer open it" and "did Sam approve the price" all have the
 * same answer surface.
 *
 * Notes are the internal channel the owner asked for: when a customer calls
 * back pushing on price, the note recording it sits in the timeline under the
 * send it responds to, and `@name` emails that teammate a link. ServiceNow
 * work notes, minus the ceremony.
 *
 * Deliberately quiet otherwise: a vertical list, one line per event, no chips.
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
  note: MessageSquare,
  review_request_sent: Star,
  recurring_job_spawned: CalendarClock,
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
  review_request_sent: 'Review request sent',
  recurring_job_spawned: 'Scheduled by the repeat rule',
  quote_generation: 'AI drafted line items',
  quote_tiers: 'AI built good/better/best options',
  quote_edit: 'AI edited the quote',
}

// Company timezone, explicitly — the server rendered this in UTC and the
// browser re-rendered it locally, so every timestamp hydrated differently and
// React regenerated the whole tree on each load.
function when(iso: string, tz: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
}

/** Note bodies with `@name` runs set off so a tag reads as a tag. */
function NoteBody({ text }: { text: string }) {
  const parts = text.split(/(@[\w.-]+)/g)
  return (
    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
      {parts.map((p, i) =>
        p.startsWith('@') ? (
          <span key={i} className="font-medium text-primary">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  )
}

export function ActivityTimeline({
  entries,
  tz,
  workItemId,
  people,
  roster = [],
  embedded = false,
}: {
  entries: TimelineEntry[]
  tz: string
  workItemId: string
  /** user id → display name, for note attribution. */
  people: Record<string, string>
  /** Teammates for the @ picker; handle is the token addNote will match. */
  roster?: { id: string; name: string; handle?: string }[]
  /** Rendered inside a collapsible card that owns the heading. */
  embedded?: boolean
}) {
  const router = useRouter()
  const [draft, setDraft] = useState('')
  const [posting, startPost] = useTransition()
  const boxRef = useRef<HTMLTextAreaElement | null>(null)
  const [mentionAt, setMentionAt] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  const candidates =
    mentionAt === null
      ? []
      : roster
          .filter((t) => t.handle)
          .filter(
            (t) =>
              mentionQuery === '' ||
              t.name.toLowerCase().includes(mentionQuery) ||
              t.handle!.includes(mentionQuery),
          )
          .slice(0, 6)

  /** Track a live "@word" immediately before the caret. */
  function syncMention(value: string, caret: number) {
    const upto = value.slice(0, caret)
    const m = /(^|\s)@([\w.-]*)$/.exec(upto)
    if (m) {
      setMentionAt(caret - m[2].length - 1)
      setMentionQuery(m[2].toLowerCase())
      setMentionIndex(0)
    } else {
      setMentionAt(null)
    }
  }

  function pickMention(t: { name: string; handle?: string }) {
    if (mentionAt === null || !t.handle || !boxRef.current) return
    const caret = boxRef.current.selectionStart ?? draft.length
    const next = `${draft.slice(0, mentionAt)}@${t.handle} ${draft.slice(caret)}`
    setDraft(next)
    setMentionAt(null)
    const pos = mentionAt + t.handle.length + 2
    requestAnimationFrame(() => {
      boxRef.current?.focus()
      boxRef.current?.setSelectionRange(pos, pos)
    })
  }

  function post() {
    const body = draft.trim()
    if (!body || posting) return
    startPost(async () => {
      const res = await addWorkItemNote({ id: workItemId, body })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setDraft('')
      if (res.data.mentioned.length > 0) {
        toast.success(`Note added — emailed ${res.data.mentioned.join(', ')}`)
      } else {
        toast.success('Note added')
      }
      router.refresh()
    })
  }

  return (
    <section aria-label="Notes and activity">
      {!embedded && <h2 className="text-sm font-semibold">Notes</h2>}
      {entries.length > 0 && (
        <ol className="mt-3 space-y-0">
          {entries.map((e, i) => {
            const Icon = e.kind === 'ai' ? Sparkles : (ICON[e.action] ?? FileText)
            const isNote = e.action === 'note'
            const label = isNote
              ? (people[e.actor] ?? 'Teammate')
              : (LABEL[e.action] ?? e.action.replaceAll('_', ' '))
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
                      : isNote
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  {isNote ? (
                    e.description && <NoteBody text={e.description} />
                  ) : (
                    e.description && (
                      <span className="text-muted-foreground"> — {e.description}</span>
                    )
                  )}
                  {degraded && (
                    <span className="text-amber-600 dark:text-amber-400"> — failed, nothing was drafted</span>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">{when(e.at, tz)}</div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Composer — team-only, like everything above it. */}
      <div className="mt-4">
        <div className="relative">
          {mentionAt !== null && candidates.length > 0 && (
            <ul
              role="listbox"
              aria-label="Mention a teammate"
              className="absolute bottom-full left-0 z-30 mb-1 w-full max-w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
            >
              {candidates.map((t, i) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === mentionIndex}
                    // mousedown so the textarea keeps focus and the caret math holds
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pickMention(t)
                    }}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm lg:min-h-9 ${
                      i === mentionIndex ? 'bg-muted' : 'hover:bg-muted/60'
                    }`}
                  >
                    <span className="truncate font-medium">{t.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">@{t.handle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <textarea
            ref={boxRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              syncMention(e.target.value, e.target.selectionStart ?? e.target.value.length)
            }}
            onKeyDown={(e) => {
              if (mentionAt !== null && candidates.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setMentionIndex((i) => (i + 1) % candidates.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setMentionIndex((i) => (i - 1 + candidates.length) % candidates.length)
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  pickMention(candidates[mentionIndex])
                  return
                }
                if (e.key === 'Escape') {
                  setMentionAt(null)
                  return
                }
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post()
            }}
            onBlur={() => setMentionAt(null)}
            rows={2}
            placeholder="Add an internal note — @ to notify a teammate"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Never shown to the customer
          </span>
          <Button
            onClick={post}
            disabled={posting || !draft.trim()}
            size="sm"
            variant="outline"
            className="h-11 gap-1.5 lg:h-8"
          >
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Add note
          </Button>
        </div>
      </div>
    </section>
  )
}
