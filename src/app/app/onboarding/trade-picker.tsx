'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/catalog/starter'

/**
 * Picking a trade from a hundred of them.
 *
 * A native select with a hundred options and no search means scrolling a list
 * to find "Garage Door Installation", which is the first thing a contractor
 * does in this product. Typing three letters is the whole feature.
 *
 * Matching is on the trade name and its category, so someone who thinks of
 * themselves as "HVAC" finds the heating and cooling trades even when neither
 * name contains that word.
 */
export function TradePicker({
  trades,
  value,
  onChange,
  disabled,
}: {
  trades: Trade[]
  value: string
  onChange: (slug: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = trades.find((t) => t.slug === value) ?? null

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return trades
    // Name matches first: someone typing "roof" wants Roofing, not every trade
    // filed under a category containing the word.
    const byName: Trade[] = []
    const byCategory: Trade[] = []
    for (const t of trades) {
      if (t.name.toLowerCase().includes(q)) byName.push(t)
      else if (t.category.toLowerCase().includes(q)) byCategory.push(t)
    }
    return [...byName, ...byCategory]
  }, [trades, search])

  function choose(t: Trade) {
    onChange(t.slug)
    setSearch('')
    setOpen(false)
    setActive(0)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const next = e.key === 'ArrowDown' ? active + 1 : active - 1
      const clamped = Math.max(0, Math.min(matches.length - 1, next))
      setActive(clamped)
      listRef.current?.children[clamped]?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (e.key === 'Enter' && open && matches[active]) {
      e.preventDefault()
      choose(matches[active])
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
    }
  }

  return (
    <div className="relative">
      {/* The value the form actually submits. The visible control is a search
          box, so without this nothing named `trade` reaches the action. */}
      <input type="hidden" name="trade" value={value} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="trade"
          role="combobox"
          aria-expanded={open}
          aria-controls="trade-options"
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={open ? search : (selected?.name ?? '')}
          placeholder={selected ? selected.name : 'Search 100 trades — try "roof" or "HVAC"'}
          onChange={(e) => {
            setSearch(e.target.value)
            setActive(0)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // A click lands after blur otherwise, and the list is gone by then.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-11 pl-9 pr-9"
        />
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>

      {open && (
        <ul
          id="trade-options"
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No trade matches “{search}”. Pick the closest one — you can edit every price after.
            </li>
          ) : (
            matches.map((t, i) => (
              <li key={t.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.slug === value}
                  // mousedown, not click: blur fires first and closes the list.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(t)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm',
                    i === active ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.category}
                    </span>
                  </span>
                  {t.slug === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
