'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import {
  ArrowLeft,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import { createDraftQuote, generateQuoteItems, saveLineItems } from './actions'

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
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, startAi] = useTransition()
  const [saving, startSave] = useTransition()

  // Totals
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items])
  const taxAmount = useMemo(() => Math.round(subtotal * taxRate) / 100, [subtotal, taxRate])
  const total = subtotal + taxAmount

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

  function pickCatalog(c: CatalogItem) {
    addItem({
      name: c.name,
      description: c.description ?? '',
      quantity: 1,
      unit_price: c.base_price,
    })
    setCatalogOpen(false)
  }

  // ---- AI generation --------------------------------------------------------

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
    if (items.length === 0) {
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

      const saveRes = await saveLineItems({
        work_item_id: currentId,
        items: items.map((i, idx) => ({
          name: i.name,
          description: i.description || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          sort_order: idx,
          is_upsell: i.is_upsell ?? false,
          is_discount: i.is_discount ?? false,
        })),
        tax_rate: taxRate,
      })
      if (!saveRes.ok) {
        toast.error(saveRes.error)
        return
      }

      toast.success('Quote saved')
      router.push('/app/pipeline')
    })
  }

  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="text-xs text-muted-foreground">Workspace / New quote</div>
            <h1 className="text-2xl font-semibold tracking-tight">Quote draft</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAiOpen(true)}
            variant="outline"
            className="h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft quote
          </Button>
          <Button onClick={save} disabled={saving} className="h-9 gap-1.5 shadow-sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
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
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <FieldRow>
                <Label htmlFor="customer_name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Sarah Johnson"
                  className="h-10"
                  required
                />
              </FieldRow>
              <FieldRow>
                <Label htmlFor="customer_phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="customer_phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-10"
                />
              </FieldRow>
              <FieldRow>
                <Label htmlFor="customer_email" className="text-sm font-medium">Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="h-10"
                />
              </FieldRow>
              <FieldRow>
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Market St, San Francisco, CA 94103"
                  className="h-10"
                />
              </FieldRow>
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
                  This is what we use to draft line items. Be as specific as you'd tell a colleague.
                </p>
              </FieldRow>
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Line items</h2>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCatalogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Package className="h-3 w-3" />
                  From catalog
                </button>
                <button
                  onClick={() => addItem()}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-3 w-3" />
                  Blank row
                </button>
              </div>
            </header>

            {items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">No line items yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add from your catalog, insert a blank row, or draft one automatically.
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
          </section>
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

      {/* Catalog picker */}
      {catalogOpen && (
        <CatalogPicker
          items={catalog}
          onPick={pickCatalog}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      {/* AI prompt panel */}
      {aiOpen && (
        <AiPanel
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          suggestedPrompt={description}
          generating={generating}
          onGenerate={runAiGenerate}
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

function CatalogPicker({
  items,
  onPick,
  onClose,
}: {
  items: CatalogItem[]
  onPick: (i: CatalogItem) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = items.filter(
    (i) =>
      !q ||
      i.name.toLowerCase().includes(q.toLowerCase()) ||
      (i.description ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (i.category ?? '').toLowerCase().includes(q.toLowerCase()),
  )
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="mt-24 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <header className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catalog…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <span className="text-xs text-muted-foreground tabular">
            {filtered.length}/{items.length}
          </span>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border/70">
          {filtered.slice(0, 50).map((i) => (
            <li key={i.id}>
              <button
                onClick={() => onPick(i)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {i.category ?? 'Uncategorized'}
                    {i.description ? ` · ${i.description}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular">{fmtMoney(i.base_price)}</div>
                  <div className="text-[10px] text-muted-foreground">per {i.unit}</div>
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matches. Try different keywords or add items in the Catalog page.
            </li>
          )}
        </ul>
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
  onGenerate,
  onClose,
}: {
  prompt: string
  setPrompt: (v: string) => void
  suggestedPrompt: string
  generating: boolean
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
            Needs the Python backend running at{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">python-backend/</code>{' '}
            with a Gemini API key.
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
