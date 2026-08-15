'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, User } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { AddressAutocomplete } from '@/components/shared/address-autocomplete'
import { cn } from '@/lib/utils'

import { searchCustomers, type CustomerMatch } from './actions'

export type CustomerFields = {
  name: string
  email: string
  phone: string
  address: string
  // Filled only when an address is picked from the suggestions. Typing by hand
  // leaves them blank, exactly as the plain text field always did.
  city: string
  state: string
  zip: string
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
  initialLinked,
}: {
  value: CustomerFields
  onChange: (next: Partial<CustomerFields> & { customerId?: string | null }) => void
  disabled?: boolean
  /** Arriving from a customer's page — already decided who this is for. */
  initialLinked?: { id: string; name: string; job_count: number } | null
}) {
  const [matches, setMatches] = useState<CustomerMatch[]>([])
  const [open, setOpen] = useState(false)
  const [linked, setLinked] = useState<CustomerMatch | null>(
    initialLinked
      ? {
          id: initialLinked.id,
          name: initialLinked.name,
          email: null,
          phone: null,
          address: null,
          job_count: initialLinked.job_count,
        }
      : null,
  )
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

  /*
    Anchored to the field being typed in, not to the wrapper.
    `absolute top-full` on the outer container put this below the entire
    customer block — past the email and address rows — so the matches appeared
    somewhere the eye never goes while typing a name. Nobody found them.
  */
  const suggestions =
    open && matches.length > 0 && !linked ? (
      <div
        role="listbox"
        className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
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
    ) : null

  return (
    <div ref={boxRef}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative space-y-1.5">
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
          {field === 'name' && suggestions}
        </div>

        <div className="relative space-y-1.5">
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
          {field === 'phone' && suggestions}
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
          <AddressAutocomplete
            id="cust-address"
            value={value.address}
            disabled={disabled}
            // Typing by hand clears any components from a previous pick, so a
            // half-edited address never keeps the old city and ZIP.
            onChange={(address) => onChange({ address, city: '', state: '', zip: '' })}
            onResolved={(a) =>
              onChange({ address: a.address, city: a.city, state: a.state, zip: a.zip })
            }
            placeholder="123 Market St, San Francisco, CA 94103"
          />
          {value.city && value.state && (
            <p className="text-xs text-muted-foreground">
              {value.city}, {value.state} {value.zip}
            </p>
          )}
        </div>
      </div>

      {linked && (
        /*
          Two things this has to answer, and the old copy answered neither:
          which record did it attach to, and what do I press if that is wrong.
          "different person" was a bare fragment with no verb — it read as a
          statement about the customer rather than a way out.
        */
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            This quote will go to{' '}
            <span className="font-medium text-foreground">{linked.name}</span>
            {linked.job_count > 0 &&
              ` · ${linked.job_count} previous ${linked.job_count === 1 ? 'job' : 'jobs'}`}
          </span>
          <button
            type="button"
            onClick={useNewCustomer}
            className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground lg:min-h-0"
          >
            Not them? Start a new customer
          </button>
        </div>
      )}

    </div>
  )
}
