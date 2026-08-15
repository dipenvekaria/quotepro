'use client'

import { useMemo, useRef, useState } from 'react'
import { Package, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

export type CatalogChoice = {
  id: string
  name: string
  description: string | null
  base_price: number
  unit?: string | null
}

/**
 * One control for adding a line, instead of two buttons that did the same job.
 *
 * "From catalog" opened a picker and "Blank row" inserted an empty line, so the
 * contractor had to decide which kind of thing they were adding before they had
 * typed anything. They almost always know the item, not the mechanism.
 *
 * Now: start typing. Matches from the price book appear underneath and Enter
 * takes the highlighted one; if nothing matches, Enter adds what was typed as a
 * custom line. Same keystrokes either way, and the catalog stops being a place
 * you have to go.
 */
export function AddLineItem({
  catalog,
  onAdd,
}: {
  catalog: CatalogChoice[]
  onAdd: (item: { name: string; description: string; unit_price: number }) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [dropUp, setDropUp] = useState(false)

  /**
   * This control is the last thing in the line-items card, so on a full quote
   * the suggestions opened below the fold and the contractor never saw them.
   * Flip upwards when there isn't room underneath.
   */
  function openList() {
    const box = inputRef.current?.getBoundingClientRect()
    if (box) setDropUp(window.innerHeight - box.bottom < 280)
    setOpen(true)
  }

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return catalog.slice(0, 6)
    return catalog
      .filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          (c.description ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 6)
  }, [catalog, q])

  function addCatalog(c: CatalogChoice) {
    onAdd({ name: c.name, description: c.description ?? '', unit_price: c.base_price })
    reset()
  }

  function addCustom() {
    const name = q.trim()
    if (!name) return
    // Priced at zero on purpose — a custom line has no catalog price, and
    // inventing one would be worse than an obvious blank the contractor fills.
    onAdd({ name, description: '', unit_price: 0 })
    reset()
  }

  function reset() {
    setQ('')
    setCursor(0)
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = matches[cursor]
      // A highlighted match wins; otherwise whatever was typed becomes the line.
      if (hit && q.trim()) addCatalog(hit)
      else if (hit && !q.trim()) addCatalog(hit)
      else addCustom()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-5 py-3">
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setCursor(0)
            openList()
          }}
          onFocus={openList}
          // A click on a suggestion has to land before the list unmounts.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Add a line — type to search your price book, or write your own"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Add a line item"
          aria-expanded={open}
          role="combobox"
          aria-controls="add-line-suggestions"
        />
      </div>

      {open && (matches.length > 0 || q.trim()) && (
        <div
          id="add-line-suggestions"
          role="listbox"
          className={cn(
            'absolute inset-x-2 z-20 overflow-hidden rounded-lg border border-border bg-popover shadow-lg',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {matches.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => addCatalog(c)}
              className={cn(
                'flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm',
                i === cursor ? 'bg-muted' : 'hover:bg-muted/60',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  {c.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 tabular text-muted-foreground">
                ${c.base_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                {c.unit && c.unit !== 'each' ? `/${c.unit}` : ''}
              </span>
            </button>
          ))}

          {q.trim() && (
            <button
              type="button"
              onClick={addCustom}
              className="flex min-h-11 w-full items-center gap-2 border-t border-border/70 px-3 py-2 text-left text-sm hover:bg-muted/60"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">
                Add <span className="font-medium">“{q.trim()}”</span> as a custom line
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
