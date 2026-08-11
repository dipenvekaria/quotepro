'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { computeTotals } from '@/lib/money'
import { cn } from '@/lib/utils'

import { changeStatus, sendQuote, updateWorkItem } from './actions'
import { saveLineItems } from '../../quotes/new/actions'
import { convertToInvoice, recordPayment, sendInvoice } from '@/features/invoices/actions'

// ---------------------------------------------------------------------------

export type LineItem = {
  id?: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  sort_order: number
  is_upsell?: boolean
  is_discount?: boolean
}

type WorkItem = {
  id: string
  status: string
  kind: string
  description: string | null
  notes: string | null
  job_name: string | null
  quote_number: string | null
  subtotal: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  scheduled_start: string | null
  scheduled_end: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  completed_at: string | null
  public_token: string
  created_at: string
  updated_at: string
  assigned_to: string | null
  customers: { id: string; name: string; email: string | null; phone: string | null } | null
  addresses: { address: string | null; city: string | null; state: string | null; zip: string | null } | null
  creator: { email: string; profile: { full_name?: string } | null } | null
  assignee: { email: string; profile: { full_name?: string } | null } | null
}

type Teammate = { id: string; name: string }

export type Invoice = {
  id: string
  invoice_number: string
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  total: number
  amount_paid: number
  sent_at: string | null
  paid_at: string | null
  due_date: string | null
  public_token: string
}

export type Payment = {
  id: string
  amount: number
  method: string
  reference_number: string | null
  paid_at: string
}

// ---------------------------------------------------------------------------

const STATUS_ACTIONS: Record<string, { label: string; to: string; primary?: boolean }[]> = {
  lead: [{ label: 'Convert to quote', to: 'quote_draft', primary: true }],
  quote_draft: [{ label: 'Send quote', to: 'quote_sent', primary: true }],
  quote_sent: [
    { label: 'Mark accepted', to: 'quote_accepted', primary: true },
    { label: 'Mark rejected', to: 'quote_rejected' },
  ],
  quote_viewed: [
    { label: 'Mark accepted', to: 'quote_accepted', primary: true },
    { label: 'Mark rejected', to: 'quote_rejected' },
  ],
  quote_accepted: [{ label: 'Schedule job', to: 'job_scheduled', primary: true }],
  job_scheduled: [{ label: 'Start job', to: 'job_in_progress', primary: true }],
  job_in_progress: [{ label: 'Mark complete', to: 'job_completed', primary: true }],
  job_completed: [],
  quote_rejected: [{ label: 'Restore to draft', to: 'quote_draft' }],
  quote_expired: [{ label: 'Restore to draft', to: 'quote_draft' }],
  job_cancelled: [{ label: 'Restore', to: 'quote_accepted' }],
  archived: [],
}

// ---------------------------------------------------------------------------

export function WorkItemDetail({
  workItem,
  lineItems: initialItems,
  teammates,
  invoice,
  payments,
}: {
  workItem: WorkItem
  lineItems: LineItem[]
  teammates: Teammate[]
  invoice: Invoice | null
  payments: Payment[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<LineItem[]>(initialItems)
  const [description, setDescription] = useState(workItem.description ?? '')
  const [notes, setNotes] = useState(workItem.notes ?? '')
  const [scheduledStart, setScheduledStart] = useState(
    workItem.scheduled_start ? isoToLocal(workItem.scheduled_start) : '',
  )

  const [savingItems, startItemsSave] = useTransition()
  const [savingMeta, startMetaSave] = useTransition()
  const [payOpen, setPayOpen] = useState(false)
  const [invoiceSending, startInvoiceSend] = useTransition()
  const [transitioning, startTransition_] = useTransition()

  const [sendOpen, setSendOpen] = useState(false)
  const [sentToken, setSentToken] = useState<string | null>(null)

  const taxRate = workItem.tax_rate
  const { subtotal, taxAmount, total } = useMemo(
    () => computeTotals(items, taxRate),
    [items, taxRate],
  )

  const actions = STATUS_ACTIONS[workItem.status] ?? []
  const publicUrl = typeof window === 'undefined'
    ? ''
    : `${window.location.origin}/q/${workItem.public_token}`

  // -----------------------------------------------------------------------

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: '', description: '', quantity: 1, unit_price: 0, sort_order: prev.length },
    ])
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function saveItems() {
    startItemsSave(async () => {
      const res = await saveLineItems({
        work_item_id: workItem.id,
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
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Line items saved')
      router.refresh()
    })
  }

  function saveMeta() {
    startMetaSave(async () => {
      const res = await updateWorkItem({
        id: workItem.id,
        description,
        notes,
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Saved')
      router.refresh()
    })
  }

  function transition(to: string) {
    startTransition_(async () => {
      const res = await changeStatus({ id: workItem.id, to: to as never })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Moved to ${to.replaceAll('_', ' ')}`)
      router.refresh()
    })
  }

  function doSend() {
    startTransition_(async () => {
      const res = await sendQuote(workItem.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSentToken(res.data.public_token)
      setSendOpen(true)
      if (res.data.email === 'sent') toast.success('Quote sent — email delivered.')
      else if (res.data.email === 'skipped') toast.info('Quote sent — no email on file, share the link.')
      else if (res.data.email === 'error') toast.warning('Quote sent, but email failed.')
      router.refresh()
    })
  }

  function doSendInvoice() {
    startInvoiceSend(async () => {
      const created = await convertToInvoice(workItem.id)
      if (!created.ok) {
        toast.error(created.error)
        return
      }
      const send = await sendInvoice(created.data.id)
      if (!send.ok) {
        toast.error(send.error)
        return
      }
      if (send.data.email === 'sent') toast.success(`Invoice ${created.data.invoice_number} sent.`)
      else toast.info(`Invoice ${created.data.invoice_number} created — link ready to share.`)
      router.refresh()
    })
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl)
    toast.success('Link copied')
  }

  const customerInitials = (workItem.customers?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join('')
    .toUpperCase()

  const isDraft = workItem.status === 'quote_draft' || workItem.status === 'lead'

  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/app/pipeline" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          Pipeline
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">
          {workItem.quote_number ?? workItem.job_name ?? shortId(workItem.id)}
        </span>
      </div>

      {/* Header */}
      <header className="mt-3 flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-base font-semibold text-primary">
            {customerInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {workItem.customers?.name ?? 'Customer'}
              </h1>
              <StatusBadge status={workItem.status as Parameters<typeof StatusBadge>[0]['status']} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {workItem.customers?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {workItem.customers.email}
                </span>
              )}
              {workItem.customers?.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {workItem.customers.phone}
                </span>
              )}
              {workItem.addresses?.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {workItem.addresses.address}, {workItem.addresses.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action rail */}
        <div className="flex items-center gap-1.5">
          {isDraft && workItem.status === 'quote_draft' ? (
            <Button
              onClick={doSend}
              disabled={transitioning}
              className="h-9 gap-1.5 shadow-sm"
            >
              {transitioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send quote
            </Button>
          ) : (
            <>
              {actions.map((a) => (
                <Button
                  key={a.to}
                  onClick={() => transition(a.to)}
                  disabled={transitioning}
                  variant={a.primary ? 'default' : 'outline'}
                  className="h-9"
                >
                  {a.label}
                </Button>
              ))}
              {(workItem.status === 'quote_accepted' ||
                workItem.status === 'job_scheduled' ||
                workItem.status === 'job_in_progress' ||
                workItem.status === 'job_completed') &&
                !invoice && (
                  <Button
                    onClick={doSendInvoice}
                    disabled={invoiceSending}
                    variant="outline"
                    className="h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                  >
                    {invoiceSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send invoice
                  </Button>
                )}
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Description + notes */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <h2 className="text-sm font-semibold">Details</h2>
              <Button
                onClick={saveMeta}
                disabled={savingMeta}
                size="sm"
                variant="outline"
                className="h-7 gap-1"
              >
                {savingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Save
              </Button>
            </header>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Job description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What's the job?"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Internal notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Only visible to your team"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  <CalendarIcon className="mr-1 inline h-3 w-3" />
                  Scheduled start
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm tabular shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
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
                  onClick={addItem}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  Add row
                </button>
                <Button
                  onClick={saveItems}
                  disabled={savingItems}
                  size="sm"
                  className="h-7 gap-1"
                >
                  {savingItems ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save items
                </Button>
              </div>
            </header>
            {items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium">No line items yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add rows to build up this quote.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {items.map((it, idx) => (
                  <div key={idx} className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <input
                        value={it.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full bg-transparent text-sm font-medium focus:outline-none"
                      />
                      <input
                        value={it.description ?? ''}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Optional description"
                        className="mt-0.5 w-full bg-transparent text-xs text-muted-foreground focus:outline-none"
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      className="h-8 w-16 rounded border border-input bg-background px-2 text-right text-sm tabular"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                        className="h-8 w-24 rounded border border-input bg-background px-2 text-right text-sm tabular"
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-semibold tabular">
                      {fmtMoney(it.quantity * it.unit_price)}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Activity */}
          <Activity workItem={workItem} />
        </div>

        {/* Right column — summary + share */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular text-foreground">{fmtMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Tax ({taxRate}%)</dt>
                <dd className="tabular text-foreground">{fmtMoney(taxAmount)}</dd>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-lg font-semibold tabular">{fmtMoney(total)}</dd>
              </div>
            </dl>
          </div>

          {/* Public link */}
          {(workItem.status !== 'lead' && workItem.status !== 'quote_draft') && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Customer link</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Shareable, no login required.
              </p>
              <div className="mt-3 flex items-center gap-1 rounded-md border border-border bg-background p-1.5">
                <div className="flex-1 truncate px-2 font-mono text-[11px] text-muted-foreground">
                  {publicUrl}
                </div>
                <button
                  onClick={copyLink}
                  className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Copy link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Open"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Assignment */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Team</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Created by</dt>
                <dd className="text-foreground">
                  {workItem.creator?.profile?.full_name ?? workItem.creator?.email ?? 'Unknown'}
                </dd>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <dt>Assigned to</dt>
                <AssignSelect
                  workItemId={workItem.id}
                  current={workItem.assigned_to}
                  teammates={teammates}
                />
              </div>
            </div>
          </div>

          {/* Invoice card */}
          {invoice && (
            <InvoiceCard
              invoice={invoice}
              payments={payments}
              onRecordPayment={() => setPayOpen(true)}
            />
          )}
        </aside>
      </div>

      {/* Sent modal */}
      {sendOpen && sentToken && (
        <SentModal
          publicUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/q/${sentToken}`}
          onClose={() => setSendOpen(false)}
        />
      )}

      {/* Record payment modal */}
      {payOpen && invoice && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setPayOpen(false)}
          onRecorded={() => {
            setPayOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Activity({ workItem }: { workItem: WorkItem }) {
  const events: { label: string; iso: string; icon: typeof User }[] = [
    { label: 'Created', iso: workItem.created_at, icon: User },
    ...(workItem.sent_at ? [{ label: 'Sent to customer', iso: workItem.sent_at, icon: Send }] : []),
    ...(workItem.viewed_at ? [{ label: 'Customer viewed', iso: workItem.viewed_at, icon: User }] : []),
    ...(workItem.accepted_at
      ? [{ label: 'Customer accepted', iso: workItem.accepted_at, icon: CheckCircle2 }]
      : []),
    ...(workItem.rejected_at
      ? [{ label: 'Customer rejected', iso: workItem.rejected_at, icon: X }]
      : []),
    ...(workItem.completed_at
      ? [{ label: 'Job completed', iso: workItem.completed_at, icon: CheckCircle2 }]
      : []),
  ]

  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="border-b border-border/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">Activity</h2>
      </header>
      <ol className="p-5">
        {events
          .slice()
          .reverse()
          .map((e, idx) => {
            const Icon = e.icon
            return (
              <li key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                {idx < events.length - 1 && (
                  <div className="absolute left-3 top-6 h-full w-px bg-border" aria-hidden />
                )}
                <div className={cn(
                  'z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border shadow-sm',
                  idx === 0 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
                )}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-sm font-medium">{e.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(e.iso).toLocaleString()}
                  </div>
                </div>
              </li>
            )
          })}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------

function AssignSelect({
  workItemId,
  current,
  teammates,
}: {
  workItemId: string
  current: string | null
  teammates: Teammate[]
}) {
  const router = useRouter()
  const [busy, startBusy] = useTransition()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null
    startBusy(async () => {
      const res = await updateWorkItem({ id: workItemId, assigned_to: val })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Assignment updated')
      router.refresh()
    })
  }

  return (
    <select
      value={current ?? ''}
      onChange={onChange}
      disabled={busy}
      className="h-7 rounded border border-input bg-background px-1.5 text-xs"
    >
      <option value="">Unassigned</option>
      {teammates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------

function SentModal({ publicUrl, onClose }: { publicUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Send className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Quote is live</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share this link with the customer. When they open it, we’ll timestamp{' '}
          <span className="font-medium">viewed</span> automatically.
        </p>
        <div className="mt-4 flex items-center gap-1 rounded-md border border-border bg-background p-1.5">
          <div className="flex-1 truncate px-2 font-mono text-xs">{publicUrl}</div>
          <button
            onClick={copy}
            className={cn(
              'grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground',
              copied && 'bg-emerald-500/10 text-emerald-600',
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-9">
            Close
          </Button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Preview <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function InvoiceCard({
  invoice,
  payments,
  onRecordPayment,
}: {
  invoice: Invoice
  payments: Payment[]
  onRecordPayment: () => void
}) {
  const publicUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/i/${invoice.public_token}`
  const amountDue = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid ?? 0))
  const paid = invoice.status === 'paid'

  const badge = {
    draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground' },
    sent: { label: 'Sent', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
    partial: { label: 'Partial', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    paid: { label: 'Paid', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    overdue: { label: 'Overdue', cls: 'bg-destructive/10 text-destructive' },
    cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
  }[invoice.status]

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Invoice</h2>
        <span
          className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground tabular">{invoice.invoice_number}</div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>Total</dt>
          <dd className="tabular text-foreground">{fmtMoney(Number(invoice.total))}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Paid</dt>
          <dd className="tabular text-foreground">{fmtMoney(Number(invoice.amount_paid ?? 0))}</dd>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2">
          <dt className="text-sm font-semibold">{paid ? 'Fully paid' : 'Due'}</dt>
          <dd
            className={`text-base font-semibold tabular ${paid ? 'text-emerald-600' : 'text-foreground'}`}
          >
            {fmtMoney(paid ? Number(invoice.total) : amountDue)}
          </dd>
        </div>
      </dl>

      {/* Public link */}
      <div className="mt-4 flex items-center gap-1 rounded-md border border-border bg-background p-1.5">
        <div className="flex-1 truncate px-2 font-mono text-[11px] text-muted-foreground">
          {publicUrl}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(publicUrl)
            toast.success('Link copied')
          }}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Copy link"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Open"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {!paid && (
        <Button onClick={onRecordPayment} className="mt-4 h-9 w-full gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Record payment
        </Button>
      )}

      {payments.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent payments
          </div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {payments.slice(0, 3).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="capitalize text-muted-foreground">
                  {p.method.replace('_', ' ')} · {new Date(p.paid_at).toLocaleDateString()}
                </span>
                <span className="tabular font-medium">+{fmtMoney(Number(p.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function RecordPaymentModal({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: Invoice
  onClose: () => void
  onRecorded: () => void
}) {
  const amountDue = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid ?? 0))
  const [amount, setAmount] = useState(amountDue)
  const [method, setMethod] = useState<'cash' | 'check' | 'card' | 'bank_transfer' | 'stripe'>('check')
  const [ref, setRef] = useState('')
  const [busy, startBusy] = useTransition()

  function submit() {
    if (!(amount > 0)) {
      toast.error('Amount must be greater than zero.')
      return
    }
    startBusy(async () => {
      const res = await recordPayment({
        invoice_id: invoice.id,
        amount,
        method,
        reference_number: ref || undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(res.data.newStatus === 'paid' ? 'Invoice fully paid.' : 'Payment recorded.')
      onRecorded()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Record a payment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {invoice.invoice_number} · {fmtMoney(amountDue)} outstanding
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Amount received
            </label>
            <div className="flex items-center gap-1 rounded-md border border-input bg-background px-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-10 w-full bg-transparent text-sm tabular focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="card">Credit card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Reference (optional)
            </label>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Check #, transaction id…"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-9">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="h-9 gap-1.5 shadow-sm">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Record {fmtMoney(amount)}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function isoToLocal(iso: string): string {
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function shortId(id: string): string {
  return id.slice(0, 8)
}
