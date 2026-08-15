'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Whose calendar you are looking at.
 *
 * Everyone by default, because the question the owner opens this page with is
 * "who is free on Thursday", not "what is Marcus doing" — and a board that
 * starts filtered hides the answer.
 *
 * Deliberately one assignee rather than a multi-select. Once there are five
 * units of three to five people, the useful filter is the unit, not an
 * arbitrary set of names, and a multi-select now would be the wrong shape to
 * grow from. The query string carries `assignee`, so `unit` can join it without
 * disturbing this.
 */
export type TeamMember = { id: string; label: string }

export function AssigneeFilter({
  members,
  active,
}: {
  members: TeamMember[]
  active: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  // Nobody to filter between.
  if (members.length < 2) return null

  function select(id: string) {
    const next = new URLSearchParams(params.toString())
    if (id) next.set('assignee', id)
    else next.delete('assignee')
    router.push(`/app/calendar?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      <label htmlFor="assignee" className="sr-only">
        Filter the calendar by who the job is assigned to
      </label>
      <select
        id="assignee"
        value={active}
        onChange={(e) => select(e.target.value)}
        className={cn(
          'h-11 max-w-[12rem] rounded-lg border bg-background px-3 text-sm shadow-sm lg:h-9',
          active ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
        )}
      >
        <option value="">Everyone</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
