import Link from 'next/link'
import { Inbox, Plus } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { requireSession } from '@/lib/auth/session'
import { canAssignWork, workItemScope } from '@/lib/auth/scope'

import { NewLeadDialog } from './new-lead-dialog'
import { PipelineFilter } from './pipeline-filter'
import type { UserRole } from '@/lib/permissions'
import { query } from '@/lib/db'
import { cn } from '@/lib/utils'

type Column = {
  key: string
  label: string
  statuses: string[]
  dot: string
}

// "Won" used to hold quote_accepted, job_scheduled and job_in_progress
// together, which hid the question the board exists to answer: which won jobs
// still need a date. Splitting them makes the work to do visible.
const COLUMNS: Column[] = [
  { key: 'leads',     label: 'Leads',     statuses: ['lead'],                                dot: 'bg-primary' },
  { key: 'quotes',    label: 'Quotes',    statuses: ['quote_draft','quote_sent','quote_viewed'], dot: 'bg-violet-500' },
  { key: 'accepted',  label: 'To schedule', statuses: ['quote_accepted'],                    dot: 'bg-amber-500' },
  { key: 'scheduled', label: 'Scheduled', statuses: ['job_scheduled','job_in_progress'],     dot: 'bg-sky-500' },
  { key: 'closed',    label: 'Completed', statuses: ['job_completed'],                       dot: 'bg-emerald-500' },
]

const SUB_LABELS: Record<string, string> = {
  quote_draft: 'Drafts',
  quote_sent: 'Sent',
  quote_viewed: 'Viewed',
  job_scheduled: 'Scheduled',
  job_in_progress: 'In progress',
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; assignee?: string; stage?: string; sub?: string }>
}) {
  const { companyId, userId, role } = await requireSession()
  const params = await searchParams
  const term = (params.q ?? '').trim()
  const assignee = (params.assignee ?? '').trim()
  // Stage focus: one stage at a time instead of a marathon scroll past 70
  // drafts. `sub` narrows a bundled stage (Quotes → just Drafts).
  const stage = COLUMNS.find((c) => c.key === params.stage)?.key ?? null
  const activeColumn = COLUMNS.find((c) => c.key === stage) ?? null
  const sub = activeColumn?.statuses.includes(params.sub ?? '') ? (params.sub as string) : null

  // A technician sees the jobs they were sent to; sales sees their own. Without
  // this the board showed everyone the whole company's book of business.
  const scope = workItemScope({ companyId, userId, role: role as UserRole }, 1)

  // Board rows, honest stage totals, and the assign picker ride one wave.
  const [workItems, statusCounts, team] = await Promise.all([
    query<{
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
          and (
            w.status in ('lead','quote_draft','quote_sent','quote_viewed','quote_accepted','job_scheduled','job_in_progress')
            or (w.status = 'job_completed' and w.updated_at >= now() - interval '21 days')
          )${scope.sql}${
            assignee ? ` and w.assigned_to = $${2 + scope.params.length}` : ''
          }${
            term
              ? ` and (
                  c.name ilike '%' || $${2 + scope.params.length + (assignee ? 1 : 0)} || '%'
                  or w.job_name ilike '%' || $${2 + scope.params.length + (assignee ? 1 : 0)} || '%'
                  or w.description ilike '%' || $${2 + scope.params.length + (assignee ? 1 : 0)} || '%'
                )`
              : ''
          }
        order by w.updated_at desc
        limit 500`,
      [
        companyId,
        ...scope.params,
        ...(assignee ? [assignee] : []),
        ...(term ? [term] : []),
      ],
    ),
    query<{ status: string; n: number }>(
      `select w.status, count(*)::int as n
         from work_items w
        where w.company_id = $1
          and w.status not in ('archived','quote_rejected','quote_expired')${scope.sql}
        group by w.status`,
      [companyId, ...scope.params],
    ),
    // Only owners and office can hand work out, so only they get a person picker.
    canAssignWork(role as UserRole)
      ? query<{ id: string; email: string | null; profile: Record<string, unknown> | null }>(
          `select u.id, au.email, u.profile
             from users u join auth.users au on au.id = u.id
            where u.company_id = $1 and u.is_active
            order by au.email`,
          [companyId],
        )
      : Promise.resolve([] as { id: string; email: string | null; profile: Record<string, unknown> | null }[]),
  ])
  /*
    True stage totals, independent of the row window. A 100-jobs-a-week shop
    fills any fetch cap; the rows above stay bounded (completed shows 21 days)
    while these numbers stay honest, so the header never lies about volume.
  */
  const countFor = (statuses: string[]) =>
    statusCounts.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0)

  const customerMap = new Map(
    workItems
      .filter((w) => w.customer_id)
      .map((w) => [w.customer_id as string, w.customer_name ?? '']),
  )

  const grouped = COLUMNS.reduce<Record<string, typeof workItems>>((acc, col) => {
    const statuses = col.key === stage && sub ? [sub] : col.statuses
    acc[col.key] = (workItems ?? []).filter((w) => statuses.includes(w.status as string))
    return acc
  }, {})

  const total = workItems?.length ?? 0
  const visibleColumns = activeColumn ? [activeColumn] : COLUMNS

  const chipHref = (nextStage: string | null, nextSub: string | null = null) => {
    const sp = new URLSearchParams()
    if (term) sp.set('q', term)
    if (assignee) sp.set('assignee', assignee)
    if (nextStage) sp.set('stage', nextStage)
    if (nextSub) sp.set('sub', nextSub)
    const qs = sp.toString()
    return qs ? `/app/pipeline?${qs}` : '/app/pipeline'
  }

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
        <div className="flex flex-wrap items-center justify-end gap-2">
        <NewLeadDialog />
        <PipelineFilter
          members={team.map((m) => ({
            id: m.id,
            label:
              [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(' ') ||
              (m.email ?? 'Teammate'),
          }))}
          assignee={assignee}
          initialTerm={term}
        />
        </div>
      </div>

      {/* One thumb-tap to any stage. On a phone the stages stack vertically,
          and at real volume (19 quotes and counting) reaching "Scheduled" was
          a marathon scroll. Sticky, with the true stage counts. */}
      {(total > 0 || stage) && (
        <nav
          aria-label="Filter by stage"
          className="sticky top-0 z-30 -mx-4 mt-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur sm:hidden"
        >
          {/* Filters, not anchor jumps: one stage on screen at a time. An
              anchor still left 70 drafts between you and Scheduled. */}
          <div className="flex gap-1.5 overflow-x-auto">
            <Link
              href={chipHref(null)}
              scroll={false}
              className={cn(
                'flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium',
                stage === null ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-card',
              )}
            >
              All
            </Link>
            {COLUMNS.map((col) => {
              const n = countFor(col.statuses)
              const active = stage === col.key
              return (
                <Link
                  key={col.key}
                  href={chipHref(active ? null : col.key)}
                  scroll={false}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-card',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', col.dot)} />
                  {col.label}
                  <span className={cn('tabular', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{n}</span>
                </Link>
              )
            })}
          </div>
          {activeColumn && activeColumn.statuses.length > 1 && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
              <Link
                href={chipHref(activeColumn.key)}
                scroll={false}
                className={cn(
                  'flex h-8 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-medium',
                  sub === null ? 'border-foreground/50 bg-muted' : 'border-border/60 bg-card text-muted-foreground',
                )}
              >
                All {countFor(activeColumn.statuses)}
              </Link>
              {activeColumn.statuses.map((st) => (
                <Link
                  key={st}
                  href={chipHref(activeColumn.key, sub === st ? null : st)}
                  scroll={false}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium capitalize',
                    sub === st ? 'border-foreground/50 bg-muted' : 'border-border/60 bg-card text-muted-foreground',
                  )}
                >
                  {SUB_LABELS[st] ?? st.replaceAll('_', ' ')}
                  <span className="tabular">{countFor([st])}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>
      )}

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
        <div
          className={cn(
            'mt-6 flex flex-col gap-5 sm:mt-6',
            activeColumn
              ? 'sm:mx-auto sm:w-full sm:max-w-2xl'
              : 'sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-5',
          )}
        >
          {/*
            Vertical on a phone, board from sm. The horizontal carousel this
            replaces kept the desktop kanban shape, which costs more than it
            gives on touch: the page scrolls vertically and the board scrolled
            horizontally, so the gestures fought; four of five stages sat
            off-screen, so "three quotes waiting on the customer" was invisible
            until you swiped to find it; and dragging a card between stages —
            the point of a board — is not a gesture that works on touch anyway.
            Standing in a driveway the question is "what do I do next", which is
            a list question.
          */}
          {visibleColumns.map((col) => {
            const items = grouped[col.key] ?? []
            const value = items.reduce((s, i) => s + Number(i.total ?? 0), 0)
            const trueCount = countFor(col.statuses)
            return (
              <div key={col.key} id={`stage-${col.key}`} className="w-full scroll-mt-16 sm:w-auto sm:min-w-0 sm:max-w-none">
                <div className="mb-2 flex items-center justify-between border-b border-border/60 px-1 pb-1.5 sm:border-0 sm:pb-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className={cn('h-1.5 w-1.5 rounded-full', col.dot)} />
                    {col.label}
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                      {trueCount}
                    </span>
                    {col.key === 'closed' && trueCount > items.length && (
                      <span className="text-[10px] text-muted-foreground">· 21d shown</span>
                    )}
                  </div>
                  {value > 0 && (
                    <span className="text-[11px] font-medium tabular text-muted-foreground">
                      {fmtMoney(value)}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {items.length === 0 && activeColumn && (
                    <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                      Nothing in {sub ? (SUB_LABELS[sub] ?? 'this view').toLowerCase() : 'this stage'} right now.
                    </p>
                  )}
                  {items.map((item) => (
                    <PipelineCard
                      key={item.id}
                      id={item.id}
                      status={item.status}
                      showStatus={col.statuses.length > 1}
                      jobName={item.job_name}
                      description={item.description}
                      customer={customerMap.get(item.customer_id ?? '') ?? 'Unknown customer'}
                      total={Number(item.total ?? 0)}
                      updatedAt={item.updated_at}
                    />
                  ))}
                  {col.key === 'leads' ? (
                    // The Leads column's Add captures a lead — it used to open
                    // the quote editor, so everything skipped straight to
                    // Quotes and this column read as permanently empty.
                    <NewLeadDialog trigger="column" />
                  ) : (
                    <Link
                      href="/app/quotes/new"
                      className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary lg:min-h-0"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Link>
                  )}
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
  showStatus,
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
  /**
   * Chips carry state, and inside a single-status section the header already
   * states it — a column of cards all chipped "New Lead" under "Leads" says
   * nothing. Quotes keeps its chips because Draft vs Sent vs Viewed is the
   * distinction the contractor scans for.
   */
  showStatus: boolean
}) {
  // One glance a row: what · who · worth · when. The tall card cost a third
  // of the screen per item; at 70 drafts, density is the feature.
  return (
    <Link
      href={`/app/pipeline/${id}`}
      className="group block rounded-lg border border-border/70 bg-background px-3 py-2.5 shadow-sm transition-all hover:border-border hover:shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
        <div className="min-w-0 flex-1 basis-44">
          {/* A lead with nothing typed yet is still a person, not "Untitled" —
              the customer becomes the title and the subtitle names the stage. */}
          <div className="truncate text-sm font-medium leading-snug">
            {jobName || description || customer}
          </div>
          {/* Wraps instead of truncating: in a five-across desktop column a
              one-line meta squeezed "Sarah Johnson" to "S…". */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            {showStatus && (
              <StatusBadge status={status as never} showIcon={false} className="text-[10px]" />
            )}
            <span className="min-w-0 max-w-full truncate">
              {jobName || description ? customer : 'New lead'}
            </span>
            <span className="shrink-0">{fmtRelative(updatedAt)}</span>
          </div>
        </div>
        {total > 0 && (
          <span className="ml-auto shrink-0 text-xs font-semibold tabular">{fmtMoney(total)}</span>
        )}
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
