'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'

/**
 * Search the customer list.
 *
 * Sits in the list header rather than the page header, next to the rows it
 * filters — the box at the top of the app is global navigation and belongs to
 * the shell, and putting a second one beside it makes neither obvious.
 *
 * The term lives in the query string so a filtered list can be linked, shared
 * and reloaded, and so the filtering happens in Postgres against the trigram
 * index rather than over whatever 200 rows the page happened to load.
 */
export function CustomerSearch({ initial, count }: { initial: string; count: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [term, setTerm] = useState(initial)
  const [pending, startNav] = useTransition()

  // Debounced: a navigation per keystroke would re-run the query and fight the
  // caret. 250ms is below the threshold where typing feels laggy.
  useEffect(() => {
    if (term === initial) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (term.trim()) next.set('q', term.trim())
      else next.delete('q')
      startNav(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
  }, [term, initial, params, pathname, router])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search name, phone or email"
          aria-label="Search customers"
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
      <span className="shrink-0 text-xs tabular text-muted-foreground">
        {pending ? 'Searching…' : `${count} ${count === 1 ? 'customer' : 'customers'}`}
      </span>
    </div>
  )
}
