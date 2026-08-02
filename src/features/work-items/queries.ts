/**
 * RSC-safe data fetchers for work_items.
 *
 * Called from server components + server actions only. All queries respect
 * RLS — the caller's Supabase session decides visibility.
 */

import 'server-only'

import { createClient } from '@/lib/supabase/server'

import { type ListFilters, listFiltersSchema } from './schemas'

export type WorkItemSummary = {
  id: string
  company_id: string
  customer_id: string
  status: string
  kind: string | null
  job_name: string | null
  description: string | null
  total: number
  subtotal: number
  tax_amount: number
  scheduled_start: string | null
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_SUMMARY =
  'id, company_id, customer_id, status, kind, job_name, description, ' +
  'total, subtotal, tax_amount, scheduled_start, assigned_to, created_by, ' +
  'created_at, updated_at'

export async function listWorkItems(filters: Partial<ListFilters> = {}): Promise<WorkItemSummary[]> {
  const parsed = listFiltersSchema.parse(filters)
  const supabase = await createClient()

  let query = supabase
    .from('work_items')
    .select(SELECT_SUMMARY)
    .order('created_at', { ascending: false })
    .range(parsed.offset, parsed.offset + parsed.limit - 1)

  if (parsed.kind) query = query.eq('kind', parsed.kind)
  if (parsed.status) query = query.eq('status', parsed.status)
  if (parsed.assigned_to) query = query.eq('assigned_to', parsed.assigned_to)
  if (parsed.created_by) query = query.eq('created_by', parsed.created_by)
  if (parsed.search) query = query.ilike('job_name', `%${parsed.search}%`)

  const { data, error } = await query
  if (error) throw new Error(`listWorkItems: ${error.message}`)
  return (data ?? []) as WorkItemSummary[]
}

export async function getWorkItemDetail(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quote_details_view' as never)
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getWorkItemDetail: ${error.message}`)
  return data
}

export async function getPipelineCounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('work_items')
    .select('kind, status')
  if (error) throw new Error(`getPipelineCounts: ${error.message}`)

  const counts = {
    lead: 0,
    quote_draft: 0,
    quote_sent: 0,
    quote_viewed: 0,
    quote_accepted: 0,
    quote_rejected: 0,
    job_scheduled: 0,
    job_in_progress: 0,
    job_completed: 0,
    archived: 0,
  } as Record<string, number>
  for (const row of data ?? []) {
    const status = (row as { status: string }).status
    if (status in counts) counts[status]! += 1
  }
  return counts
}
