import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { WorkItemDetail, type LineItem } from './work-item-detail'

// ---------------------------------------------------------------------------

export default async function WorkItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { companyId } = await requireSession()

  const [row] = await query<{
    id: string
    status: string
    kind: string | null
    description: string | null
    notes: string | null
    job_name: string | null
    quote_number: string | null
    customer_summary: string | null
    invoice_number: string | null
    job_number: string | null
    subtotal: number | null
    discount_amount: number | null
    tax_rate: number | null
    tax_amount: number | null
    total: number | null
    scheduled_start: string | null
    scheduled_end: string | null
    sent_at: string | null
    viewed_at: string | null
    accepted_at: string | null
    rejected_at: string | null
    completed_at: string | null
    public_token: string | null
    created_at: string
    updated_at: string
    customer_id: string | null
    address_id: string | null
    created_by: string | null
    assigned_to: string | null
    c_id: string | null
    c_name: string | null
    c_email: string | null
    c_phone: string | null
    a_address: string | null
    a_city: string | null
    a_state: string | null
    a_zip: string | null
    creator_profile: Record<string, unknown> | null
    assignee_profile: Record<string, unknown> | null
  }>(
    `select w.id, w.status, w.kind, w.description, w.notes, w.job_name,
            w.quote_number, w.invoice_number, w.job_number,
            w.subtotal, w.discount_amount, w.tax_rate, w.tax_amount, w.total,
            w.scheduled_start, w.scheduled_end,
            w.sent_at, w.viewed_at, w.accepted_at, w.rejected_at, w.completed_at,
            w.public_token, w.customer_summary, w.created_at, w.updated_at,
            w.customer_id, w.address_id, w.created_by, w.assigned_to,
            c.id as c_id, c.name as c_name, c.email as c_email, c.phone as c_phone,
            a.address as a_address, a.city as a_city, a.state as a_state, a.zip as a_zip,
            cr.profile as creator_profile,
            asg.profile as assignee_profile
       from work_items w
       left join customers c on c.id = w.customer_id
       left join customer_addresses a on a.id = w.address_id
       left join users cr on cr.id = w.created_by
       left join users asg on asg.id = w.assigned_to
      where w.company_id = $1 and w.id = $2
      limit 1`,
    [companyId, id],
  )

  if (!row) notFound()

  const workItem = {
    id: row.id,
    status: row.status,
    kind: row.kind,
    description: row.description,
    notes: row.notes,
    job_name: row.job_name,
    quote_number: row.quote_number,
    customer_summary: row.customer_summary,
    invoice_number: row.invoice_number,
    job_number: row.job_number,
    subtotal: row.subtotal,
    discount_amount: row.discount_amount,
    tax_rate: row.tax_rate,
    tax_amount: row.tax_amount,
    total: row.total,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    sent_at: row.sent_at,
    viewed_at: row.viewed_at,
    accepted_at: row.accepted_at,
    rejected_at: row.rejected_at,
    completed_at: row.completed_at,
    public_token: row.public_token,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer_id: row.customer_id,
    address_id: row.address_id,
    created_by: row.created_by,
    assigned_to: row.assigned_to,
    customers: row.c_id
      ? { id: row.c_id, name: row.c_name, email: row.c_email, phone: row.c_phone }
      : null,
    addresses:
      row.a_address || row.a_city || row.a_state || row.a_zip
        ? { address: row.a_address, city: row.a_city, state: row.a_state, zip: row.a_zip }
        : null,
    creator: row.creator_profile ? { profile: row.creator_profile } : null,
    assignee: row.assignee_profile ? { profile: row.assignee_profile } : null,
  }

  const quoteItems = await query<{
    id: string
    name: string
    description: string | null
    quantity: number
    unit_price: number
    sort_order: number | null
    is_upsell: boolean
    is_discount: boolean
  }>(
    `select id, name, description, quantity, unit_price, sort_order, is_upsell, is_discount
       from quote_items
      where work_item_id = $1
      order by sort_order asc`,
    [id],
  )

  const teammates = await query<{ id: string; profile: { full_name?: string } | null }>(
    `select id, profile
       from users
      where company_id = $1 and is_active = true
      order by created_at asc`,
    [companyId],
  )

  const [invoice] = await query<{
    id: string
    invoice_number: string | null
    status: string
    total: number | null
    amount_paid: number | null
    sent_at: string | null
    paid_at: string | null
    due_date: string | null
    public_token: string | null
  }>(
    `select id, invoice_number, status, total, amount_paid, sent_at, paid_at, due_date, public_token
       from invoices
      where work_item_id = $1
      limit 1`,
    [id],
  )

  const payments = invoice
    ? await query<{
        id: string
        amount: number | null
        method: string | null
        reference_number: string | null
        paid_at: string | null
      }>(
        `select id, amount, method, reference_number, paid_at
           from payments
          where invoice_id = $1
          order by paid_at desc`,
        [invoice.id],
      )
    : []

  return (
    <WorkItemDetail
      workItem={workItem as unknown as Parameters<typeof WorkItemDetail>[0]['workItem']}
      lineItems={(quoteItems ?? []) as LineItem[]}
      teammates={
        (teammates ?? []).map((t) => {
          const p = (t.profile as { full_name?: string } | null)
          return { id: t.id, name: p?.full_name || 'Teammate' }
        })
      }
      invoice={invoice as Parameters<typeof WorkItemDetail>[0]['invoice']}
      payments={(payments ?? []) as Parameters<typeof WorkItemDetail>[0]['payments']}
    />
  )
}
