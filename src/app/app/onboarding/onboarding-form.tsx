'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { signOut } from '@/app/auth/actions'
import { ACQUISITION_SOURCES, acquisitionSource } from '@/lib/acquisition'
import type { Trade } from '@/lib/catalog/starter'
import { bootstrapCompany, type BootstrapCompanyState } from './actions'
import { TradePicker } from './trade-picker'

const initial: BootstrapCompanyState = { ok: false }

/**
 * Defaults, not suggestions — a contractor who changes nothing still gets a
 * sane catalog. National-ish midpoints; every one of them is theirs to edit.
 */
const DEFAULT_LABOR_RATE = 125
const DEFAULT_MARKUP = 50
const DEFAULT_SERVICE_CALL = 99

export function OnboardingForm({ trades }: { trades: Trade[] }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(bootstrapCompany, initial)
  const [trade, setTrade] = useState('')
  const [source, setSource] = useState('')
  const detailLabel = acquisitionSource(source)?.detailLabel

  useEffect(() => {
    if (state.ok) router.replace('/app/dashboard')
  }, [state.ok, router])


  return (
    <form action={action} className="mt-8 space-y-5">
      {/* Captured silently: the person creating the account is standing in the
          company's timezone. Server-side day boundaries all read this. */}
      <input
        type="hidden"
        name="timezone"
        value={typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''}
      />
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-sm font-medium">
          Company name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="organization"
          required
          placeholder="Acme HVAC & Plumbing"
          autoFocus
          className="h-11"
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+1 (555) 000-0000" className="h-11" disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Business email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="hello@yourbiz.com" className="h-11" disabled={pending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-sm font-medium">Address</Label>
        <Input
          id="address"
          name="address"
          autoComplete="street-address"
          placeholder="123 Main St, San Francisco, CA 94103"
          className="h-11"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Shown on your quotes and invoices.
        </p>
      </div>

      {trades.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Your price book</h2>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Pick your trade and we build the price book. Prices come from your own rates — we
            never guess what you charge.
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="trade" className="text-sm font-medium">
                Trade <span className="text-destructive">*</span>
              </Label>
              <TradePicker
                trades={trades}
                value={trade}
                onChange={setTrade}
                disabled={pending}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="labor_rate" className="text-sm font-medium">Labor / hour</Label>
                  <Input
                    id="labor_rate"
                    name="labor_rate"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    // "any", not a fixed step: step={1} rejects $125.50, and
                    // step={5} rejected the $99 this form fills in itself.
                    step="any"
                    defaultValue={DEFAULT_LABOR_RATE}
                    className="h-11"
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="materials_markup" className="text-sm font-medium">Markup %</Label>
                  <Input
                    id="materials_markup"
                    name="materials_markup"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={DEFAULT_MARKUP}
                    className="h-11"
                    disabled={pending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service_call_fee" className="text-sm font-medium">Service call</Label>
                  <Input
                    id="service_call_fee"
                    name="service_call_fee"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={DEFAULT_SERVICE_CALL}
                    className="h-11"
                    disabled={pending}
                  />
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="acquisition_source" className="text-sm font-medium">
          How did you hear about us?
        </Label>
        <select
          id="acquisition_source"
          name="acquisition_source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={pending}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm lg:h-9"
        >
          <option value="">Prefer not to say</option>
          {ACQUISITION_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {detailLabel && (
          <Input
            name="acquisition_detail"
            placeholder={detailLabel}
            aria-label={detailLabel}
            maxLength={200}
            className="mt-2 h-11"
            disabled={pending}
          />
        )}
      </div>

      {state.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
        <div className="text-sm font-medium">Included when you create your workspace</div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {[
            trade
              ? `A full price book for ${trades.find((x) => x.slug === trade)?.name ?? 'your trade'}, priced at your rates`
              : 'A full price book for your trade — choose one above',
            // Four roles, not three: sales was missing from this list.
            '4 team roles: owner, office, sales, technician',
            'Encrypted data with automatic backups',
            'One-click quote drafting built in',
          ].map((f) => (
            <li key={f} className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => signOut()}
          className="min-h-11 text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
        <Button type="submit" disabled={pending || !trade} className="shadow-sm">
          {pending ? 'Creating…' : (
            <span className="inline-flex items-center gap-1.5">
              Create workspace <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
