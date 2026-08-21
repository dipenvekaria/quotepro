import { type LucideIcon, CalendarClock, CheckCircle2, Circle, Clock, FileText, Send, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

// Mirrors the work_item_status enum in
// supabase/migrations/00000000000000_baseline.sql. Kept here rather than in a
// shared module because this is the only live consumer; promote it if a second
// one appears.
export type WorkItemStatus =
  | 'lead'
  | 'estimate_scheduled'
  | 'quote_draft'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expired'
  | 'job_scheduled'
  | 'job_in_progress'
  | 'job_completed'
  | 'job_cancelled'
  | 'archived'

type Variant = {
  label: string
  icon: LucideIcon
  className: string
}

const VARIANTS: Record<WorkItemStatus, Variant> = {
  lead: { label: 'New Lead', icon: Circle, className: 'bg-zinc-100 text-zinc-700 ring-zinc-600/20' },
  estimate_scheduled: {
    label: 'Estimate visit',
    icon: CalendarClock,
    className: 'bg-sky-100 text-sky-700 ring-sky-600/20',
  },
  quote_draft: { label: 'Draft', icon: FileText, className: 'bg-gray-100 text-gray-700 ring-gray-500/20' },
  quote_sent: { label: 'Sent', icon: Send, className: 'bg-violet-100 text-violet-700 ring-violet-600/20' },
  quote_viewed: { label: 'Viewed', icon: Circle, className: 'bg-purple-100 text-purple-700 ring-purple-600/20' },
  quote_accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  },
  quote_rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-rose-100 text-rose-700 ring-rose-600/20',
  },
  quote_expired: { label: 'Expired', icon: Clock, className: 'bg-amber-100 text-amber-700 ring-amber-600/20' },
  job_scheduled: {
    label: 'Scheduled',
    icon: Clock,
    className: 'bg-orange-100 text-orange-700 ring-orange-600/20',
  },
  job_in_progress: {
    label: 'In Progress',
    icon: Circle,
    className: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  },
  job_completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  },
  job_cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 ring-red-600/20',
  },
  archived: { label: 'Archived', icon: Circle, className: 'bg-gray-100 text-gray-500 ring-gray-500/10' },
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: WorkItemStatus
  className?: string
  showIcon?: boolean
}) {
  const variant = VARIANTS[status]
  const Icon = variant.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        variant.className,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden />}
      {variant.label}
    </span>
  )
}
