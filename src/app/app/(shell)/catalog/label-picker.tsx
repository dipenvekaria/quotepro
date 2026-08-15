'use client'

import { useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Assign labels to a catalog item, picking from what exists or creating on
 * first use.
 *
 * Free-text categories drifted — "Diagnostics", "diagnostic" and "Diagnostic
 * Fees" all coexisted and the grouping stopped meaning anything. Offering the
 * existing set first is what keeps it small; allowing a new one inline is what
 * stops that becoming a chore.
 *
 * Several labels per item on purpose: a service call is both "Diagnostics" and
 * "Call-out", and a label is also how a promotion will pick out what it applies
 * to.
 */
export function LabelPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[]
  /** Every label already in use by this company. */
  options: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const chosen = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return options
      .filter((o) => !chosen.has(o.toLowerCase()))
      .filter((o) => (needle ? o.toLowerCase().includes(needle) : true))
      .slice(0, 6)
  }, [options, chosen, q])

  // Only offer to create when nothing existing matches exactly — otherwise the
  // list would suggest making a duplicate of the label directly above it.
  const exact = options.some((o) => o.toLowerCase() === q.trim().toLowerCase())
  const canCreate = q.trim().length > 0 && !exact && !chosen.has(q.trim().toLowerCase())

  function add(name: string) {
    const n = name.trim()
    if (!n || chosen.has(n.toLowerCase()) || value.length >= 10) return
    onChange([...value, n])
    setQ('')
    inputRef.current?.focus()
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name))
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-1.5">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
          >
            {name}
            <button
              type="button"
              onClick={() => remove(name)}
              disabled={disabled}
              aria-label={`Remove ${name}`}
              className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={q}
          disabled={disabled || value.length >= 10}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(matches[0] ?? q)
            } else if (e.key === 'Backspace' && !q && value.length) {
              remove(value[value.length - 1])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder={value.length ? 'Add another…' : 'Labels — type to search or create'}
          className="h-8 min-w-[10rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Labels"
        />
      </div>

      {open && (matches.length > 0 || canCreate) && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          {matches.map((name) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={false}
              // preventDefault keeps focus on the input, so blur cannot close
              // the list before the click lands. See add-line-item.tsx.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(name)}
              className="flex min-h-11 w-full items-center px-3 py-2 text-left text-sm hover:bg-muted/60"
            >
              {name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(q)}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60',
                matches.length > 0 && 'border-t border-border/70',
              )}
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                Create <span className="font-medium">“{q.trim()}”</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
