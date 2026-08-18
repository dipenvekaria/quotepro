'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { AssigneeFilter, type TeamMember } from '@/components/shared/assignee-filter'

/**
 * Narrowing the board.
 *
 * There was a Filter button here with no handler behind it, which is why it
 * "didn't work" — it was never wired to anything.
 *
 * Both controls live in the query string so a filtered board can be linked and
 * reloaded, and so the filtering happens in Postgres rather than over whatever
 * 500 rows the page had loaded. `assignee` is the same parameter the calendar
 * uses, so a person filtered on one board stays filtered on the other.
 */
export function PipelineFilter({
  members,
  assignee,
  initialTerm,
}: {
  members: TeamMember[]
  assignee: string
  initialTerm: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [term, setTerm] = useState(initialTerm)
  // Collapsed to an icon on phones — the always-open bar broke the screen's
  // flow (owner's words) and truncated its own placeholder at 375px. An
  // active search stays open so the filter is never invisible while applied.
  const [searchOpen, setSearchOpen] = useState(Boolean(initialTerm))
  const inputRef = useRef<HTMLInputElement>(null)

  // The input is always mounted (hidden by CSS below sm), so autoFocus never
  // re-fires when the icon opens it. An effect runs after the class flip has
  // painted; focusing from the click handler raced the commit and lost. The
  // first run is skipped so landing on ?q= doesn't pop the keyboard.
  const openedOnce = useRef(false)
  useEffect(() => {
    if (!openedOnce.current) {
      openedOnce.current = true
      return
    }
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])
  const [pending, startNav] = useTransition()

  useEffect(() => {
    if (term === initialTerm) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (term.trim()) next.set('q', term.trim())
      else next.delete('q')
      startNav(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
  }, [term, initialTerm, params, pathname, router])

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {!searchOpen && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search the pipeline"
          className="grid h-11 w-11 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground sm:hidden"
        >
          <Search className="h-4 w-4" />
        </button>
      )}
      <div
        className={
          searchOpen
            ? 'relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:max-w-xs sm:flex-1'
            : 'relative hidden min-w-0 flex-1 sm:block sm:max-w-xs'
        }
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search customer or job"
          aria-label="Search the pipeline"
          onBlur={() => {
            if (!term.trim()) setSearchOpen(false)
          }}
          className="h-11 pl-9 pr-9 lg:h-9"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AssigneeFilter members={members} active={assignee} />

      {/* Only speak when there is something to say: the header sentence
          already states the total, and the duplicate chip was squeezing the
          search box into truncating its own placeholder at 375px. */}
      {pending && (
        <span className="shrink-0 text-xs tabular text-muted-foreground">Filtering…</span>
      )}
    </div>
  )
}
