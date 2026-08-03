import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { WorkItemDetail, type LineItem } from './work-item-detail'

// ---------------------------------------------------------------------------

export default async function WorkItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: workItem, error } = await supabase
    .from('work_items')
    .select(`
      id, status, kind, description, notes, job_name, quote_number, invoice_number, job_number,
      subtotal, discount_amount, tax_rate, tax_amount, total,
      scheduled_start, scheduled_end,
      sent_at, viewed_at, accepted_at, rejected_at, completed_at,
      public_token, created_at, updated_at,
      customer_id, address_id, created_by, assigned_to,
      customers!work_items_customer_id_fkey (id, name, email, phone),
      addresses:customer_addresses!work_items_address_id_fkey (address, city, state, zip),
      creator:users!work_items_created_by_fkey (email, profile),
      assignee:users!work_items_assigned_to_fkey (email, profile)
    `)
    .eq('company_id', profile.company_id)
    .eq('id', id)
    .maybeSingle()

  if (error || !workItem) notFound()

  const { data: quoteItems } = await supabase
    .from('quote_items')
    .select('id, name, description, quantity, unit_price, sort_order, is_upsell, is_discount')
    .eq('work_item_id', id)
    .order('sort_order', { ascending: true })

  const { data: teammates } = await supabase
    .from('users')
    .select('id, email, profile')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('email', { ascending: true })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, amount_paid, sent_at, paid_at, due_date, public_token')
    .eq('work_item_id', id)
    .maybeSingle()

  const { data: payments } = invoice
    ? await supabase
        .from('payments')
        .select('id, amount, method, reference_number, paid_at')
        .eq('invoice_id', invoice.id)
        .order('paid_at', { ascending: false })
    : { data: [] as never[] }

  return (
    <WorkItemDetail
      workItem={workItem as unknown as Parameters<typeof WorkItemDetail>[0]['workItem']}
      lineItems={(quoteItems ?? []) as LineItem[]}
      teammates={
        (teammates ?? []).map((t) => {
          const p = (t.profile as { full_name?: string } | null)
          return { id: t.id, name: p?.full_name || t.email }
        })
      }
      invoice={invoice as Parameters<typeof WorkItemDetail>[0]['invoice']}
      payments={(payments ?? []) as Parameters<typeof WorkItemDetail>[0]['payments']}
    />
  )
}
