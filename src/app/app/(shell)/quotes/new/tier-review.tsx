'use client'

import { Check, Trash2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { computeTotals } from '@/lib/money'

export type DraftTierItem = {
  key: string
  name: string
  description: string
  quantity: number
  unit_price: number
}

export type DraftTier = {
  tier: 'essential' | 'recommended' | 'complete'
  name: string
  description: string
  isRecommended: boolean
  /** Unticked tiers are not saved. Two options is a valid quote; one is not. */
  include: boolean
  items: DraftTierItem[]
}

/**
 * The contractor's review of generated options, before a customer sees them.
 *
 * Whether a job goes out as one price or three is a judgement about the
 * customer, not something to infer from a job description — so the tiers are
 * generated into this, not into the quote. Everything is editable, tiers can be
 * dropped, and which one is recommended is the contractor's call: it is their
 * name on the advice.
 */
export function TierReview({
  tiers,
  taxRate,
  onChange,
  onDiscard,
}: {
  tiers: DraftTier[]
  taxRate: number
  onChange: (next: DraftTier[]) => void
  onDiscard: () => void
}) {
  const included = tiers.filter((t) => t.include)

  function patchTier(i: number, patch: Partial<DraftTier>) {
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  function patchItem(ti: number, key: string, patch: Partial<DraftTierItem>) {
    onChange(
      tiers.map((t, idx) =>
        idx === ti
          ? { ...t, items: t.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) }
          : t,
      ),
    )
  }

  function removeItem(ti: number, key: string) {
    onChange(
      tiers.map((t, idx) =>
        idx === ti ? { ...t, items: t.items.filter((it) => it.key !== key) } : t,
      ),
    )
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">Options for the customer</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            They pick one. Each includes everything in the option before it.
          </p>
        </div>
        <button
          onClick={onDiscard}
          className="min-h-11 text-xs text-muted-foreground hover:text-foreground lg:min-h-0"
        >
          Discard options
        </button>
      </header>

      {included.length < 2 && (
        <p className="border-b border-border/70 bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
          Keep at least two options, or send this as a single quote instead.
        </p>
      )}

      <div className="divide-y divide-border/70">
        {tiers.map((tier, ti) => {
          const totals = computeTotals(tier.items, taxRate)
          return (
            <div key={tier.tier} className={cn('p-5', !tier.include && 'opacity-50')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={tier.include}
                    onChange={(e) => patchTier(ti, { include: e.target.checked })}
                    aria-label={`Include ${tier.name}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                  />
                  <div className="min-w-0">
                    <Input
                      value={tier.name}
                      onChange={(e) => patchTier(ti, { name: e.target.value })}
                      className="h-9 w-48 font-medium"
                      aria-label={`${tier.name} name`}
                    />
                    <Input
                      value={tier.description}
                      onChange={(e) => patchTier(ti, { description: e.target.value })}
                      placeholder="One line the customer reads"
                      className="mt-1.5 h-9 w-full max-w-md text-sm"
                      aria-label={`${tier.name} description`}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold tabular">
                    ${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(tiers.map((t, i) => ({ ...t, isRecommended: i === ti })))
                    }
                    disabled={!tier.include}
                    className={cn(
                      'mt-1 inline-flex min-h-11 items-center gap-1 rounded-md border px-2 text-xs lg:min-h-0 lg:py-1',
                      tier.isRecommended
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted disabled:opacity-40',
                    )}
                  >
                    {tier.isRecommended && <Check className="h-3 w-3" />}
                    {tier.isRecommended ? 'Recommended' : 'Recommend this'}
                  </button>
                </div>
              </div>

              {tier.include && (
                <ul className="mt-4 space-y-1.5">
                  {tier.items.map((it) => (
                    <li key={it.key} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{it.name}</span>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={it.quantity}
                        onChange={(e) =>
                          patchItem(ti, it.key, { quantity: Number(e.target.value) })
                        }
                        className="h-9 w-20 text-right tabular"
                        aria-label={`${it.name} quantity`}
                      />
                      <span className="text-muted-foreground">×</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.unit_price}
                        onChange={(e) =>
                          patchItem(ti, it.key, { unit_price: Number(e.target.value) })
                        }
                        className="h-9 w-28 text-right tabular"
                        aria-label={`${it.name} price`}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(ti, it.key)}
                        aria-label={`Remove ${it.name}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
