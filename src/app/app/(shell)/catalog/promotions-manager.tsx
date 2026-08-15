'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import { deletePromotion, savePromotion, type PromotionRow } from './actions'
import { LabelPicker } from './label-picker'

/**
 * Promotions.
 *
 * "Fall promotion — service call is $9.99 instead of $59.99." Targeting a label
 * rather than individual items is what makes it one rule instead of an edit per
 * item, and it is why labels exist as a real set.
 *
 * Contractor-applied: the customer never types a code. A `code` is recorded only
 * so a campaign can be attributed later.
 */

type Draft = {
  id?: string
  name: string
  code: string
  discount_type: 'percent' | 'amount' | 'fixed_price'
  discount_value: string
  starts_at: string
  ends_at: string
  is_active: boolean
  labels: string[]
}

const EMPTY: Draft = {
  name: '',
  code: '',
  discount_type: 'fixed_price',
  discount_value: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  labels: [],
}

const TYPES = [
  { value: 'fixed_price', label: 'Set price', hint: 'e.g. $9.99 instead of $59.99' },
  { value: 'percent', label: 'Percent off', hint: 'e.g. 20% off' },
  { value: 'amount', label: 'Amount off', hint: 'e.g. $50 off' },
] as const

function describe(p: PromotionRow) {
  if (p.discount_type === 'fixed_price') return `$${p.discount_value} each`
  if (p.discount_type === 'percent') return `${p.discount_value}% off`
  return `$${p.discount_value} off`
}

function toLocal(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function PromotionsManager({
  promotions,
  labelOptions,
  canEdit,
}: {
  promotions: PromotionRow[]
  labelOptions: string[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, startSave] = useTransition()

  function openNew() {
    setDraft(EMPTY)
    setOpen(true)
  }

  function openEdit(p: PromotionRow) {
    setDraft({
      id: p.id,
      name: p.name,
      code: p.code ?? '',
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      starts_at: toLocal(p.starts_at ?? ''),
      ends_at: toLocal(p.ends_at ?? ''),
      is_active: p.is_active,
      labels: p.labels,
    })
    setOpen(true)
  }

  function save() {
    startSave(async () => {
      const res = await savePromotion({
        ...draft,
        discount_value: Number(draft.discount_value),
        // A date-only input means the whole of that day, and an end date the
        // contractor typed should include the day they typed.
        starts_at: draft.starts_at ? new Date(`${draft.starts_at}T00:00:00`).toISOString() : null,
        ends_at: draft.ends_at ? new Date(`${draft.ends_at}T23:59:59`).toISOString() : null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(draft.id ? 'Promotion updated' : 'Promotion created')
      setOpen(false)
      router.refresh()
    })
  }

  function remove(p: PromotionRow) {
    startSave(async () => {
      const res = await deletePromotion({ id: p.id })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      // Quotes already sent keep their prices — promotion_id is ON DELETE SET NULL.
      toast.success(`${p.name} removed`, { description: 'Quotes already sent keep their prices.' })
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Promotions</h2>
          {promotions.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
              {promotions.length}
            </span>
          )}
        </div>
        {canEdit && (
          <Button variant="outline" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New promotion
          </Button>
        )}
      </header>

      {promotions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Discount everything with a label at once — a $9.99 service call this autumn, say. Prices
          apply automatically when you build a quote.
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {promotions.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      p.live ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {p.live ? 'Running' : p.is_active ? 'Scheduled' : 'Off'}
                  </span>
                  {p.code && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {p.code}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {describe(p)} · {p.labels.length ? p.labels.join(', ') : 'no labels — applies to nothing'}
                  {p.ends_at && ` · until ${new Date(p.ends_at).toLocaleDateString()}`}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="min-h-11 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground lg:min-h-0 lg:py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p)}
                    disabled={saving}
                    aria-label={`Remove ${p.name}`}
                    className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:h-9 lg:w-9"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit promotion' : 'New promotion'}</DialogTitle>
            <DialogDescription>
              Everything with these labels is priced this way while the promotion runs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promo-name"
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Fall promotion"
                className="h-11"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Applies to</Label>
              <LabelPicker
                value={draft.labels}
                options={labelOptions}
                onChange={(labels: string[]) => setDraft((d) => ({ ...d, labels }))}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Every catalog item carrying one of these labels.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Discount</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, discount_type: t.value }))}
                    aria-pressed={draft.discount_type === t.value}
                    className={cn(
                      'rounded-lg border p-2 text-left transition-colors',
                      draft.discount_type === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/60',
                    )}
                  >
                    <div className="text-xs font-medium">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground">{t.hint}</div>
                  </button>
                ))}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.discount_value}
                onChange={(e) => setDraft((d) => ({ ...d, discount_value: e.target.value }))}
                placeholder={draft.discount_type === 'percent' ? '20' : '9.99'}
                className="h-11"
                aria-label="Discount value"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promo-start">Starts</Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={draft.starts_at}
                  onChange={(e) => setDraft((d) => ({ ...d, starts_at: e.target.value }))}
                  className="h-11"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-end">Ends</Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={draft.ends_at}
                  onChange={(e) => setDraft((d) => ({ ...d, ends_at: e.target.value }))}
                  className="h-11"
                  disabled={saving}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave the dates empty for an offer with no end.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="promo-code">Campaign code</Label>
              <Input
                id="promo-code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder="FALL26"
                className="h-11"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Optional, for your own tracking. Customers never type this — you apply the
                promotion, they just see the price.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !draft.name.trim() || draft.labels.length === 0}
            >
              {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
