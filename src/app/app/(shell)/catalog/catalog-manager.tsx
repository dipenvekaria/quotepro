'use client'

import { useMemo, useState, useTransition } from 'react'
import { Loader2, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

import { createCatalogItem, deleteCatalogItem, updateCatalogItem } from './actions'

export type CatalogItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  base_price: number
  unit: string | null
  is_active: boolean
}

type Draft = {
  id?: string
  name: string
  description: string
  category: string
  base_price: string
  unit: string
  is_active: boolean
}

const EMPTY: Draft = {
  name: '',
  description: '',
  category: '',
  base_price: '',
  unit: 'each',
  is_active: true,
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

/**
 * The price book: list plus add/edit/delete.
 *
 * `canEdit` is owner-only, matching `canEditCatalog` in src/lib/permissions.ts.
 * Everyone else sees the same list without controls — the server actions
 * enforce it again regardless of what this renders.
 */
export function CatalogManager({
  items,
  canEdit,
}: {
  items: CatalogItem[]
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, startSave] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startDelete] = useTransition()

  const editing = Boolean(draft.id)

  const grouped = useMemo(() => {
    const out: Record<string, CatalogItem[]> = {}
    for (const item of items) {
      const key = item.category?.trim() || 'Uncategorized'
      ;(out[key] ??= []).push(item)
    }
    return out
  }, [items])

  function openNew() {
    setDraft(EMPTY)
    setOpen(true)
  }

  function openEdit(item: CatalogItem) {
    setDraft({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      category: item.category ?? '',
      base_price: String(item.base_price),
      unit: item.unit ?? 'each',
      is_active: item.is_active,
    })
    setOpen(true)
  }

  function save() {
    if (!draft.name.trim()) {
      toast.error('Give the item a name.')
      return
    }
    const price = Number(draft.base_price)
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a price of zero or more.')
      return
    }

    startSave(async () => {
      const payload = {
        name: draft.name,
        description: draft.description,
        category: draft.category,
        base_price: price,
        unit: draft.unit || 'each',
        is_active: draft.is_active,
      }
      const res = draft.id
        ? await updateCatalogItem({ ...payload, id: draft.id })
        : await createCatalogItem(payload)

      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? 'Item updated' : 'Item added')
      setOpen(false)
      setDraft(EMPTY)
    })
  }

  function remove(item: CatalogItem) {
    setPendingId(item.id)
    startDelete(async () => {
      const res = await deleteCatalogItem({ id: item.id })
      setPendingId(null)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Removed ${item.name}`)
    })
  }

  return (
    <>
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Package}
            title="Your catalog is empty"
            description={
              canEdit
                ? 'Add the items your business sells. Quotes are built from these prices, and the AI only ever uses items you have added.'
                : 'No pricing items yet. Ask an owner to add them.'
            }
            action={
              canEdit ? (
                <Button onClick={openNew} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add your first item
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <section
              key={category}
              className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
            >
              <header className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-5 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {category}
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                    {catItems.length}
                  </span>
                </div>
              </header>

              <ul className="divide-y divide-border/70">
                {catItems.map((it) => (
                  <li
                    key={it.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3',
                      !it.is_active && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{it.name}</span>
                        {!it.is_active && (
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      {it.description && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {it.description}
                        </div>
                      )}
                    </div>

                    <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                      per {it.unit ?? 'each'}
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold tabular">
                      {fmtMoney(Number(it.base_price))}
                    </div>

                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${it.name}`}
                          onClick={() => openEdit(it)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${it.name}`}
                          onClick={() => remove(it)}
                          disabled={pendingId === it.id}
                        >
                          {pendingId === it.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit item' : 'Add a pricing item'}</DialogTitle>
            <DialogDescription>
              Quotes are built from these prices, and the AI only ever uses items you have added
              here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ci-name">Name</Label>
              <Input
                id="ci-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Condenser fan motor replacement"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ci-price">Price</Label>
                <Input
                  id="ci-price"
                  inputMode="decimal"
                  value={draft.base_price}
                  onChange={(e) => setDraft((d) => ({ ...d, base_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ci-unit">Unit</Label>
                <Input
                  id="ci-unit"
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  placeholder="each, hour, ft"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ci-category">Category</Label>
              <Input
                id="ci-category"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="Labor, Equipment, Materials…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ci-desc">Description</Label>
              <Textarea
                id="ci-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What this covers. The AI reads this when matching a job."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div className="pr-4">
                <div className="text-sm font-medium">Available for quotes</div>
                <div className="text-xs text-muted-foreground">
                  Inactive items stay on file but are hidden from quoting.
                </div>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
