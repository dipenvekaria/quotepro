'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { resolveAddress, searchAddresses } from '@/lib/places/actions'
import type { StructuredAddress, Suggestion } from '@/lib/places/google'

/**
 * An address field that completes as you type.
 *
 * Two things it must never do. It must not stop a contractor typing an address
 * Google has never heard of — new construction is most of the work in this
 * trade — so what is typed is always kept, and picking a suggestion is
 * optional. And it must not fall over when the key is missing: without one the
 * lookup reports unavailable and this is simply a text box.
 *
 * Picking a suggestion is what yields `city`, `state` and `zip`. Typing by hand
 * fills only the street line, which is exactly what the old free-text field did
 * — so this is never worse than what it replaces.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onResolved,
  id,
  placeholder = '123 Main St',
  disabled,
  className,
}: {
  value: string
  onChange: (address: string) => void
  /** Fired only when a suggestion is picked and Google returns components. */
  onResolved?: (address: StructuredAddress) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)

  // One token per address being entered. Google bills a run of keystrokes plus
  // the final details call as a single session when they share it, so this is
  // reset only after a pick — not on every render.
  const sessionToken = useRef<string>(crypto.randomUUID())
  const latest = useRef(0)
  // Suppresses the search that the programmatic setValue after a pick triggers.
  const justPicked = useRef(false)

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    // No setState here: clearing synchronously in an effect cascades renders.
    // Short input simply schedules nothing, and `showList` below hides whatever
    // is left over until a fresh search replaces it.
    if (value.trim().length < 3) return

    const seq = ++latest.current
    // Debounced: a request per keystroke would be both slow and, without the
    // session token doing its job, expensive.
    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await searchAddresses({ input: value, sessionToken: sessionToken.current })
      // A slower earlier request must not overwrite a newer one's results.
      if (seq !== latest.current) return
      setLoading(false)
      if (!res.ok || !res.available) {
        setSuggestions([])
        return
      }
      setSuggestions(res.suggestions)
      setActive(0)
    }, 250)

    return () => clearTimeout(timer)
  }, [value])

  async function pick(s: Suggestion) {
    justPicked.current = true
    onChange(`${s.primary}${s.secondary ? `, ${s.secondary}` : ''}`)
    setOpen(false)
    setSuggestions([])

    const res = await resolveAddress({ placeId: s.placeId, sessionToken: sessionToken.current })
    // The details call closes the billing session either way, so the next
    // address starts a new one.
    sessionToken.current = crypto.randomUUID()

    if (res.ok) {
      justPicked.current = true
      onChange(res.address.address)
      onResolved?.(res.address)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? active + 1 : active - 1
      setActive(Math.max(0, Math.min(suggestions.length - 1, next)))
      return
    }
    if (e.key === 'Enter' && suggestions[active]) {
      e.preventDefault()
      void pick(suggestions[active])
      return
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const showList = open && value.trim().length >= 3 && suggestions.length > 0

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${inputId}-options`}
          aria-autocomplete="list"
          // The browser's own dropdown would sit on top of this one.
          autoComplete="off"
          className={cn('h-11 pl-9', className)}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            …
          </span>
        )}
      </div>

      {showList && (
        <ul
          id={`${inputId}-options`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                // mousedown: blur fires before click and closes the list.
                onMouseDown={(e) => {
                  e.preventDefault()
                  void pick(s)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm',
                  i === active ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.primary}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.secondary}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
