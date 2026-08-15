'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, User } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { searchCustomers, type CustomerMatch } from './actions'

export type CustomerFields = {
  name: string
  email: string
  phone: string
  address: string
}

/**
 * Find an existing customer, or create one, without choosing between those
 * first.
 *
 * A contractor quoting someone they served last year should not retype their
 * details, and should not have to answer "is this a new customer?" before they
 * have typed anything — they know the person, not the record. So the name and
 * phone fields search as you type, and anything that matches nothing simply
 * becomes a new customer on save.
 */
export function CustomerLookup({
  value,
  onChange,
  disabled,
}: {
  value: CustomerFields
  onChange: (next: Partial<CustomerFields> & { customerId?: string | null }) => void
  disabled?: boolean
}) {
  const [matches, setMatches] = useState<CustomerMatch[]>([])
  const [open, setOpen] = useState(false)
  const [linked, setLinked] = useState<CustomerMatch | null>(null)
  const [field, setField] = useState<'name' | 'phone'>('name')
  const boxRef = useRef<HTMLDivElement>(null)

  const term = field === 'name' ? value.name : value.phone

  useEffect(() => {
    // A linked customer is a decision already made; searching against their own
    // details would only re-offer them.
    if (linked) return
    const t = term.trim()
    let cancelled = false
    // Everything runs inside the timer, including clearing. Calling setState
    // synchronously here instead cascades renders on every keystroke.
    const timer = setTimeout(async () => {
      if (t.length < 2) {
        if (!cancelled) {
          setMatches([])
          setOpen(false)
        }
        return
      }
      const found = await searchCustomers(t)
      if (!cancelled) {
        setMatches(found)
        setOpen(found.length > 0)
      }
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term, linked])

  function pick(c: CustomerMatch) {
    setLinked(c)
    setOpen(false)
    setMatches([])
    onChange({
      customerId: c.id,
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
    })
  }

  /** The contractor edited a field — stop treating the match as chosen. */
  function unlinkOnEdit() {
    setLinked(null)
    onChange({ customerId: null })
  }

  /**
   * "This is a different person."
   *
   * Clearing the flag alone did nothing: the fields still held the matched
   * customer's phone and email, and create_work_item_with_customer matches on
   * exactly those — so saving re-linked the same record and the button had no
   * effect at all.
   *
   * The name is kept because the overwhelming reason to click this is two
   * people sharing one, which is also why matching is on contact details rather
   * than names.
   */
  function useNewCustomer() {
    setLinked(null)
    setMatches([])
    setOpen(false)
    onChange({ customerId: null, phone: '', email: '', address: '' })
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cust-name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="cust-name"
            value={value.name}
            disabled={disabled}
            onChange={(e) => {
              if (linked) unlinkOnEdit()
              setField('name')
              onChange({ name: e.target.value })
            }}
            onFocus={() => {
              setField('name')
              if (matches.length) setOpen(true)
            }}
            onBlur={() => setOpen(false)}
            placeholder="Sarah Johnson"
            className="h-11"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cust-phone" className="text-sm font-medium">
            Phone
          </label>
          <Input
            id="cust-phone"
            value={value.phone}
            disabled={disabled}
            onChange={(e) => {
              if (linked) unlinkOnEdit()
              setField('phone')
              onChange({ phone: e.target.value })
            }}
            onFocus={() => {
              setField('phone')
              if (matches.length) setOpen(true)
            }}
            onBlur={() => setOpen(false)}
            placeholder="+1 (555) 000-0000"
            className="h-11"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cust-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="cust-email"
            type="email"
            value={value.email}
            disabled={disabled}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="sarah@example.com"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cust-address" className="text-sm font-medium">
            Address
          </label>
          <Input
            id="cust-address"
            value={value.address}
            disabled={disabled}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="123 Market St, San Francisco, CA 94103"
            className="h-11"
          />
        </div>
      </div>

      {linked && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-primary" />
          Existing customer
          {linked.job_count > 0 && ` · ${linked.job_count} previous ${linked.job_count === 1 ? 'job' : 'jobs'}`}
          <button
            type="button"
            onClick={useNewCustomer}
            className="ml-1 underline hover:text-foreground"
          >
            different person
          </button>
        </p>
      )}

      {open && matches.length > 0 && !linked && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          <p className="border-b border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
            Existing customers
          </p>
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={false}
              // See add-line-item.tsx: preventDefault keeps the input focused
              // so the click cannot be beaten by the list closing.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              className={cn(
                'flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </span>
                </span>
              </span>
              {c.job_count > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.job_count} {c.job_count === 1 ? 'job' : 'jobs'}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
