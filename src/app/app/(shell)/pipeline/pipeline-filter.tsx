'use client'

import { useEffect, useState, useTransition } from 'react'
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search customer or job"
          aria-label="Search the pipeline"
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
