'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { AddLineItem } from './add-line-item'
import { CustomerLookup } from './customer-lookup'
import { Label } from '@/components/ui/label'
import { computeTotals } from '@/lib/money'
import { cn } from '@/lib/utils'

import {
  createDraftQuote,
  generateQuoteItems,
  generateQuoteTiers,
  saveLineItems,
  saveQuoteTiers,
} from './actions'
import { TierReview, type DraftTier } from './tier-review'

// -----------------------------------------------------------------------------

export type CatalogItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  base_price: number
  unit: string
}

type LineItem = {
  key: string
  name: string
  description: string
  quantity: number
  unit_price: number
  is_upsell?: boolean
  is_discount?: boolean
}

// -----------------------------------------------------------------------------

export function QuoteEditor({
  companyId,
  defaultTaxRate,
  catalog,
}: {
  companyId: string
  defaultTaxRate: number
  catalog: CatalogItem[]
}) {
  const router = useRouter()

  // Customer + description state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')

  // Line items + tax
  const [items, setItems] = useState<LineItem[]>([])
  const [taxRate, setTaxRate] = useState(defaultTaxRate)
  const [workItemId, setWorkItemId] = useState<string | null>(null)

  // Catalog picker + AI panel
  const [aiOpen, setAiOpen] = useState(false)

  const [aiPrompt, setAiPrompt] = useState('')
  // Whether this quote goes out as one price or three. The contractor's call,
  // made before anything is generated — it changes what the customer decides
  // between, so it is not something to infer.
  const [aiMode, setAiMode] = useState<'single' | 'options'>('single')
  const [tiers, setTiers] = useState<DraftTier[] | null>(null)
  const [generating, startAi] = useTransition()
  const [saving, startSave] = useTransition()

  // Totals
  // Same function the save action uses, so what is shown is what is stored.
  // With options in play the summary tracks the recommended tier — the figure
  // the contractor expects to win. Computing from the flat `items` list left it
  // reading $0.00 next to three priced options.
  const { subtotal, taxAmount, total } = useMemo(() => {
    const kept = tiers?.filter((t) => t.include) ?? []
    if (kept.length >= 2) {
      const headline = kept.find((t) => t.isRecommended) ?? kept[kept.length - 1]
      return computeTotals(headline.items, taxRate)
    }
    return computeTotals(items, taxRate)
  }, [items, tiers, taxRate])

  // ---- item mutations -------------------------------------------------------

  function addItem(item: Partial<LineItem> = {}) {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        ...item,
      },
    ])
  }

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }


  // ---- AI generation --------------------------------------------------------

  async function runAiGenerateTiers() {
    const prompt = (aiPrompt.trim() || description).trim()
    if (!prompt) {
      toast.error('Describe the job first.')
      return
    }
    startAi(async () => {
      const res = await generateQuoteTiers({ description: prompt, tax_rate: taxRate })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setTiers(
        res.data.tiers.map((t) => ({
          tier: t.tier,
          name: t.name,
          description: t.description,
          isRecommended: t.isRecommended,
          include: true,
          items: t.line_items.map((li) => ({
            key: crypto.randomUUID(),
            name: li.name,
            description: li.description ?? '',
            quantity: li.quantity,
            unit_price: li.unit_price,
          })),
        })),
      )
      setAiOpen(false)
      toast.success(`Built ${res.data.tiers.length} options`, {
        description: 'Review them before you send.',
      })
    })
  }

  async function runAiGenerate() {
    if (!aiPrompt.trim() && !description.trim()) {
      toast.error('Add a description first.')
      return
    }
    const prompt = aiPrompt.trim() || description
    startAi(async () => {
      // company_id is derived from the session inside the action — never sent
      // from here. See actions.ts.
      const res = await generateQuoteItems({
        description: prompt,
        customer_name: customerName || undefined,
        customer_address: address || undefined,
      })

      if (!res.ok) {
        toast.error(res.error)
        return
      }

      const data = res.data
      setItems(
        data.line_items.map((li) => ({
          key: crypto.randomUUID(),
          name: li.name,
          description: li.description ?? '',
          quantity: li.quantity,
          unit_price: li.unit_price,
          is_upsell: li.is_upsell,
          is_discount: li.is_discount,
        })),
      )
      if (typeof data.tax_rate === 'number') setTaxRate(data.tax_rate)
      toast.success(`Generated ${data.line_items.length} items`)
      setAiOpen(false)
    })
  }

  // ---- save -----------------------------------------------------------------

  async function save() {
    if (!customerName.trim()) {
      toast.error('Add a customer name.')
      return
    }
    const keptTiers = tiers?.filter((t) => t.include) ?? []
    const savingTiers = keptTiers.length >= 2
    if (tiers && keptTiers.length === 0) {
      toast.error('Keep at least one option, or discard them.')
      return
    }
    // Unticking down to one is the contractor saying "just send this one". They
    // have already made the choice, so it goes out as an ordinary quote rather
    // than as a set of options with a single column.
    const singleFromTier = tiers && keptTiers.length === 1 ? keptTiers[0] : null
    const outgoingItems = singleFromTier
      ? singleFromTier.items.map((i) => ({
          name: i.name,
          description: i.description || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          is_upsell: false,
          is_discount: false,
        }))
      : items.map((i) => ({
          name: i.name,
          description: i.description || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          is_upsell: i.is_upsell ?? false,
          is_discount: i.is_discount ?? false,
        }))

    if (!savingTiers && outgoingItems.length === 0) {
      toast.error('Add at least one line item.')
      return
    }

    startSave(async () => {
      let currentId = workItemId
      if (!currentId) {
        const res = await createDraftQuote({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          address,
          description: description || 'Quote',
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        currentId = res.data.id
        setWorkItemId(currentId)
      }

      if (savingTiers) {
        const res = await saveQuoteTiers({
          work_item_id: currentId,
          tax_rate: taxRate,
          tiers: keptTiers.map((t) => ({
            tier: t.tier,
            name: t.name,
            description: t.description,
            is_recommended: t.isRecommended,
            items: t.items.map((i) => ({
              name: i.name,
              description: i.description || null,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
          })),
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success(`Quote saved with ${keptTiers.length} options`)
        router.push('/app/pipeline')
        return
      }

      const saveRes = await saveLineItems({
        work_item_id: currentId,
        items: outgoingItems.map((i, idx) => ({ ...i, sort_order: idx })),
        tax_rate: taxRate,
      })
      if (!saveRes.ok) {
        toast.error(saveRes.error)
        return
      }

      toast.success(singleFromTier ? `Quote saved — ${singleFromTier.name}` : 'Quote saved')
      router.push('/app/pipeline')
    })
  }

  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header. Actions drop to their own row on a phone — side by side with the
          title there is not room for a breadcrumb and two labelled buttons, and
          the breadcrumb wraps into the title. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-transform hover:bg-muted hover:text-foreground active:scale-95 active:bg-muted lg:-ml-1 lg:h-8 lg:w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-xs text-muted-foreground">Workspace / New quote</div>
            <h1 className="truncate text-2xl font-semibold tracking-tight">Quote draft</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={save} disabled={saving} className="flex-1 gap-1.5 shadow-sm sm:flex-none">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save quote
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Customer card */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className="flex items-center gap-2 border-b border-border/70 px-5 py-3.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Customer</h2>
            </header>
            <div className="space-y-4 p-5">
              <CustomerLookup
                value={{ name: customerName, email: customerEmail, phone: customerPhone, address }}
                disabled={saving}
                onChange={(next) => {
                  if (next.name !== undefined) setCustomerName(next.name)
                  if (next.email !== undefined) setCustomerEmail(next.email)
                  if (next.phone !== undefined) setCustomerPhone(next.phone)
                  if (next.address !== undefined) setAddress(next.address)
                }}
              />
              <FieldRow className="sm:col-span-2">
                <Label htmlFor="description" className="text-sm font-medium">Job description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Replace 3-ton AC condenser, add UV light in air handler, include a maintenance plan."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  This is what we use to draft line items. Be as specific as you’d tell a colleague.
                </p>
              </FieldRow>
            </div>
          </section>

          {/* Options replace the flat list while they exist — one quote is
              either a single price or a set of them, never both. */}
          {tiers ? (
            <TierReview
              tiers={tiers}
              taxRate={taxRate}
              onChange={setTiers}
              onDiscard={() => setTiers(null)}
            />
          ) : (
            <section className="rounded-xl border border-border/70 bg-card shadow-sm">
              <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Line items</h2>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                {/* Drafting lives with the lines it drafts. This used to sit in
                    the page header, two cards away from the thing it changes. */}
                <button
                  onClick={() => setAiOpen(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 lg:min-h-0"
                >
                  <Sparkles className="h-3 w-3" />
                  Draft with AI
                </button>
              </header>

              {items.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Sparkles className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">No line items yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start typing below to pull from your price book, or draft the whole quote with AI.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {items.map((it, idx) => (
                    <LineItemRow
                      key={it.key}
                      idx={idx}
                      item={it}
                      onChange={(patch) => updateItem(it.key, patch)}
                      onRemove={() => removeItem(it.key)}
                    />
                  ))}
                </div>
              )}

              <div className="border-t border-border/70">
                <AddLineItem
                  catalog={catalog}
                  onAdd={(item) => addItem({ ...item, quantity: 1 })}
                />
              </div>
            </section>
          )}
        </div>

        {/* Right column — totals */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular text-foreground">{fmtMoney(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <dt className="flex items-center gap-1.5">
                  Tax
                  <input
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="h-6 w-14 rounded border border-input bg-background px-1 text-xs tabular"
                  />
                  <span>%</span>
                </dt>
                <dd className="tabular text-foreground">{fmtMoney(taxAmount)}</dd>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-lg font-semibold tabular">{fmtMoney(total)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Use “Save quote” above — drafts stay private until you send.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-sm font-semibold">One-click drafting</div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Drafts a quote from your {catalog.length} catalog items with real prices — in seconds.
            </p>
          </div>
        </aside>
      </div>

      {/* AI prompt panel */}
      {aiOpen && (
        <AiPanel
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          suggestedPrompt={description}
          generating={generating}
          mode={aiMode}
          setMode={setAiMode}
          onGenerate={aiMode === 'options' ? runAiGenerateTiers : runAiGenerate}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------

function LineItemRow({
  idx,
  item,
  onChange,
  onRemove,
}: {
  idx: number
  item: LineItem
  onChange: (patch: Partial<LineItem>) => void
  onRemove: () => void
}) {
  const rowTotal = item.quantity * item.unit_price
  return (
    <div className="group flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-3 sm:px-5">
      <div className="min-w-0">
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Line item name"
          className="w-full bg-transparent text-sm font-medium focus:outline-none"
        />
        <input
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Optional description"
          className="mt-0.5 w-full bg-transparent text-xs text-muted-foreground focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-between gap-2 sm:contents">
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onChange({ quantity: Number(e.target.value) })}
          className="h-8 w-14 rounded border border-input bg-background px-2 text-right text-sm tabular sm:w-16"
        />
        <span className="text-xs text-muted-foreground">×</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          type="number"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => onChange({ unit_price: Number(e.target.value) })}
          className="h-8 w-20 rounded border border-input bg-background px-2 text-right text-sm tabular sm:w-24"
        />
      </div>
      <div className="w-20 text-right text-sm font-semibold tabular sm:w-24">
        {fmtMoney(rowTotal)}
      </div>
      <button
        onClick={onRemove}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`Remove row ${idx + 1}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------

function AiPanel({
  prompt,
  setPrompt,
  suggestedPrompt,
  generating,
  mode,
  setMode,
  onGenerate,
  onClose,
}: {
  prompt: string
  setPrompt: (v: string) => void
  suggestedPrompt: string
  generating: boolean
  mode: 'single' | 'options'
  setMode: (m: 'single' | 'options') => void
  onGenerate: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <header className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Draft this quote</div>
            <div className="text-[11px] text-muted-foreground">Grounded in your catalog</div>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="space-y-3 p-5">
          {/* One price or three is a judgement about this customer, so the
              contractor chooses before anything is generated. */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['single', 'One quote', 'A single price'],
                ['options', 'Three options', 'Good / better / best'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  mode === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/60',
                )}
              >
                <div className="text-sm font-medium">{label}</div>
                <div className="text-[11px] text-muted-foreground">{hint}</div>
              </button>
            ))}
          </div>

          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={suggestedPrompt || "Describe the job in plain English — we'll build the quote."}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {!prompt.trim() && suggestedPrompt && (
            <button
              onClick={() => setPrompt(suggestedPrompt)}
              className="text-xs text-primary hover:underline"
            >
              Use my job description
            </button>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="h-9">
              Cancel
            </Button>
            <Button onClick={onGenerate} disabled={generating} className="h-9 gap-1.5 shadow-sm">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {mode === 'options'
              ? 'Three options, each building on the one before. You review them before sending.'
              : 'Priced from your catalog. Nothing is sent until you save.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------

function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
