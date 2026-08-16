'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Briefcase } from 'lucide-react'

import { ASSIGNABLE_ROLES, ROLE_GROUP_LABEL } from '@/lib/team-personas'
import { cn } from '@/lib/utils'

/**
 * Which kind of person, rather than which person.
 *
 * The assignee filter answers "what is Marcus doing". This answers "what are
 * the technicians doing" — and with a crew of a dozen, picking twelve names one
 * at a time to answer that is not a filter, it is arithmetic.
 *
 * They compose: choosing a role narrows the people list beside it, so the two
 * controls read as one question getting more specific rather than two that
 * might contradict each other.
 *
 * Roles are the shape available today. Units — five crews of three to five —
 * are the shape this grows into, and they slot in as a third parameter on the
 * same query string without disturbing either of these.
 */

export function RoleFilter({ active, counts }: { active: string; counts: Record<string, number> }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  // Only offer roles that someone in this company actually holds — a filter
  // that returns a guaranteed empty board is worse than no filter.
  const available = ASSIGNABLE_ROLES.filter((r) => (counts[r] ?? 0) > 0)
  if (available.length < 2) return null

  function select(role: string) {
    const next = new URLSearchParams(params.toString())
    if (role) next.set('role', role)
    else next.delete('role')
    // Changing role can strand an assignee who is not in it. Clearing is the
    // honest behaviour: the alternative is a board that silently shows nothing
    // and looks broken.
    next.delete('assignee')
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Briefcase className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      {/*
        "All roles" rather than "Everyone": this sits beside the assignee
        filter, which also defaults to "Everyone", and two adjacent dropdowns
        reading the same word tell you nothing about which is which. The icons
        distinguish them only from sm: upward, and this product is designed for
        375px first.
      */}
      <label htmlFor="role-filter" className="sr-only">
        Filter by role
      </label>
      <select
        id="role-filter"
        value={active}
        onChange={(e) => select(e.target.value)}
        className={cn(
          'h-11 max-w-[11rem] rounded-lg border bg-background px-3 text-sm shadow-sm lg:h-9',
          active ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
        )}
      >
        <option value="">All roles</option>
        {available.map((r) => (
          <option key={r} value={r}>
            {ROLE_GROUP_LABEL[r]} ({counts[r]})
          </option>
        ))}
      </select>
    </div>
  )
}
