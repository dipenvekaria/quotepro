import { canSeeAnalytics, canSeeCatalogPrices, customerScope, workItemScope } from '@/lib/auth/scope'
import { query } from '@/lib/db'
import { hasPermission, type UserRole } from '@/lib/permissions'

import { searchCatalog } from './catalog-index'

/**
 * What the assistant can do, and — more importantly — cannot.
 *
 * A chatbot over a multi-tenant product is a privilege escalation path unless
 * every tool goes through the same gates the screens do. "What was our revenue
 * last month?" asked by a technician must fail for the same reason
 * `/app/analytics` fails for them, not because a prompt asked the model to be
 * careful. The dashboard shipped exactly that leak once already, by reading no
 * role at all.
 *
 * So: **the caller's role is part of the tool context, and every tool consults
 * it.** The model never sees a role, never sends one, and has no argument that
 * could change one.
 *
 * Three tiers, deliberately different in kind:
 *
 * - **Read** — role-gated and row-scoped. A technician sees their own jobs.
 * - **Write** — permission-gated, reversible, internal. Creating a lead is fine.
 * - **Send** — outward-facing and irreversible. These do *not* execute. They
 *   return a proposal for a human to confirm, because a quote emailed to a
 *   homeowner cannot be recalled and an agent acting on a loosely-worded
 *   instruction should not be the last thing between a draft and a customer.
 */

export type AssistantContext = {
  companyId: string
  userId: string
  role: UserRole
}

/** Thrown when the caller's role forbids what was asked. Surfaces as the reply. */
class NotAllowed extends Error {
  constructor(what: string) {
    super(`You do not have access to ${what}. Ask an owner or office manager.`)
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function findCustomers(ctx: AssistantContext, q: string) {
  const scope = customerScope({ companyId: ctx.companyId, userId: ctx.userId, role: ctx.role }, 2)
  const term = q.trim()
  return query(
    `select c.id, c.name, c.phone, c.email
       from customers c
      where c.company_id = $1${scope.sql}
        and ($2 = '' or c.name ilike '%' || $2 || '%' or c.phone ilike '%' || $2 || '%'
             or c.email ilike '%' || $2 || '%')
      order by c.name asc
      limit 10`,
    [ctx.companyId, term, ...scope.params],
  )
}

/** Quotes and jobs the caller is allowed to see, newest first. */
export async function findWork(ctx: AssistantContext, opts: { status?: string; q?: string } = {}) {
  const scope = workItemScope({ companyId: ctx.companyId, userId: ctx.userId, role: ctx.role }, 3)
  return query(
    `select w.id, w.status, w.job_name, w.description, w.total, w.scheduled_start,
            c.name as customer_name
       from work_items w
       left join customers c on c.id = w.customer_id
      where w.company_id = $1
        and ($2 = '' or w.status::text = $2)
        and ($3 = '' or c.name ilike '%' || $3 || '%' or w.description ilike '%' || $3 || '%')
        ${scope.sql}
      order by w.updated_at desc
      limit 15`,
    [ctx.companyId, opts.status ?? '', (opts.q ?? '').trim(), ...scope.params],
  )
}

/** What this person is doing today. Scoped, so a technician gets their own round. */
export async function todaysSchedule(ctx: AssistantContext) {
  const scope = workItemScope({ companyId: ctx.companyId, userId: ctx.userId, role: ctx.role }, 3)
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 1)
  return query(
    `select w.id, w.status, w.scheduled_start, w.description, c.name as customer_name,
            a.address, a.city
       from work_items w
       left join customers c on c.id = w.customer_id
       left join customer_addresses a on a.id = w.address_id
      where w.company_id = $1 and w.scheduled_start >= $2 and w.scheduled_start < $3${scope.sql}
      order by w.scheduled_start asc`,
    [ctx.companyId, start.toISOString(), end.toISOString(), ...scope.params],
  )
}

/**
 * Revenue, close rate, open pipeline.
 *
 * Owner and office only — the same gate as `/app/analytics`. This is the tool
 * most likely to be asked for by someone who should not have it, and the reason
 * the role lives in the context rather than in the prompt.
 */
export async function businessSummary(ctx: AssistantContext) {
  if (!canSeeAnalytics(ctx.role)) throw new NotAllowed('revenue and pipeline figures')

  const [row] = await query<Record<string, number>>(
    `select
       count(*) filter (where sent_at >= now() - interval '30 days')::int as quotes_sent_30d,
       count(*) filter (where accepted_at >= now() - interval '30 days')::int as accepted_30d,
       coalesce(sum(total) filter (where status = 'job_completed'
                 and updated_at >= now() - interval '30 days'), 0)::numeric as revenue_30d,
       coalesce(sum(total) filter (where status in
                 ('quote_sent','quote_accepted','job_scheduled','job_in_progress')), 0)::numeric as open_pipeline
     from work_items where company_id = $1`,
    [ctx.companyId],
  )
  return row
}

/** Unpaid invoices. Money owed is not a technician's business. */
export async function overdueInvoices(ctx: AssistantContext) {
  if (!canSeeAnalytics(ctx.role)) throw new NotAllowed('invoices and payments')
  return query(
    `select i.invoice_number, i.total, i.amount_paid, i.due_date, c.name as customer_name
       from invoices i
       left join customers c on c.id = i.customer_id
      where i.company_id = $1 and i.status::text = any($2::text[]) and i.due_date < current_date
      order by i.due_date asc limit 10`,
    [ctx.companyId, ['sent', 'partial', 'overdue']],
  )
}

/**
 * Look something up in the price book.
 *
 * Everyone may search it — a technician explaining a part in someone's utility
 * room needs the name and the description. Prices are withheld from those who
 * may not see them **in the returned object**, not by asking the model to omit
 * them: anything returned to the model can be repeated by it.
 */
export async function lookupCatalog(ctx: AssistantContext, q: string) {
  const hits = await searchCatalog(ctx.companyId, q, 8)
  const showPrices = canSeeCatalogPrices(ctx.role)

  // Silence is not enough. Asked for a price it had not been given, the model
  // invented one — $199 for an item that costs $249 — because an absent field
  // reads as a gap to fill rather than a refusal. A technician repeating that
  // to a customer is the exact failure this gate exists to prevent.
  //
  // So the withholding is stated rather than implied: the model is told, in the
  // data, that a price exists and it may not have it.
  return {
    prices_visible: showPrices,
    ...(showPrices
      ? {}
      : {
          notice:
            'Prices are hidden for this role. Do not state, estimate or guess a price. ' +
            'Say that you cannot see prices and they should ask an owner or office manager.',
        }),
    items: hits.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      category: h.category,
      ...(showPrices ? { price: Number(h.base_price) } : { price: 'hidden' }),
    })),
  }
}

// ---------------------------------------------------------------------------
// Write — internal and reversible
// ---------------------------------------------------------------------------

export async function createLead(
  ctx: AssistantContext,
  input: { customer_name: string; description: string; phone?: string },
) {
  if (!hasPermission(ctx.role, 'canCreateLeads')) throw new NotAllowed('creating leads')

  const [customer] = await query<{ id: string }>(
    `insert into customers (company_id, name, phone) values ($1, $2, $3) returning id`,
    [ctx.companyId, input.customer_name, input.phone ?? null],
  )
  const [work] = await query<{ id: string }>(
    `insert into work_items (company_id, customer_id, status, kind, description, created_by, public_token, quote_number)
     values ($1, $2, 'lead', 'lead', $3, $4, encode(gen_random_bytes(16), 'hex'),
             'Q-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)))
     returning id`,
    [ctx.companyId, customer.id, input.description, ctx.userId],
  )
  return { work_item_id: work.id, customer_id: customer.id }
}

export async function rescheduleWork(ctx: AssistantContext, workItemId: string, startsAt: string) {
  if (!hasPermission(ctx.role, 'canScheduleJobs')) throw new NotAllowed('rescheduling work')

  const when = new Date(startsAt)
  if (Number.isNaN(when.getTime())) throw new Error('that date did not parse')

  const [row] = await query<{ id: string; scheduled_start: string }>(
    `update work_items
        set scheduled_start = $1,
            scheduled_end = case when scheduled_end is null then null
              else scheduled_end + ($1::timestamptz - scheduled_start) end
      where id = $2 and company_id = $3
      returning id, scheduled_start`,
    [when.toISOString(), workItemId, ctx.companyId],
  )
  if (!row) throw new Error('that job is not in your workspace')
  return row
}

// ---------------------------------------------------------------------------
// Send — outward-facing, proposed rather than performed
// ---------------------------------------------------------------------------

export type ProposedAction = {
  proposed: true
  action: 'send_quote' | 'send_invoice'
  work_item_id: string
  summary: string
  note: string
}

/**
 * Does not send anything.
 *
 * Emailing a quote to a homeowner cannot be recalled, and "send it" is a
 * sentence a contractor might say while meaning "get it ready". So this returns
 * something for the interface to put a confirm button on. The agent's job ends
 * at proposing.
 */
export async function proposeSendQuote(
  ctx: AssistantContext,
  workItemId: string,
): Promise<ProposedAction> {
  if (!hasPermission(ctx.role, 'canSendQuotes')) throw new NotAllowed('sending quotes')

  const [row] = await query<{ total: number; customer_name: string | null; status: string }>(
    `select w.total, w.status, c.name as customer_name
       from work_items w left join customers c on c.id = w.customer_id
      where w.id = $1 and w.company_id = $2 limit 1`,
    [workItemId, ctx.companyId],
  )
  if (!row) throw new Error('that quote is not in your workspace')

  return {
    proposed: true,
    action: 'send_quote',
    work_item_id: workItemId,
    summary: `Send the ${row.customer_name ?? 'customer'} quote for $${Number(row.total).toFixed(2)}`,
    note: 'Nothing has been sent. Confirm to email it.',
  }
}
