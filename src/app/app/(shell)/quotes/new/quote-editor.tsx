'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ArrowLeft, ChevronDown, Info, Loader2, Save, Sparkles, Trash2, User, X, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { formatQuantity } from '@/lib/format'

import { Button } from '@/components/ui/button'

import { AddLineItem } from './add-line-item'
import { DraftQuestions } from './draft-questions'
import { CustomerLookup } from './customer-lookup'
import { Label } from '@/components/ui/label'
import { computeTotals } from '@/lib/money'
import { cn } from '@/lib/utils'

import {
  createDraftQuote,
  editQuoteWithAi,
  generateQuoteItems,
  getQuoteConversation,
  recommendLineItems,
  saveLineItems,
} from './actions'
import type { Recommendation } from '@/lib/quotes/recommend'

// -----------------------------------------------------------------------------

export type CatalogItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  base_price: number
  unit: string
}

type ChatMsg = { role: 'user' | 'assistant'; text: string }

type LineItem = {
  key: string
  name: string
  description: string
  quantity: number
  unit_price: number
  unit?: string | null
  is_upsell?: boolean
  is_discount?: boolean
}

// -----------------------------------------------------------------------------

export type InitialCustomer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  job_count: number
}

export function QuoteEditor({
  defaultTaxRate,
  catalog,
  initialCustomer,
}: {
  defaultTaxRate: number
  catalog: CatalogItem[]
  initialCustomer?: InitialCustomer | null
}) {
  const router = useRouter()

  // Customer + description state
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? '')
  // Filled customers fold to one line — the card was half the page standing
  // between the contractor and the line items.
  const [customerOpen, setCustomerOpen] = useState(!initialCustomer?.name)
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone ?? '')
  const [address, setAddress] = useState(initialCustomer?.address ?? '')
  // Only set when an address is picked from the suggestions; typed addresses
  // leave these empty and the row stores just the street line, as before.
  const [addressParts, setAddressParts] = useState({
    city: initialCustomer?.city ?? '',
    state: initialCustomer?.state ?? '',
    zip: initialCustomer?.zip ?? '',
  })
  // What produced the last draft — always `gemini:<model>` now. An unavailable
  // model fails the action with a visible error instead of degrading, so the
  // old keyword-match warning path no longer exists.
  const [draftMode, setDraftMode] = useState<string | null>(null)
  const [questions, setQuestions] = useState<{ question: string; options: string[] }[]>([])
  const [unmet, setUnmet] = useState<string[]>([])
  // Set when an existing customer was picked, so the draft links to that record
  // rather than being re-derived from contact details.
  const [customerId, setCustomerId] = useState<string | null>(initialCustomer?.id ?? null)
  const [description, setDescription] = useState('')

  // Line items + tax
  const [items, setItems] = useState<LineItem[]>([])
  const [taxRate, setTaxRate] = useState(defaultTaxRate)
  const [workItemId, setWorkItemId] = useState<string | null>(null)
  // The quoting conversation, shown as a trail in the AI dialog. Hydrated from
  // the persisted ADK session when the dialog opens on a saved quote, appended
  // to locally as turns happen — so "add 10% off" sits under "install smart
  // thermostat" and either can be tapped to run a variant.
  const [thread, setThread] = useState<ChatMsg[]>([])
  const hydratedRef = useRef(false)

  // Catalog picker + AI panel
  const [aiOpen, setAiOpen] = useState(false)
  useEffect(() => {
    if (!aiOpen || !workItemId || hydratedRef.current) return
    hydratedRef.current = true
    getQuoteConversation({ work_item_id: workItemId }).then((res) => {
      if (res.ok && res.data.messages.length) {
        setThread((t) => (t.length ? t : res.data.messages))
      }
    })
  }, [aiOpen, workItemId])

  const [aiPrompt, setAiPrompt] = useState('')

  /*
    "Goes with this job" — the replacement for the dropped three-options
    feature. As lines land, suggest what this company historically quotes
    alongside them; one tap adds the line. Debounced off the current names so
    typing and agent turns both refresh it without hammering the action.
  */
  const [recs, setRecs] = useState<Recommendation[]>([])
  const namesSig = items
    .filter((i) => !i.is_discount && i.name.trim())
    .map((i) => i.name.trim().toLowerCase())
    .sort()
    .join('|')
  useEffect(() => {
    const t = setTimeout(() => {
      if (!namesSig) {
        setRecs([])
        return
      }
      recommendLineItems({ names: namesSig.split('|') }).then((r) => {
        if (r.ok) setRecs(r.data.items)
      })
    }, 400)
    return () => clearTimeout(t)
  }, [namesSig])
  const currentNames = new Set(namesSig.split('|'))
  const visibleRecs = recs.filter((r) => !currentNames.has(r.name.trim().toLowerCase()))
  const [generating, startAi] = useTransition()
  const [aiJobName, setAiJobName] = useState<string | null>(null)
  // Clarifying answers feed the next draft without polluting the visible
  // description — the description is the contractor's words, not a Q&A log.
  const [draftContext, setDraftContext] = useState('')
  const [saving, startSave] = useTransition()

  // Totals
  // Same function the save action uses, so what is shown is what is stored.
  // With options in play the summary tracks the recommended tier — the figure
  // the contractor expects to win. Computing from the flat `items` list left it
  // reading $0.00 next to three priced options.
  const { subtotal, taxAmount, total } = useMemo(
    () => computeTotals(items, taxRate),
    [items, taxRate],
  )

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

  async function runAiGenerate() {
    if (!aiPrompt.trim() && !description.trim()) {
      toast.error('Add a description first.')
      return
    }
    const rawPrompt = aiPrompt.trim() || description
    const prompt = draftContext ? `${rawPrompt}\n${draftContext}`.trim() : rawPrompt
    // Persist what the contractor actually described. The job text lives in the
    // AI prompt box; without this it never reaches `description`, which then
    // saved as the literal "Quote" and fed the AI a non-job on the next pass.
    if (!description.trim()) setDescription(rawPrompt)
    // Chat behaviour: the ask goes up into the trail the moment Send is hit
    // and the box clears. Leaving the text sitting editable while the model
    // worked read as "did that even send?" — the bubble is the receipt. On a
    // failure the bubble stays and tapping it puts the text back in the box.
    setThread((t) => [...t, { role: 'user', text: prompt }])
    setAiPrompt('')
    startAi(async () => {
      /*
        Two different operations, and the distinction is the whole point.

        A quote with no lines yet has nothing to edit, so the first draft is a
        *generation* — one model call, a whole list, nothing to lose.

        Everything after that is an *edit*. The agent calls tools that mutate
        quote_items, so "add 10% off" changes one thing and leaves the rest
        alone, instead of regenerating and discarding every price the
        contractor adjusted by hand.

        The condition is "are there lines", not "have we saved". Gating on the
        saved id looked equivalent and was not: on this screen nothing is saved
        until the contractor presses Save, which is *after* all the iterating,
        so every follow-up instruction still regenerated. If there are lines and
        no row yet, the row is created here — a draft quote is a real thing, and
        it stays private until sent either way.
      */
      let editableId = workItemId
      /*
        A modification must never silently regenerate.

        With lines on the quote but no customer name, the draft row cannot be
        created, so the agent has nothing to edit — and falling through to
        generation sent "give 10% discount" to the drafting model as if it
        were a whole job, which replaced the quote (or, correctly, drafted
        nothing and read as an outage). Ask for the one missing fact instead.
      */
      if (!editableId && items.length > 0 && !customerName.trim()) {
        setThread((t) => [
          ...t,
          {
            role: 'assistant',
            text: 'Add the customer’s name first — I need it to save this quote before I can keep editing it. Your lines are safe.',
          },
        ])
        return
      }
      if (!editableId && items.length > 0 && customerName.trim()) {
        const created = await createDraftQuote({
          customer_id: customerId ?? undefined,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          address,
          city: addressParts.city,
          state: addressParts.state,
          zip: addressParts.zip,
          description: description.trim() || prompt,
        })
        if (created.ok) {
          editableId = created.data.id
          setWorkItemId(editableId)
          // The lines only exist in React state until now; the agent reads them
          // from the database, so they have to be there before it runs.
          await saveLineItems({
            work_item_id: editableId,
            job_name: aiJobName ?? undefined,
            items: items.map((i, idx) => ({
              name: i.name,
              description: i.description || null,
              quantity: i.quantity,
              unit_price: i.unit_price,
              is_upsell: i.is_upsell,
              is_discount: i.is_discount,
              sort_order: idx,
            })),
            tax_rate: taxRate,
          })
        }
      }

      if (editableId) {
        const res = await editQuoteWithAi({ work_item_id: editableId, message: prompt })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        // The agent wrote to the database behind us, so local state is stale —
        // take the quote it returns rather than trying to replay its edits.
        setItems(
          res.data.quote.items.map((li) => ({
            key: crypto.randomUUID(),
            name: li.name,
            description: li.description ?? '',
            quantity: Number(li.quantity),
            unit_price: Number(li.unit_price),
            unit: li.unit ?? null,
            is_upsell: false,
            is_discount: li.is_discount,
          })),
        )
        setDraftMode('agent')
        // The dialog stays open: this is a conversation, and the reply belongs
        // in the trail under the ask — not in a toast that vanishes.
        setThread((t) => [
          ...t,
          {
            role: 'assistant',
            // An empty reply must not become a claim. Say what ran; zero tool
            // calls means zero changes, and the contractor should know that.
            text:
              res.data.reply ||
              (res.data.toolCalls.length > 0
                ? `Done — applied ${res.data.toolCalls.length} change${res.data.toolCalls.length === 1 ? '' : 's'}.`
                : 'I didn’t make any changes — try telling me the line and the change you want.'),
          },
        ])
        return
      }

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
      setDraftMode(data.mode)
      setQuestions(data.questions ?? [])
      setUnmet(data.unmet ?? [])
      setItems(
        data.line_items.map((li) => ({
          key: crypto.randomUUID(),
          name: li.name,
          description: li.description ?? '',
          quantity: li.quantity,
          unit_price: li.unit_price,
          unit: li.unit,
          is_upsell: li.is_upsell,
          is_discount: li.is_discount,
        })),
      )
      if (typeof data.tax_rate === 'number') setTaxRate(data.tax_rate)
      if (data.job_name) setAiJobName(data.job_name)
      setThread((t) => [
        ...t,
        {
          role: 'assistant',
          text:
            data.line_items.length > 0
              ? `Drafted ${data.line_items.length} line item${data.line_items.length === 1 ? '' : 's'} from your price book.` +
                (data.unmet?.length ? ` Not in your price book: ${data.unmet.join(', ')}.` : '')
              : data.questions?.length
                ? data.questions[0].question
                : data.reasoning,
        },
      ])
      if (data.line_items.length > 0) toast.success(`Drafted ${data.line_items.length} items`)
    })
  }

  // ---- save -----------------------------------------------------------------

  async function save() {
    if (!customerName.trim()) {
      toast.error('Add a customer name.')
      return
    }
    const outgoingItems = items.map((i) => ({
      name: i.name,
      description: i.description || null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      is_upsell: i.is_upsell ?? false,
      is_discount: i.is_discount ?? false,
    }))

    if (outgoingItems.length === 0) {
      toast.error('Add at least one line item.')
      return
    }

    startSave(async () => {
      let currentId = workItemId
      if (!currentId) {
        const res = await createDraftQuote({
          customer_id: customerId ?? undefined,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          address,
          city: addressParts.city,
          state: addressParts.state,
          zip: addressParts.zip,
          description: description.trim() || aiPrompt.trim() || undefined,
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
        job_name: aiJobName ?? undefined,
        items: outgoingItems.map((i, idx) => ({ ...i, sort_order: idx })),
        tax_rate: taxRate,
      })
      if (!saveRes.ok) {
        toast.error(saveRes.error)
        return
      }

      toast.success('Quote saved')
      router.push(`/app/pipeline/${currentId}`)
    })
  }

  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 sm:pb-24 lg:px-10 lg:py-8">
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
      </div>

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* The product's whole promise, first. The AI entry point was a
              text-xs chip inside the third card — invisible on a phone until
              you scrolled past two forms. */}
          {items.length === 0 && (
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold">Start with the job</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Describe it in plain words — the line items come from your price book,
                priced and ready to send.
              </p>
              <Button onClick={() => setAiOpen(true)} className="mt-4 h-12 w-full gap-2 text-base sm:h-11 sm:w-auto sm:px-6">
                <Sparkles className="h-4 w-4" />
                Build the quote
              </Button>
            </section>
          )}

          {/* Customer card */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header
              className={
                customerOpen
                  ? 'flex items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5'
                  : 'flex items-center justify-between gap-2 px-5 py-3.5'
              }
            >
              <div className="flex min-w-0 items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Customer</h2>
                {!customerOpen && customerName && (
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    — {customerName}
                    {customerPhone ? ` · ${customerPhone}` : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCustomerOpen((v) => !v)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {customerOpen ? 'Collapse' : 'Edit'}
              </button>
            </header>
            {customerOpen && (
            <div className="space-y-4 p-5">
              <CustomerLookup
                value={{
                  name: customerName,
                  email: customerEmail,
                  phone: customerPhone,
                  address,
                  ...addressParts,
                }}
                disabled={saving}
                initialLinked={initialCustomer}
                onChange={(next) => {
                  if (next.customerId !== undefined) setCustomerId(next.customerId)
                  if (next.name !== undefined) setCustomerName(next.name)
                  if (next.email !== undefined) setCustomerEmail(next.email)
                  if (next.phone !== undefined) setCustomerPhone(next.phone)
                  if (next.address !== undefined) setAddress(next.address)
                  if (next.city !== undefined || next.state !== undefined || next.zip !== undefined) {
                    setAddressParts((p) => ({
                      city: next.city ?? p.city,
                      state: next.state ?? p.state,
                      zip: next.zip ?? p.zip,
                    }))
                  }
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
            )}
          </section>

          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
              <DraftQuestions
                questions={questions}
                unmet={unmet}
                disabled={generating}
                onAnswer={(question, option) => {
                  // The answer feeds the next draft; the description stays the
                  // contractor's own words instead of becoming a Q&A log.
                  setDraftContext((c) => `${c}\n${question} ${option}`.trim())
                  setQuestions((qs) => qs.filter((q) => q.question !== question))
                  toast.success('Got it — draft again to use it.')
                }}
              />
              {draftMode?.startsWith('gemini') && (
                /*
                  The successful case needs saying too, and nothing said it.
                  Once the customer accepts, the price on this quote is what the
                  contractor has agreed to do the work for — a wrong line is
                  their loss, not a bad suggestion they can withdraw. Deliberately
                  quiet rather than alarming: the amber banner above is for the
                  failure the contractor must act on, and if both shouted neither
                  would be read.
                */
                <div className="flex items-start gap-2 border-b border-border/70 bg-muted/30 px-5 py-2.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Drafted from your price book. Check the quantities and prices —
                    once your customer approves, this is the price you’ve agreed to.
                  </p>
                </div>
              )}
              <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Line items</h2>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                {/* Drafting lives with the lines it drafts. This used to sit in
                    the page header, two cards away from the thing it changes. */}
                <Button onClick={() => setAiOpen(true)} size="sm" variant="outline" className="h-11 gap-1.5 lg:h-8">
                  <Sparkles className="h-3.5 w-3.5" />
                  Smart draft
                </Button>
              </header>

              {items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-medium">No line items yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Type below to pull from your price book, or let the AI draft the whole thing.
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

              {visibleRecs.length > 0 && (
                <div className="border-t border-border/70 px-4 py-3 sm:px-5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Goes with this job
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visibleRecs.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        title={r.together > 0 ? `Quoted together ${r.together} time${r.together === 1 ? '' : 's'}` : 'Similar to what is on this quote'}
                        onClick={() =>
                          addItem({
                            name: r.name,
                            description: r.description ?? '',
                            quantity: 1,
                            unit_price: r.base_price,
                            unit: r.unit,
                          })
                        }
                        className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <span className="max-w-[180px] truncate font-medium">{r.name}</span>
                        <span className="tabular text-muted-foreground">{fmtMoney(r.base_price)}</span>
                        <span className="font-semibold text-primary">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-border/70">
                <AddLineItem
                  catalog={catalog}
                  onAdd={(item) => addItem({ ...item, quantity: 1 })}
                />
              </div>
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
            {/* Desktop save lives with the total in the sticky rail, so the CTA
                never scrolls away. Below lg the fixed bottom bar owns it. */}
            <Button
              onClick={save}
              disabled={saving}
              className="mt-4 hidden w-full gap-1.5 shadow-sm lg:flex"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save quote
            </Button>
            <p className="mt-4 text-center text-[11px] text-muted-foreground lg:mt-3">
              Drafts stay private until you send.
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
          onGenerate={runAiGenerate}
          isEditing={items.length > 0}
          thread={thread}
          items={items}
          onClose={() => setAiOpen(false)}
        />
      )}

      {/* Thumb-reachable primary action, up to lg — the header button scrolled
          away with the page. bottom-16 clears the mobile tab bar; from sm there
          is no tab bar, so the bar sits on the true bottom. */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:bottom-0 lg:hidden">
        <Button onClick={save} disabled={saving} className="w-full gap-1.5 shadow-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save quote
        </Button>
      </div>
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
          className="w-full bg-transparent text-base font-medium focus:outline-none sm:text-sm"
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
        {/* The unit the price book sells this in — the difference between
            "3 condensers" and "3 tons". Read-only: it belongs to the item. */}
        {item.unit && item.unit !== 'each' && (
          <span className="text-[11px] text-muted-foreground">{item.unit} ·</span>
        )}
        <input
          type="number"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onChange({ quantity: Number(e.target.value) })}
          className="h-11 w-16 rounded border border-input bg-background px-2 text-right text-base tabular sm:text-sm lg:h-8"
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
          className="h-11 w-24 rounded border border-input bg-background px-2 text-right text-base tabular sm:text-sm lg:h-8"
        />
      </div>
      <div className="w-24 text-right text-base font-semibold tabular sm:text-sm">
        {fmtMoney(rowTotal)}
      </div>
      <button
        onClick={onRemove}
        className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive lg:h-7 lg:w-7 lg:opacity-0 lg:group-hover:opacity-100"
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
  onGenerate,
  onClose,
  isEditing,
  thread,
  items,
}: {
  prompt: string
  setPrompt: (v: string) => void
  suggestedPrompt: string
  generating: boolean
  onGenerate: () => void
  onClose: () => void
  /** An existing quote is edited in place; a new one is generated. */
  isEditing?: boolean
  /** The quoting conversation so far — the trail the next ask builds on. */
  thread: ChatMsg[]
  /**
   * The live line items — the same state each turn updates, shown beside the
   * conversation so the contractor watches the quote change instead of
   * closing the dialog to check and reopening to continue.
   */
  items: LineItem[]
}) {
  const hasThread = thread.length > 0
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.length, generating])


  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const [mobileItemsOpen, setMobileItemsOpen] = useState(false)

  const miniLine = (i: LineItem, idx: number) => (
    <div
      key={`${i.name}|${i.quantity}|${i.unit_price}-${idx}`}
      className="flex items-baseline justify-between gap-3 px-4 py-2 text-xs"
    >
      <div className="min-w-0">
        <div className={cn('truncate font-medium', i.is_discount && 'text-emerald-600')}>
          {i.name}
        </div>
        {(i.quantity !== 1 || (i.unit && i.unit !== 'each')) && (
          <div className="text-[11px] tabular text-muted-foreground">
            {formatQuantity(i.quantity, i.unit)} × {fmtMoney(i.unit_price)}
          </div>
        )}
      </div>
      <div className={cn('shrink-0 tabular', i.is_discount && 'text-emerald-600')}>
        {fmtMoney(i.quantity * i.unit_price)}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl lg:max-w-4xl">
        <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {isEditing ? 'Change this quote' : 'Draft this quote'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {isEditing
                ? 'Ask for a change — the rest of the quote stays as it is'
                : 'Grounded in your price book'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted lg:h-7 lg:w-7">
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* On phones there is no room for a side pane, so the quote rides
            along as a summary bar: count + running total always visible, tap
            to unfold the lines. Same state, same freshness accents. */}
        {items.length > 0 && (
          <div className="border-b border-border/70 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileItemsOpen((v) => !v)}
              aria-expanded={mobileItemsOpen}
              className="flex h-11 w-full items-center justify-between px-4 text-xs"
            >
              <span className="text-muted-foreground">
                {items.length} line item{items.length === 1 ? '' : 's'} on this quote
              </span>
              <span className="flex items-center gap-1.5 font-semibold tabular">
                {fmtMoney(subtotal)}
                <ChevronDown
                  className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', mobileItemsOpen && 'rotate-180')}
                />
              </span>
            </button>
            {mobileItemsOpen && (
              <div className="max-h-44 divide-y divide-border/50 overflow-y-auto border-t border-border/50">
                {items.map(miniLine)}
              </div>
            )}
          </div>
        )}

        {/* The trail. Every ask so far is a chip — tap one to put it back in
            the box, change it, and send a variant. The conversation persists
            with the quote, so this survives leaving and coming back. */}
        {hasThread && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto border-b border-border/70 px-5 py-4">
            {thread.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPrompt(m.text)}
                    title="Tap to edit and resend"
                    className="max-w-[85%] rounded-2xl rounded-br-sm border border-primary/20 bg-primary/10 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary/15"
                  >
                    {m.text}
                  </button>
                </div>
              ) : (
                <div key={i} className="flex">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
                    {m.text}
                  </div>
                </div>
              ),
            )}
            {generating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Working…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        <div className="space-y-3 p-5">
          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
            placeholder={
              hasThread || isEditing
                ? 'Ask for the next change…'
                : suggestedPrompt || "Describe the job in plain English — we'll build the quote."
            }
            rows={hasThread ? 2 : 5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          {!hasThread && !prompt.trim() && suggestedPrompt && (
            <button
              onClick={() => setPrompt(suggestedPrompt)}
              className="text-xs text-primary hover:underline"
            >
              Use my job description
            </button>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="h-11 lg:h-9">
              {hasThread ? 'Done' : 'Cancel'}
            </Button>
            <Button onClick={onGenerate} disabled={generating || !prompt.trim()} className="h-11 gap-1.5 shadow-sm lg:h-9">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {hasThread || isEditing ? 'Send' : 'Generate'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Priced from your price book. Nothing is sent until you save.
          </p>
        </div>
        </div>

        {/* Desktop: the quote as it stands, beside the conversation. Reads the
            same state each agent turn rewrites, so a change lands here the
            moment the reply does — no closing the dialog to check. */}
        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-border/70 bg-muted/20 lg:flex">
          <div className="border-b border-border/70 px-4 py-3 text-xs font-semibold">
            This quote
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs leading-relaxed text-muted-foreground">
              Nothing drafted yet — describe the job and the lines will appear
              here as they land.
            </p>
          ) : (
            <div className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto">
              {items.map(miniLine)}
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border/70 px-4 py-3 text-sm">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <span className="font-semibold tabular">{fmtMoney(subtotal)}</span>
          </div>
        </aside>
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
