'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ChevronDown, Loader2, Package, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react'
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
import { matchesCatalogSearch } from '@/lib/catalog/search'
import { cn } from '@/lib/utils'

import {
  createCatalogItem,
  setCatalogItemLabels,
  deleteCatalogItem,
  importCatalogCsv,
  updateCatalogItem,
} from './actions'
import { CatalogExtract } from './catalog-extract'
import { LabelPicker } from './label-picker'

export type CatalogItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  base_price: number
  image_path?: string | null
  unit: string | null
  labor_hours?: number | null
  /** Who put it in the price book. Null for anything predating attribution. */
  added_by?: string | null
  is_active: boolean
  labels?: string[]
}

type Draft = {
  id?: string
  name: string
  description: string
  category: string
  labels: string[]
  base_price: string
  unit: string
  labor_hours: string
  is_active: boolean
}

const EMPTY: Draft = {
  name: '',
  description: '',
  category: '',
  labels: [],
  base_price: '',
  unit: 'each',
  labor_hours: '',
  is_active: true,
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

/**
 * Which categories the contractor left open, remembered across visits. A price
 * book is opened dozens of times a week and almost always for the same two or
 * three categories.
 */
const OPEN_CATEGORIES_KEY = 'rivet.catalog.openCategories'

/**
 * Above this many categories the list stops being scannable in one screen, so
 * it starts closed and the categories themselves become the index. A trade
 * starter catalog lands around thirteen; a hand-built one is often three.
 */
const COLLAPSE_THRESHOLD = 4

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
  showPrices = true,
  imageUrls = {},
}: {
  items: CatalogItem[]
  canEdit: boolean
  /**
   * False for technicians and sales. The server already omits base_price from
   * the query for those roles, so this only stops an empty column being drawn —
   * it is not the control.
   */
  showPrices?: boolean
  /** Signed URLs by storage path — they expire, so they are not stored. */
  imageUrls?: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, startSave] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startDelete] = useTransition()
  const [importing, startImport] = useTransition()

  // The label set is whatever the catalog already uses, so the picker offers
  // real options without a second round trip.
  const allLabels = useMemo(() => {
    const s = new Set<string>()
    for (const i of items) for (const l of i.labels ?? []) s.add(l)
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [items])
  const fileRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset immediately so picking the same file twice still fires a change.
    e.target.value = ''
    if (!file) return

    startImport(async () => {
      const csv = await file.text()
      const res = await importCatalogCsv({ csv })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const { imported, skipped, errors } = res.data
      if (skipped === 0) {
        toast.success(`Imported ${imported} ${imported === 1 ? 'item' : 'items'}`)
      } else {
        toast.warning(`Imported ${imported}, skipped ${skipped}`, {
          description: errors
            .slice(0, 3)
            .map((x) => `Row ${x.row}: ${x.reason}`)
            .join(' · '),
          duration: 8000,
        })
      }
    })
  }

  const editing = Boolean(draft.id)

  const [term, setTerm] = useState('')
  const searching = term.trim().length > 0

  // Who added what. Only offered once more than one person has, because a
  // filter with a single option is a control that cannot do anything.
  const [editor, setEditor] = useState('')
  const editors = useMemo(
    () => [...new Set(items.map((i) => i.added_by).filter((n): n is string => Boolean(n)))].sort(),
    [items],
  )

  const filtered = useMemo(() => {
    let out = searching ? items.filter((i) => matchesCatalogSearch(i, term)) : items
    if (editor) out = out.filter((i) => i.added_by === editor)
    return out
  }, [items, term, searching, editor])

  const grouped = useMemo(() => {
    const out: Record<string, CatalogItem[]> = {}
    for (const item of filtered) {
      const key = item.category?.trim() || 'Uncategorized'
      ;(out[key] ??= []).push(item)
    }
    return out
  }, [filtered])

  const categoryNames = Object.keys(grouped)
  const startsOpen = new Set(items.map((i) => i.category?.trim() || 'Uncategorized')).size
    <= COLLAPSE_THRESHOLD

  // Read after mount, not during render: localStorage is not available on the
  // server and reading it in render is a hydration mismatch.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OPEN_CATEGORIES_KEY)
      if (raw) setOpenCategories(JSON.parse(raw) as Record<string, boolean>)
    } catch {
      // A corrupt or unavailable store is not worth failing the page over.
    }
  }, [])

  function persist(next: Record<string, boolean>) {
    setOpenCategories(next)
    try {
      window.localStorage.setItem(OPEN_CATEGORIES_KEY, JSON.stringify(next))
    } catch {
      // Private browsing and full quotas both land here. The UI still works;
      // it just forgets.
    }
  }

  // While searching every section is open — a hit hidden inside a collapsed
  // category reads as no result at all.
  const isOpen = (category: string) =>
    searching || (openCategories[category] ?? startsOpen)

  const allOpen = categoryNames.length > 0 && categoryNames.every((c) => isOpen(c))

  function toggleAll() {
    persist(Object.fromEntries(categoryNames.map((c) => [c, !allOpen])))
  }

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
      labels: item.labels ?? [],
      base_price: String(item.base_price),
      unit: item.unit ?? 'each',
      labor_hours: item.labor_hours == null ? '' : String(item.labor_hours),
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
        labor_hours: draft.labor_hours.trim() === '' ? '' : Number(draft.labor_hours),
        is_active: draft.is_active,
      }
      const res = draft.id
        ? await updateCatalogItem({ ...payload, id: draft.id })
        : await createCatalogItem(payload)

      if (!res.ok) {
        toast.error(res.error)
        return
      }

      // Labels are a separate write because they live in a join table. A
      // failure here must not read as the item failing to save — it did save.
      const savedId = res.data.id
      const labelRes = await setCatalogItemLabels({ item_id: savedId, labels: draft.labels })
      if (!labelRes.ok) toast.warning(`Item saved, but labels did not: ${labelRes.error}`)

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
        // Two columns on a phone with the third spanning both, rather than a
        // wrap that leaves one button stranded on its own line looking like a
        // mistake. Flows back into a normal row at sm:.
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
            <Button onClick={openNew} className="h-11 gap-1.5 sm:h-9">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-1.5 sm:h-9"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importing…' : 'Import CSV'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={onFile}
              aria-label="Import a CSV price list"
            />
            {/* Not wrapped in a div: the extract renders its review table as a
                sibling, and a wrapper would trap that table at button width. */}
            <CatalogExtract className="col-span-2 h-11 w-full sm:col-auto sm:h-9 sm:w-auto" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            CSV needs a name and price column. Or read your prices straight off an old quote,
            invoice or supplier price sheet — PDF or a photo.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Package}
            title="Your price book is empty"
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
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search the price book"
                aria-label="Search price book items"
                className="h-11 pl-9 pr-9 lg:h-9"
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {!searching && editors.length > 1 && (
              <select
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
                aria-label="Filter by who added the item"
                className={cn(
                  'h-11 shrink-0 rounded-lg border bg-background px-3 text-sm shadow-sm lg:h-9',
                  editor ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
                )}
              >
                <option value="">Anyone</option>
                {editors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            {!searching && categoryNames.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="min-h-11 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground lg:min-h-9"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            {searching && (
              <span className="shrink-0 text-xs tabular text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
              </span>
            )}
          </div>

          {categoryNames.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Nothing matches “{term.trim()}”. Try a shorter word, or the category name.
            </p>
          ) : (
          <div className="mt-4 space-y-3">
          {Object.entries(grouped).map(([category, catItems]) => (
            <section
              key={category}
              className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
            >
              <h3>
                <button
                  type="button"
                  onClick={() => persist({ ...openCategories, [category]: !isOpen(category) })}
                  aria-expanded={isOpen(category)}
                  aria-controls={`catalog-cat-${category.replace(/\W+/g, '-')}`}
                  // Full width and 44px tall: on a phone this is the primary
                  // way through the list, so the whole bar is the target.
                  className={cn(
                    'flex min-h-11 w-full items-center justify-between gap-2 bg-muted/40 px-5 py-2.5 text-left',
                    'hover:bg-muted/70',
                    isOpen(category) && 'border-b border-border/70',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <span className="truncate">{category}</span>
                    <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                      {catItems.length}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      isOpen(category) && 'rotate-180',
                    )}
                  />
                </button>
              </h3>

              <ul
                id={`catalog-cat-${category.replace(/\W+/g, '-')}`}
                hidden={!isOpen(category)}
                className="divide-y divide-border/70"
              >
                {catItems.map((it) => (
                  <li
                    key={it.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3',
                      !it.is_active && 'opacity-50',
                    )}
                  >
                    {/* The picture a technician points at while explaining the
                        part. Shown to every role; the price beside it is not. */}
                    {it.image_path && imageUrls[it.image_path] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrls[it.image_path]}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-md border border-border/70 object-cover"
                      />
                    ) : null}
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
                      {it.added_by && (
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          Added by {it.added_by}
                        </div>
                      )}
                    </div>

                    <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                      per {it.unit ?? 'each'}
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold tabular">
                      {showPrices ? fmtMoney(Number(it.base_price)) : '—'}
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
              <Label htmlFor="ci-hours">Labour hours</Label>
              <Input
                id="ci-hours"
                inputMode="decimal"
                value={draft.labor_hours}
                onChange={(e) => setDraft((d) => ({ ...d, labor_hours: e.target.value }))}
                placeholder="e.g. 2.5"
              />
              <p className="text-xs text-muted-foreground">
                How long this takes. An accepted quote uses it to size the job on the calendar,
                so a schedule built from real hours stops being a guess. Leave blank for
                materials.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Labels</Label>
              <LabelPicker
                value={draft.labels}
                options={allLabels}
                onChange={(labels: string[]) => setDraft((d) => ({ ...d, labels }))}
              />
              <p className="text-xs text-muted-foreground">
                Pick from the ones you already use, or type a new one. An item can carry several.
              </p>
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
