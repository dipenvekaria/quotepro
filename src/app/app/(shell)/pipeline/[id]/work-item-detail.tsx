'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import {
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Star,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Camera,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TimelineEntry } from '@/lib/activity'

import { BackLink } from '@/components/shared/back-link'

import { ActivityTimeline } from './activity-timeline'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { computeTotals } from '@/lib/money'
import { cn } from '@/lib/utils'

import { generateQuoteItems } from '@/app/app/(shell)/quotes/new/actions'

import type { QuotePhoto } from './photo-actions'
import { QuotePhotos } from './quote-photos'
import { uploadQuotePhoto } from './photo-actions'
import {
  changeStatus,
  generateCustomerSummary,
  getSchedulingContext,
  requestReview,
  checkSlot,
  scheduleEstimate,
  sendQuote,
  updateWorkItem,
  type SchedulingContext,
  setCustomerSummary,
} from './actions'
import type { SlotAssessment } from '@/lib/scheduling/assess'
import { zonedParts, zonedToUtc } from '@/lib/time'
import { saveLineItems } from '../../quotes/new/actions'
import { DraftQuestions } from '../../quotes/new/draft-questions'
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
  customer_summary: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  estimate_scheduled_start: string | null
  estimate_assigned_to: string | null
  estimate_rep_name: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  completed_at: string | null
  public_token: string
  created_at: string
  updated_at: string
  recurrence: {
    cadence: 'weekly' | 'biweekly' | 'monthly' | 'custom'
    every?: number
    unit?: 'day' | 'week' | 'month'
    auto_invoice: boolean
    next_at?: string
  } | null
  metadata: {
    signed_by?: string
    signed_ip?: string | null
    terms_agreed?: boolean
    terms_text?: string | null
  } | null
  assigned_to: string | null
  customers: { id: string; name: string; email: string | null; phone: string | null } | null
  addresses: { address: string | null; city: string | null; state: string | null; zip: string | null } | null
  creator: { email: string; profile: { full_name?: string } | null } | null
  assignee: { email: string; profile: { full_name?: string } | null } | null
}

const emptySubscribe = () => () => {}

type Teammate = { id: string; name: string; handle?: string }

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
  lead: [
    { label: 'Schedule estimate visit', to: 'estimate_scheduled', primary: true },
    { label: 'Convert to quote', to: 'quote_draft' },
  ],
  estimate_scheduled: [{ label: 'Create quote', to: 'quote_draft', primary: true }],
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

/**
 * Tomorrow morning, or whatever is already on the item. A contractor scheduling
 * a job they just won almost never means "right now", and an empty picker is a
 * decision we are making them make for no reason.
 */
function defaultScheduleSlot(existing: string | null, tz: string): string {
  if (existing) return isoToWall(existing, tz)
  const today = zonedParts(new Date(), tz)
  const tomorrow9 = zonedToUtc(tz, { ...today, h: 9, min: 0 })
  return isoToWall(new Date(tomorrow9.getTime() + 24 * 3_600_000).toISOString(), tz)
}

export function WorkItemDetail({
  workItem,
  lineItems: initialItems,
  teammates,
  invoice,
  payments,
  photos,
  timeline,
  tz,
  reviewRequested,
}: {
  workItem: WorkItem
  lineItems: LineItem[]
  teammates: Teammate[]
  invoice: Invoice | null
  payments: Payment[]
  photos: QuotePhoto[]
  tz: string
  timeline: TimelineEntry[]
  reviewRequested: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<LineItem[]>(initialItems)
  const [drafting, startDraft] = useTransition()
  const [description, setDescription] = useState(workItem.description ?? '')
  const [recur, setRecur] = useState<{
    cadence: 'weekly' | 'biweekly' | 'monthly' | 'custom'
    every?: number
    unit?: 'day' | 'week' | 'month'
    auto_invoice: boolean
  } | null>(
    workItem.recurrence
      ? {
          cadence: workItem.recurrence.cadence,
          every: workItem.recurrence.every,
          unit: workItem.recurrence.unit,
          auto_invoice: workItem.recurrence.auto_invoice,
        }
      : null,
  )
  const [draftQuestions, setDraftQuestions] = useState<{ question: string; options: string[] }[]>([])
  const [draftUnmet, setDraftUnmet] = useState<string[]>([])

  const [savingItems, startItemsSave] = useTransition()
  const [savingMeta, startMetaSave] = useTransition()
  const [payOpen, setPayOpen] = useState(false)
  const [invoiceSending, startInvoiceSend] = useTransition()
  const [completeOpen, setCompleteOpen] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [transitioning, startTransition_] = useTransition()

  const [explaining, startExplain] = useTransition()
  const [editingSummary, setEditingSummary] = useState(false)
  const [editingItems, setEditingItems] = useState(false)
  const jobPhotoRef = useRef<HTMLInputElement | null>(null)
  const [jobPhotosBusy, startJobPhotos] = useTransition()
  const [completePhotosAdded, setCompletePhotosAdded] = useState(0)
  function openJobPhotos() {
    jobPhotoRef.current?.click()
  }
  function onJobPhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length === 0) return
    startJobPhotos(async () => {
      let added = 0
      for (const file of files) {
        const fd = new FormData()
        fd.append('work_item_id', workItem.id)
        fd.append('file', file)
        const res = await uploadQuotePhoto(fd)
        if (res.ok) added++
        else {
          toast.error(res.error)
          break
        }
      }
      if (added > 0) {
        setCompletePhotosAdded((n) => n + added)
        toast.success(`${added} photo${added === 1 ? '' : 's'} added`)
        router.refresh()
      }
    })
  }
  const [summaryDraft, setSummaryDraft] = useState('')
  const [savingSummary, startSummarySave] = useTransition()
  function saveSummaryEdit() {
    startSummarySave(async () => {
      const res = await setCustomerSummary({ work_item_id: workItem.id, summary: summaryDraft })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setEditingSummary(false)
      router.refresh()
    })
  }
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [estimateOpen, setEstimateOpen] = useState(false)
  const [estimateAt, setEstimateAt] = useState('')
  const [estimateRep, setEstimateRep] = useState('')
  const [bookingEstimate, startBookEstimate] = useTransition()
  const [schedCtx, setSchedCtx] = useState<SchedulingContext | null>(null)
  const [slotCheck, setSlotCheck] = useState<SlotAssessment | null>(null)
  const [checkingSlot, setCheckingSlot] = useState(false)
  const slotSeq = useRef(0)
  function runSlotCheck(at: string, assignee: string | null | undefined, kind: 'job' | 'estimate') {
    setSlotCheck(null)
    if (!at || !assignee) return
    const seq = ++slotSeq.current
    setCheckingSlot(true)
    const t = setTimeout(async () => {
      const res = await checkSlot({
        work_item_id: workItem.id,
        assignee_id: assignee,
        starts_at: wallToIso(at, tz),
        kind,
      })
      if (seq !== slotSeq.current) return
      setCheckingSlot(false)
      if (res.ok) setSlotCheck(res.data)
    }, 350)
    return () => clearTimeout(t)
  }
  const [loadingCtx, startLoadCtx] = useTransition()

  function bookEstimate() {
    startBookEstimate(async () => {
      const res = await scheduleEstimate({
        id: workItem.id,
        estimate_scheduled_start: wallToIso(estimateAt, tz),
        sales_rep_id: estimateRep || null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setEstimateOpen(false)
      toast.success('Estimate visit booked')
      router.refresh()
    })
  }

  function writeCustomerSummary() {
    startExplain(async () => {
      const res = await generateCustomerSummary({ work_item_id: workItem.id })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Summary written', {
        description: 'The customer will see it at the top of the quote.',
      })
      router.refresh()
    })
  }

  const [sendOpen, setSendOpen] = useState(false)
  const [sentToken, setSentToken] = useState<string | null>(null)
  const [reviewAsked, setReviewAsked] = useState(reviewRequested)
  const [askingReview, startAskReview] = useTransition()

  function doRequestReview() {
    startAskReview(async () => {
      const res = await requestReview(workItem.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setReviewAsked(true)
      toast.success(`Review request sent — ${res.data.channels.join(' and ')} link${res.data.channels.length === 1 ? '' : 's'} included.`)
      router.refresh()
    })
  }

  const taxRate = workItem.tax_rate
  const computed = useMemo(() => computeTotals(items, taxRate), [items, taxRate])

  // A quote can carry a stored total with no line items behind it — imported
  // data, or rows deleted without a re-save. Recomputing from nothing showed
  // $0.00 here while the pipeline card and the calendar both showed the real
  // figure, and a contractor who sees $0 on a five-figure job stops trusting
  // the software. Fall back to what was actually quoted, and say so.
  const storedTotal = Number(workItem.total ?? 0)
  const missingLineItems = items.length === 0 && storedTotal > 0

  const { subtotal, taxAmount, total } = missingLineItems
    ? {
        subtotal: Number(workItem.subtotal ?? 0),
        taxAmount: Number(workItem.tax_amount ?? 0),
        total: storedTotal,
      }
    : computed

  const actions = STATUS_ACTIONS[workItem.status] ?? []
  // Two-pass on purpose: the server (and the hydration pass, via the server
  // snapshot) render '', then the client fills the real origin. Reading
  // window.origin directly during render was a hydration mismatch that
  // regenerated the whole detail tree on every load.
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const publicUrl = isClient ? `${window.location.origin}/q/${workItem.public_token}` : ''

  // -----------------------------------------------------------------------

  /**
   * Drafting on a quote that already exists.
   *
   * Appends rather than replaces. On a new quote there is nothing to lose, but
   * here the contractor may have priced half of it by hand already, and
   * throwing that away to make room for a suggestion is not a trade anyone
   * would accept.
   */
  function draftWithAi(desc = description) {
    if (!desc.trim()) {
      toast.error('Add a job description first — that is what the draft is built from.')
      return
    }
    startDraft(async () => {
      const res = await generateQuoteItems({
        description: desc,
        customer_name: '',
        customer_address: null,
        // The quote already exists here, so the run is recorded against it.
        // Without this there was no way to answer what the AI did on a given
        // quote — the run happened and left no trace anywhere.
        work_item_id: workItem.id,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const drafted = res.data.line_items
      // The model's questions and gaps render below the header — this page
      // used to swallow both, so "Deep cleaning" against a size-tiered price
      // book looked like a matching bug instead of a question.
      setDraftQuestions(res.data.questions ?? [])
      setDraftUnmet(res.data.unmet ?? [])
      if (drafted.length === 0) {
        if ((res.data.questions ?? []).length > 0) {
          toast.info('The draft needs an answer first — pick below.', {
            description: res.data.reasoning || undefined,
            duration: 8000,
          })
        } else {
          toast.error('Nothing in your price book matched that description.', {
            description: res.data.reasoning || undefined,
            duration: 10000,
          })
        }
        return
      }
      setItems((prev) => [
        ...prev,
        ...drafted.map((li, i) => ({
          name: li.name,
          description: li.description ?? '',
          quantity: li.quantity,
          unit_price: li.unit_price,
          sort_order: prev.length + i,
        })),
      ])
      // No fallback modes exist any more — generation either ran on Gemini or
      // threw. The old keyword-mode warning branch was dead and would have
      // mislabelled a real draft.
      toast.success(`Added ${drafted.length} ${drafted.length === 1 ? 'line' : 'lines'}`, {
        description: 'Review them, then Save items.',
      })
    })
  }

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
      setEditingItems(false)
      router.refresh()
    })
  }

  function saveMeta() {
    startMetaSave(async () => {
      const res = await updateWorkItem({
        id: workItem.id,
        description,
        recurrence: recur,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Saved')
      setEditingDetails(false)
      router.refresh()
    })
  }

  function transition(to: string, scheduledAt?: string) {
    startTransition_(async () => {
      const res = await changeStatus({
        id: workItem.id,
        to: to as never,
        scheduled_start: scheduledAt ?? undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (to === 'job_scheduled' && scheduledAt) {
        toast.success('Job scheduled', {
          description: `${new Date(scheduledAt).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })} — it's on your calendar.`,
        })
      } else {
        toast.success(`Moved to ${to.replaceAll('_', ' ')}`)
      }
      // The owner ask: completing a job should offer the invoice right there,
      // not leave the next step to be discovered further down the page.
      if (to === 'job_completed' && total > 0 && !invoice) setCompleteOpen(true)
      router.refresh()
    })
  }

  /** Scheduling needs a date, so it opens a picker instead of firing straight away. */
  function onNextStep(to: string) {
    if (to === 'estimate_scheduled') {
      setEstimateAt(defaultScheduleSlot(workItem.estimate_scheduled_start, tz))
      setEstimateRep(workItem.estimate_assigned_to ?? '')
      setEstimateOpen(true)
      return
    }
    if (to === 'job_scheduled') {
      setScheduleAt(defaultScheduleSlot(workItem.scheduled_start, tz))
      setSchedCtx(null)
      setScheduleOpen(true)
      // Loaded on open rather than with the page: most visits to a work item
      // are not scheduling it, and this is three queries.
      startLoadCtx(async () => {
        const res = await getSchedulingContext(workItem.id)
        if (res.ok) setSchedCtx(res.data)
      })
      return
    }
    transition(to)
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
      else if (res.data.email === 'no_address')
        toast.info('Quote sent — this customer has no email address, so share the link.')
      else if (res.data.email === 'not_configured')
        toast.warning('Quote sent, but email is not set up — nothing was delivered.', {
          description: 'Share the link for now. RESEND_API_KEY is missing.',
        })
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

  const invoiceUrl = isClient && invoice ? `${window.location.origin}/i/${invoice.public_token}` : ''
  const invoiceAmountDue = invoice
    ? Math.max(0, Number(invoice.total) - Number(invoice.amount_paid ?? 0))
    : 0
  function copyPayLink() {
    navigator.clipboard.writeText(invoiceUrl)
    toast.success('Payment link copied — send it to your customer')
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
    <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 sm:pb-6 lg:px-10 lg:py-8">
      {/* Breadcrumb. The back link is the only way out on a phone: thumb-size,
          and it walks real history when there is any, so the board comes back
          with its scroll position instead of at the top. */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <BackLink href="/app/pipeline">Pipeline</BackLink>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">
          {workItem.quote_number ?? workItem.job_name ?? workItem.customers?.name ?? shortId(workItem.id)}
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
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={writeCustomerSummary}
              disabled={explaining}
              className="h-9 gap-1.5"
              aria-label={
                workItem.customer_summary
                  ? 'Rewrite the plain-language explanation for the customer'
                  : 'Write a plain-language explanation for the customer'
              }
              title="Write a plain-language explanation the customer sees on the quote"
            >
              {explaining ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {workItem.customer_summary ? 'Rewrite explanation' : 'Explain for customer'}
              </span>
            </Button>
          )}
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
              {workItem.status === 'job_completed' && !invoice && total > 0 && (
                <Button onClick={doSendInvoice} disabled={invoiceSending} className="gap-1.5 shadow-sm">
                  {invoiceSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send invoice
                </Button>
              )}
              {workItem.status === 'job_completed' && invoice && invoiceAmountDue > 0 && (
                <Button onClick={copyPayLink} className="gap-1.5 shadow-sm">
                  <Copy className="h-3.5 w-3.5" />
                  Copy payment link
                </Button>
              )}
              {(workItem.status === 'job_in_progress' || workItem.status === 'job_completed') && (
                <Button onClick={openJobPhotos} disabled={jobPhotosBusy} variant="outline" className="gap-1.5">
                  {jobPhotosBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  Add photos
                </Button>
              )}
              {workItem.status === 'job_completed' && (
                <Button
                  onClick={doRequestReview}
                  disabled={askingReview || reviewAsked}
                  variant={invoice && invoiceAmountDue === 0 ? 'default' : 'outline'}
                  className="gap-1.5"
                >
                  {askingReview ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                  {reviewAsked ? 'Review requested' : 'Request review'}
                </Button>
              )}
              {(workItem.status === 'quote_sent' || workItem.status === 'quote_viewed') && (
                <Button
                  onClick={doSend}
                  disabled={transitioning}
                  variant="outline"
                  className="gap-1.5"
                >
                  {transitioning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Resend quote
                </Button>
              )}
              {actions.map((a) => (
                <Button
                  key={a.to}
                  onClick={() => onNextStep(a.to)}
                  disabled={transitioning}
                  variant={a.primary ? 'default' : 'outline'}
                >
                  {a.label}
                </Button>
              ))}
              {/* Invoicing needs something to bill. The button used to appear
                  on an accepted job with no line items, which would have sent a
                  customer an invoice for $0.00. */}
              {(workItem.status === 'quote_accepted' ||
                workItem.status === 'job_scheduled' ||
                workItem.status === 'job_in_progress') &&
                total > 0 &&
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
          {/* The invoice is the natural next step once a job is done, made the
              loud one on the page. Copy stays neutral — a contractor may be
              standing next to the customer looking at this screen. No invoice
              yet → send it; sent but unpaid → the payment link is front and
              centre. */}
          {/* Once an invoice exists this card carries real state — amount
              outstanding, the invoice number, the payment actions. Before one
              exists it was a third Send-invoice button on one screen. */}
          {workItem.status === 'job_completed' &&
            total > 0 &&
            invoice &&
            invoice.status !== 'paid' && (
              <section className="rounded-xl border border-primary/40 bg-primary/5 shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">
                      {fmtMoney(invoiceAmountDue)} outstanding
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Invoice {invoice.invoice_number} is with{' '}
                      {workItem.customers?.name ?? 'your customer'}. Share the payment link, or
                      record a payment taken another way.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button onClick={copyPayLink} className="h-11 gap-1.5">
                      <Copy className="h-4 w-4" />
                      Copy payment link
                    </Button>
                    <Button
                      onClick={() => setPayOpen(true)}
                      variant="outline"
                      className="h-11 gap-1.5"
                    >
                      Record payment
                    </Button>
                  </div>
                </div>
              </section>
            )}

          {/* Description + notes */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <h2 className="text-sm font-semibold">Details</h2>
              {editingDetails ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => setEditingDetails(false)}
                    disabled={savingMeta}
                    size="sm"
                    variant="ghost"
                    className="h-11 lg:h-7"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveMeta}
                    disabled={savingMeta}
                    size="sm"
                    variant="outline"
                    className="h-11 gap-1 lg:h-7"
                  >
                    {savingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Edit details"
                  title="Edit details"
                  onClick={() => setEditingDetails(true)}
                  className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </header>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Job description
                </label>
                {editingDetails ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="What's the job?"
                  />
                ) : description.trim() ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed">{description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing yet — tap the pen to add one.</p>
                )}
              </div>
              {workItem.notes && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Internal notes
                  </label>
                  {/* Read-only survivor of the old freeform field. New notes go
                      through the Activity thread, which keeps who-said-what. */}
                  <p className="whitespace-pre-wrap rounded-md bg-muted/60 px-3 py-2 text-sm">
                    {workItem.notes}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Team-only. Add new notes in Activity below — they keep author and time.
                  </p>
                </div>
              )}
              {(workItem.estimate_scheduled_start || workItem.status === 'estimate_scheduled') && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    <CalendarIcon className="mr-1 inline h-3 w-3" />
                    Estimate visit
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm tabular">
                      {workItem.estimate_scheduled_start
                        ? new Date(workItem.estimate_scheduled_start).toLocaleString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit', timeZone: tz,
                          })
                        : 'Not scheduled'}
                    </span>
                    {workItem.estimate_rep_name && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                        {workItem.estimate_rep_name}
                      </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onNextStep('estimate_scheduled')} disabled={bookingEstimate}>
                      {workItem.estimate_scheduled_start ? 'Reschedule' : 'Book'}
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  <CalendarIcon className="mr-1 inline h-3 w-3" />
                  Scheduled start
                </label>
                {/* Read-only on purpose. This used to be an editable field that
                    saved separately from the "Schedule job" button, so one
                    mental action had two unrelated homes — and being seeded from
                    useState it went stale the moment the job was scheduled
                    elsewhere. Scheduling has one door now. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm tabular">
                    {workItem.scheduled_start
                      ? new Date(workItem.scheduled_start).toLocaleString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit', timeZone: tz,
                        })
                      : 'Not scheduled'}
                  </span>
                  {workItem.scheduled_start && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNextStep('job_scheduled')}
                      disabled={transitioning}
                    >
                      Reschedule
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  <RefreshCw className="mr-1 inline h-3 w-3" />
                  Repeats
                </label>
                {editingDetails ? (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={recur?.cadence ?? 'none'}
                    onChange={(e) => {
                      const v = e.target.value
                      setRecur(
                        v === 'none'
                          ? null
                          : v === 'custom'
                            ? {
                                cadence: 'custom',
                                every: recur?.every ?? 4,
                                unit: recur?.unit ?? 'week',
                                auto_invoice: recur?.auto_invoice ?? true,
                              }
                            : {
                                cadence: v as 'weekly' | 'biweekly' | 'monthly',
                                auto_invoice: recur?.auto_invoice ?? true,
                              },
                      )
                    }}
                    className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm lg:h-9"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="weekly">Every week</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Every month</option>
                    <option value="custom">Custom…</option>
                  </select>
                  {recur?.cadence === 'custom' && (
                    <div className="flex items-center gap-2 text-sm">
                      every
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={recur.every ?? 4}
                        onChange={(e) =>
                          setRecur({
                            ...recur,
                            every: Math.max(1, Math.min(52, Math.floor(Number(e.target.value) || 1))),
                          })
                        }
                        aria-label="Repeat interval"
                        className="h-11 w-16 rounded-md border border-input bg-background px-2 text-center tabular shadow-sm lg:h-9"
                      />
                      <select
                        value={recur.unit ?? 'week'}
                        onChange={(e) =>
                          setRecur({ ...recur, unit: e.target.value as 'day' | 'week' | 'month' })
                        }
                        aria-label="Repeat unit"
                        className="h-11 rounded-md border border-input bg-background px-2 text-sm shadow-sm lg:h-9"
                      >
                        <option value="day">{(recur.every ?? 4) === 1 ? 'day' : 'days'}</option>
                        <option value="week">{(recur.every ?? 4) === 1 ? 'week' : 'weeks'}</option>
                        <option value="month">{(recur.every ?? 4) === 1 ? 'month' : 'months'}</option>
                      </select>
                    </div>
                  )}
                  {recur && (
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm lg:min-h-0">
                      <input
                        type="checkbox"
                        checked={recur.auto_invoice}
                        onChange={(e) => setRecur({ ...recur, auto_invoice: e.target.checked })}
                        className="h-4 w-4 rounded border-input"
                      />
                      Email the invoice automatically
                    </label>
                  )}
                </div>
                ) : (
                  <p className="text-sm">
                    {!recur
                      ? 'Does not repeat'
                      : recur.cadence === 'weekly'
                        ? 'Every week'
                        : recur.cadence === 'biweekly'
                          ? 'Every 2 weeks'
                          : recur.cadence === 'monthly'
                            ? 'Every month'
                            : `Every ${recur.every ?? 4} ${recur.unit ?? 'week'}${(recur.every ?? 4) === 1 ? '' : 's'}`}
                    {recur?.auto_invoice && (
                      <span className="text-muted-foreground"> · invoice emails automatically</span>
                    )}
                  </p>
                )}
                {workItem.recurrence?.next_at && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Next visit:{' '}
                    {new Date(workItem.recurrence.next_at).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit', timeZone: tz,
                    })}
                    {' '}— each visit is created as its own scheduled job.
                  </p>
                )}
                {recur && !workItem.recurrence && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Save to start the schedule. Each visit becomes its own job with these line items.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-xl border border-border/70 bg-card shadow-sm">
            <header className="flex flex-col gap-3 border-b border-border/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="whitespace-nowrap text-sm font-semibold">Line items</h2>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                  {items.length}
                </span>
                {(workItem.status === 'quote_sent' || workItem.status === 'quote_viewed') && (
                  <span className="text-[11px] text-muted-foreground">
                    Live — saved changes update the customer link instantly
                  </span>
                )}
              </div>
              {editingItems ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-1">
                  <button
                    onClick={() => draftWithAi()}
                    disabled={drafting}
                    className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50 lg:min-h-0 lg:py-1"
                  >
                    {drafting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    Smart draft
                  </button>
                  <button
                    onClick={addItem}
                    className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted lg:min-h-0 lg:py-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add row
                  </button>
                  <Button
                    onClick={saveItems}
                    disabled={savingItems}
                    size="sm"
                    className="h-11 gap-1 lg:h-7"
                  >
                    {savingItems ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save items
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Edit line items"
                  title="Edit line items"
                  onClick={() => setEditingItems(true)}
                  className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </header>
            <DraftQuestions
              questions={draftQuestions}
              unmet={draftUnmet}
              disabled={drafting}
              onAnswer={(question, option) => {
                // Folded into the description (same as the quote editor) and
                // redrafted immediately — the contractor already asked for a
                // draft; the answer was the only thing missing.
                const next = `${description.trim()}\n${question} ${option}`.trim()
                setDescription(next)
                setDraftQuestions((qs) => qs.filter((q) => q.question !== question))
                draftWithAi(next)
              }}
            />
            {items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium">No line items yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add rows to build up this quote.
                </p>
              </div>
            ) : (
              !editingItems ? (
              <div className="divide-y divide-border/70">
                {/* Saved rows read as a receipt — quiet, dense, no chrome.
                    The pen opens the working surface; this is what saves the
                    screen on a phone. */}
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <div className={cn('truncate text-sm font-medium', it.is_discount && 'text-emerald-600')}>
                        {it.name || 'Untitled item'}
                      </div>
                      {(it.description || it.quantity !== 1) && (
                        <div className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {it.quantity !== 1 && (
                            <span className="tabular">{it.quantity} × {fmtMoney(it.unit_price)}</span>
                          )}
                          {it.quantity !== 1 && it.description ? ' · ' : ''}
                          {it.description}
                        </div>
                      )}
                    </div>
                    <div className={cn('shrink-0 text-sm font-semibold tabular', it.is_discount && 'text-emerald-600')}>
                      {fmtMoney(it.quantity * it.unit_price)}
                    </div>
                  </div>
                ))}
              </div>
              ) : (
              <div className="divide-y divide-border/70">
                {items.map((it, idx) => (
                  <div key={idx} className="group flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 lg:grid lg:grid-cols-[1fr_auto_auto_auto_auto] lg:flex-nowrap">
                    <div className="w-full min-w-0 lg:w-auto">
                      <input
                        value={it.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        placeholder="Item name"
                        className="h-11 w-full bg-transparent text-sm font-medium focus:outline-none lg:h-auto"
                      />
                      <input
                        value={it.description ?? ''}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Optional description"
                        className="mt-0.5 h-11 w-full bg-transparent text-xs text-muted-foreground focus:outline-none lg:h-auto"
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      className="h-11 w-16 rounded border border-input bg-background px-2 text-right text-sm tabular lg:h-8"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                        className="h-11 w-24 rounded border border-input bg-background px-2 text-right text-sm tabular lg:h-8"
                      />
                    </div>
                    <div className="ml-auto text-right text-sm font-semibold tabular lg:ml-0 lg:w-24">
                      {fmtMoney(it.quantity * it.unit_price)}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive lg:h-7 lg:w-7 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              )
            )}
          </section>

          {/* Activity */}
          <QuotePhotos
            workItemId={workItem.id}
            photos={photos}
            lineItems={items
              .filter((i) => i.id && i.name)
              .map((i) => ({ id: i.id as string, name: i.name }))}
          />

          {/* The real audit trail once events exist; quotes from before the
              log was written fall back to the timestamp-derived summary so
              their history does not vanish. */}
          {timeline.length > 0 ? (
            <ActivityTimeline
              entries={timeline}
              tz={tz}
              workItemId={workItem.id}
              people={Object.fromEntries(teammates.map((t) => [t.id, t.name]))}
              roster={teammates}
            />
          ) : (
            <Activity workItem={workItem} />
          )}
        </div>

        {/* Scheduling asks when, then does both halves at once — the status and
            the date. Splitting them is what put "scheduled" jobs nowhere near
            the calendar. */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule this job</DialogTitle>
              <DialogDescription>
                It will appear on your calendar and on the dashboard for that day.
              </DialogDescription>
            </DialogHeader>
            {/* The duration comes from the quote's own line items, so the
                contractor never types it. That is the whole reason the
                suggestions below can be trusted. */}
            {schedCtx?.estimatedHours ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                This job is about{' '}
                <span className="font-semibold">{schedCtx.estimatedHours} hours</span> of work,
                from its line items.
              </p>
            ) : schedCtx ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                No time estimate — these line items carry no labour hours. Pick a time below.
              </p>
            ) : null}

            {loadingCtx && (
              <p className="text-sm text-muted-foreground">Checking your calendar…</p>
            )}

            {schedCtx && schedCtx.suggestions.length > 0 && (
              <div className="min-w-0 space-y-1.5">
                <Label className="text-sm font-medium">Next available</Label>
                <div className="grid min-w-0 gap-2">
                  {schedCtx.suggestions.map((s) => {
                    const start = new Date(s.startsAt)
                    const end = new Date(s.endsAt)
                    const iso = isoToWall(s.startsAt, tz)
                    const chosen = scheduleAt === iso
                    return (
                      <button
                        key={s.startsAt}
                        type="button"
                        onClick={() => {
                          setScheduleAt(iso)
                          runSlotCheck(iso, workItem.assigned_to, 'job')
                        }}
                        className={cn(
                          'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          chosen
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/60',
                        )}
                      >
                        <span className="font-medium">
                          {start.toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </span>
                        <span className="text-muted-foreground tabular">
                          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' – '}
                          {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {schedCtx && schedCtx.suggestions.length === 0 && !loadingCtx && (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Nothing free in the next two weeks that fits this job. Pick a time below, or open
                up more hours in Settings.
              </p>
            )}

            {/* The fortnight at a glance, so a contractor can see the shape of
                their week rather than only the three offered slots. */}
            {schedCtx && (
              <div className="min-w-0 space-y-1.5">
                <Label className="text-sm font-medium">Next two weeks</Label>
                {/* min-w-0 is load-bearing: grid children default to
                    min-width:auto, so without it the strip's intrinsic width
                    stretched the dialog past its max-width instead of
                    scrolling, and every row spilled outside the panel. */}
                <div className="flex min-w-0 gap-1 overflow-x-auto pb-1">
                  {schedCtx.days.map((d) => {
                    const day = new Date(`${d.date}T00:00:00`)
                    const closed = d.capacityHours === 0
                    const load = closed ? 0 : Math.min(d.bookedHours / d.capacityHours, 1)
                    return (
                      <div
                        key={d.date}
                        title={
                          closed
                            ? 'Closed'
                            : `${d.bookedHours}h booked of ${d.capacityHours}h`
                        }
                        className="min-w-[2.6rem] shrink-0 rounded-md border border-border/60 px-1 py-1.5 text-center"
                      >
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </div>
                        <div className="text-xs font-medium tabular">{day.getDate()}</div>
                        <div className="mt-1 h-1 rounded-full bg-muted">
                          {!closed && (
                            <div
                              className="h-1 rounded-full bg-primary"
                              style={{ width: `${Math.round(load * 100)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="schedule-at" className="text-sm font-medium">
                Start
              </Label>
              <Input
                id="schedule-at"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => {
                  setScheduleAt(e.target.value)
                  runSlotCheck(e.target.value, workItem.assigned_to, 'job')
                }}
                className="h-11"
              />
              {workItem.assigned_to ? (
                <SlotCheckPanel
                  check={slotCheck}
                  checking={checkingSlot}
                  tz={tz}
                  onUseSuggestion={(iso) => {
                    setScheduleAt(isoToWall(iso, tz))
                    runSlotCheck(isoToWall(iso, tz), workItem.assigned_to, 'job')
                  }}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Assign a teammate to check their day for conflicts and drive time.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!scheduleAt || transitioning}
                onClick={() => {
                  setScheduleOpen(false)
                  transition('job_scheduled', wallToIso(scheduleAt, tz))
                }}
              >
                Schedule job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            {missingLineItems && (
              <p className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                This total has no line items behind it. The customer will see an empty quote —
                add the rows before sending.
              </p>
            )}
          </div>

          {/* What the customer reads above the prices on the public quote.
              Shown here because it was previously written, saved, and then only
              visible by opening the public link — so "Explain for customer"
              appeared to do nothing at all. */}
          {workItem.customer_summary && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-sm font-semibold">Customer explanation</h2>
                <div className="flex-1" />
                {!editingSummary && (
                  <button
                    type="button"
                    aria-label="Edit the customer explanation"
                    title="Edit the customer explanation"
                    onClick={() => {
                      setSummaryDraft(workItem.customer_summary ?? '')
                      setEditingSummary(true)
                    }}
                    className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown to the customer above the prices.
              </p>
              {editingSummary ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    autoFocus
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    rows={5}
                    disabled={savingSummary}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingSummary(false)}
                      disabled={savingSummary}
                      className="h-11 lg:h-9"
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveSummaryEdit} disabled={savingSummary} className="h-11 gap-1.5 lg:h-9">
                      {savingSummary && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {workItem.customer_summary}
                </p>
              )}
            </div>
          )}

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
                  className="grid h-11 w-11 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
                  title="Copy link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-11 w-11 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
                  title="Open"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* The acceptance record — what "can I pull up the signature?"
              means in practice. Everything the audit trail captured, plus the
              exact terms as of that moment, which later edits never touch. */}
          {workItem.accepted_at && workItem.metadata?.signed_by && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Acceptance record</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Signed by</dt>
                  <dd className="font-medium">{workItem.metadata.signed_by}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">When</dt>
                  <dd className="tabular">
                    {new Date(workItem.accepted_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', timeZone: tz,
                    })}
                  </dd>
                </div>
                {workItem.metadata.signed_ip && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">From IP</dt>
                    <dd className="tabular">{workItem.metadata.signed_ip}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Terms</dt>
                  <dd>{workItem.metadata.terms_agreed ? 'Agreed' : 'None on quote'}</dd>
                </div>
              </dl>
              {workItem.metadata.terms_text && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Terms as accepted
                  </summary>
                  <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    {workItem.metadata.terms_text}
                  </p>
                </details>
              )}
              <a
                href={`/q/${workItem.public_token}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted lg:h-8"
              >
                Signed PDF
              </a>
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
              publicUrl={invoiceUrl}
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

      {/* Estimate visit dialog */}
      <Dialog open={estimateOpen} onOpenChange={setEstimateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule estimate visit</DialogTitle>
            <DialogDescription>
              Book a sales visit to quote the job on site. It lands on the calendar as an
              estimate, separate from the work itself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs">When</Label>
              <Input
                type="datetime-local"
                value={estimateAt}
                onChange={(e) => {
                  setEstimateAt(e.target.value)
                  runSlotCheck(e.target.value, estimateRep || null, 'estimate')
                }}
                className="h-11"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Who visits (optional)</Label>
              <select
                value={estimateRep}
                onChange={(e) => {
                  setEstimateRep(e.target.value)
                  runSlotCheck(estimateAt, e.target.value || null, 'estimate')
                }}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Unassigned</option>
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {estimateRep && (
              <SlotCheckPanel
                check={slotCheck}
                checking={checkingSlot}
                tz={tz}
                onUseSuggestion={(iso) => {
                  setEstimateAt(isoToWall(iso, tz))
                  runSlotCheck(isoToWall(iso, tz), estimateRep, 'estimate')
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstimateOpen(false)}>Cancel</Button>
            <Button onClick={bookEstimate} disabled={!estimateAt || bookingEstimate} className="gap-1.5">
              {bookingEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
              Book visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One camera input serves the header buttons and the completion
          dialog. capture=environment opens the back camera on phones. */}
      <input
        ref={jobPhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onJobPhotoFiles}
      />

      {/* Job complete → the money step, offered right there. */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Job complete</DialogTitle>
            <DialogDescription>
              Add photos of the finished work, then send{' '}
              {workItem.customers?.name ?? 'the customer'} the invoice for {fmtMoney(total)} — it
              goes out with the payment link.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="outline"
            onClick={openJobPhotos}
            disabled={jobPhotosBusy}
            className="h-11 w-full gap-1.5"
          >
            {jobPhotosBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {completePhotosAdded > 0
              ? `${completePhotosAdded} photo${completePhotosAdded === 1 ? '' : 's'} added — add more`
              : 'Take photos'}
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} className="h-11 lg:h-9">
              Later
            </Button>
            <Button
              onClick={() => {
                setCompleteOpen(false)
                doSendInvoice()
              }}
              disabled={invoiceSending}
              className="h-11 gap-1.5 lg:h-9"
            >
              {invoiceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* The status's primary action, always under the thumb. On a phone the
          header buttons scroll away with the first flick; this page is long. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        {workItem.status === 'quote_draft' ? (
          <Button onClick={doSend} disabled={transitioning} className="h-12 w-full gap-1.5 text-base">
            {transitioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send quote
          </Button>
        ) : workItem.status === 'job_completed' && total > 0 && !invoice ? (
          <Button onClick={doSendInvoice} disabled={invoiceSending} className="h-12 w-full gap-1.5 text-base">
            {invoiceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send invoice
          </Button>
        ) : workItem.status === 'job_completed' && invoice && invoice.status !== 'paid' ? (
          <Button onClick={copyPayLink} className="h-12 w-full gap-1.5 text-base">
            <Copy className="h-4 w-4" />
            Copy payment link
          </Button>
        ) : workItem.status === 'job_completed' && !reviewAsked ? (
          <Button onClick={doRequestReview} disabled={askingReview} className="h-12 w-full gap-1.5 text-base">
            {askingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            Request review
          </Button>
        ) : actions.find((a) => a.primary) ? (
          <Button
            onClick={() => onNextStep(actions.find((a) => a.primary)!.to)}
            disabled={transitioning}
            className="h-12 w-full text-base"
          >
            {actions.find((a) => a.primary)!.label}
          </Button>
        ) : null}
      </div>
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
      className="h-11 rounded border border-input bg-background px-1.5 text-xs lg:h-7"
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
              'grid h-11 w-11 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7',
              copied && 'bg-emerald-500/10 text-emerald-600',
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-11 lg:h-9">
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
  publicUrl,
}: {
  invoice: Invoice
  payments: Payment[]
  onRecordPayment: () => void
  /** Computed by the parent behind the isClient snapshot — reading
      window.origin during render here was a hydration mismatch that
      regenerated the whole detail tree and ate the first click. */
  publicUrl: string
}) {
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
          className="grid h-11 w-11 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
          title="Copy link"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="grid h-11 w-11 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground lg:h-7 lg:w-7"
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
              <li key={p.id}>
                <div className="flex justify-between">
                  <span className="capitalize text-muted-foreground">
                    {p.method.replace('_', ' ')} · {new Date(p.paid_at).toLocaleDateString()}
                  </span>
                  <span className="tabular font-medium">+{fmtMoney(Number(p.amount))}</span>
                </div>
                {p.reference_number && (
                  <div className="truncate font-mono text-[10px] text-muted-foreground/80">
                    ref {p.reference_number}
                  </div>
                )}
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
          <Button variant="outline" onClick={onClose} className="h-11 lg:h-9">
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

/** An instant, shown as the company's wall clock (datetime-local format). */
function isoToWall(iso: string, tz: string): string {
  const p = zonedParts(new Date(iso), tz)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`
}

/**
 * The company's wall clock, as an instant. The dialogs speak company time on
 * purpose: the browser's own zone booked "10:30" as whatever 10:30 meant on
 * the viewer's device, which silently shifted every schedule made while
 * travelling — and disagreed with the very conflict panel next to it.
 */
function wallToIso(wall: string, tz: string): string {
  const [d, t] = wall.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  return zonedToUtc(tz, { y, m, d: day, h, min }).toISOString()
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function shortId(id: string): string {
  return id.slice(0, 8)
}


/** The Teams glance: the person's day, double-bookings, and the drive. */
function SlotCheckPanel({
  check,
  checking,
  tz,
  onUseSuggestion,
}: {
  check: SlotAssessment | null
  checking: boolean
  tz: string
  onUseSuggestion: (iso: string) => void
}) {
  const fmtT = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
  if (checking) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking their day…
      </p>
    )
  }
  if (!check) return null
  const bad = check.conflicts.length > 0
  const tight = check.travel && !check.travel.feasible
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
      {bad ? (
        <p className="font-medium text-destructive">
          Double-booked: {check.conflicts.map((c) => `${c.title} ${fmtT(c.startsAt)}–${fmtT(c.endsAt)}`).join(', ')}
        </p>
      ) : tight && check.travel ? (
        <p className="font-medium text-amber-700 dark:text-amber-400">
          Tight drive — ~{check.travel.minutes} min from {check.travel.fromLabel}; they arrive about{' '}
          {fmtT(check.travel.arriveBy)}.
        </p>
      ) : (
        <p className="text-muted-foreground">
          No conflicts
          {check.travel
            ? ` · ~${check.travel.minutes} min typical drive from ${check.travel.fromLabel}`
            : ''}
          .
        </p>
      )}
      {check.suggestion && (
        <button
          type="button"
          onClick={() => onUseSuggestion(check.suggestion!)}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-2.5 font-medium hover:bg-muted lg:min-h-8"
        >
          Use {fmtT(check.suggestion)}
        </button>
      )}
      {check.day.length > 0 && (
        <ul className="space-y-0.5 border-t border-border/60 pt-2 text-muted-foreground">
          {check.day.map((e) => (
            <li key={e.id} className="tabular">
              {fmtT(e.startsAt)}–{fmtT(e.endsAt)} · {e.title}
              {e.kind === 'estimate' ? ' (estimate)' : ''}
            </li>
          ))}
        </ul>
      )}
      {check.day.length === 0 && !bad && (
        <p className="text-muted-foreground">Their day is clear.</p>
      )}
    </div>
  )
}
