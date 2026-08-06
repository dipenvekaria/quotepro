import Link from 'next/link'
import { Filter, Inbox, Plus } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { cn } from '@/lib/utils'

type Column = {
  key: string
  label: string
  statuses: string[]
  dot: string
}

const COLUMNS: Column[] = [
  { key: 'leads',   label: 'Leads',    statuses: ['lead'],                                                         dot: 'bg-primary' },
  { key: 'quotes',  label: 'Quotes',   statuses: ['quote_draft','quote_sent','quote_viewed'],                      dot: 'bg-violet-500' },
  { key: 'accepted',label: 'Won',      statuses: ['quote_accepted','job_scheduled','job_in_progress'],             dot: 'bg-amber-500' },
  { key: 'closed',  label: 'Completed',statuses: ['job_completed'],                                                dot: 'bg-emerald-500' },
]

export default async function PipelinePage() {
  const { companyId } = await requireSession()

  const workItems = await query<{
    id: string
    status: string
    kind: string | null
    job_name: string | null
    description: string | null
    total: number
    customer_id: string | null
    customer_name: string | null
    created_at: string
    updated_at: string
  }>(
    `select w.id, w.status, w.kind, w.job_name, w.description, w.total,
            w.customer_id, c.name as customer_name, w.created_at, w.updated_at
       from work_items w
       left join customers c on c.id = w.customer_id
      where w.company_id = $1
        and w.status <> 'archived'
      order by w.updated_at desc
      limit 500`,
    [companyId],
  )

  const customerMap = new Map(
    workItems
      .filter((w) => w.customer_id)
      .map((w) => [w.customer_id as string, w.customer_name ?? '']),
  )

  const grouped = COLUMNS.reduce<Record<string, typeof workItems>>((acc, col) => {
    acc[col.key] = (workItems ?? []).filter((w) => col.statuses.includes(w.status as string))
    return acc
  }, {})

  const total = workItems?.length ?? 0

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-foreground">Pipeline</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} active {total === 1 ? 'item' : 'items'} across all stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm hover:text-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* Board */}
      {total === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Inbox}
            title="Nothing in your pipeline yet"
            description="Create your first lead or quote to start tracking work through your business."
            action={
              <Link
                href="/app/quotes/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" /> New quote
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:snap-none sm:overflow-visible sm:px-0 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = grouped[col.key] ?? []
            const value = items.reduce((s, i) => s + Number(i.total ?? 0), 0)
            return (
              <div key={col.key} className="w-[85vw] max-w-[320px] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:max-w-none">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className={cn('h-1.5 w-1.5 rounded-full', col.dot)} />
                    {col.label}
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  {value > 0 && (
                    <span className="text-[11px] font-medium tabular text-muted-foreground">
                      {fmtMoney(value)}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <PipelineCard
                      key={item.id}
                      id={item.id}
                      status={item.status}
                      jobName={item.job_name}
                      description={item.description}
                      customer={customerMap.get(item.customer_id ?? '') ?? 'Unknown customer'}
                      total={Number(item.total ?? 0)}
                      updatedAt={item.updated_at}
                    />
                  ))}
                  <Link
                    href="/app/quotes/new"
                    className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------

function PipelineCard({
  id,
  status,
  jobName,
  description,
  customer,
  total,
  updatedAt,
}: {
  id: string
  status: string
  jobName: string | null
  description: string | null
  customer: string
  total: number
  updatedAt: string
}) {
  const initials = customer
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  return (
    <Link
      href={`/app/pipeline/${id}`}
      className="group block rounded-lg border border-border/70 bg-background p-3 shadow-sm transition-all hover:border-border hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={status as never} showIcon={false} className="text-[10px]" />
        {total > 0 && (
          <span className="text-xs font-semibold tabular">{fmtMoney(total)}</span>
        )}
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-medium leading-snug">
        {jobName || description || 'Untitled'}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {initials}
          </div>
          <span className="truncate text-xs text-muted-foreground">{customer}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{fmtRelative(updatedAt)}</span>
      </div>
    </Link>
  )
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}
