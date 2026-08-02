'use server'

/**
 * Server actions for work_items.
 *
 * All inputs Zod-validated. All writes flow through the caller's Supabase
 * session so RLS enforces multi-tenant isolation. Ownership-only mutations
 * (archive, delete) rely on the RLS policies in the baseline migration.
 */

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

import {
  type CreateLeadInput,
  archiveInputSchema,
  assignInputSchema,
  createLeadInputSchema,
  transitionStatusInputSchema,
} from './schemas'

// ----- helpers --------------------------------------------------------------

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } }
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// ----- actions --------------------------------------------------------------

/** Create a new lead — atomic upsert of customer + address + work_item. */
export async function createLead(input: CreateLeadInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createLeadInputSchema.safeParse(input)
  if (!parsed.success) return fail('validation_error', parsed.error.message)

  const supabase = await createClient()
  const uid = await currentUserId()
  if (!uid) return fail('auth_error', 'Not authenticated')

  const { data: userRow } = await supabase.from('users').select('company_id').eq('id', uid).single()
  const companyId = userRow?.company_id
  if (!companyId) return fail('auth_error', 'No company')

  const { data, error } = await supabase.rpc('create_work_item_with_customer', {
    p_company_id: companyId,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone ?? null,
    p_customer_email: parsed.data.customer_email ?? null,
    p_address: parsed.data.address ?? null,
    p_description: parsed.data.description,
    p_status: 'lead',
  })

  if (error) return fail('db_error', error.message)
  revalidatePath('/pipeline')
  return { ok: true, data: { id: String(data) } }
}

/** Transition a work_item to a new lifecycle status. */
export async function transitionStatus(
  input: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = transitionStatusInputSchema.safeParse(input)
  if (!parsed.success) return fail('validation_error', parsed.error.message)

  const supabase = await createClient()
  const timestamps: Record<string, string> = {}
  const now = new Date().toISOString()
  if (parsed.data.to === 'quote_sent') timestamps.sent_at = now
  else if (parsed.data.to === 'quote_viewed') timestamps.viewed_at = now
  else if (parsed.data.to === 'quote_accepted') timestamps.accepted_at = now
  else if (parsed.data.to === 'quote_rejected') timestamps.rejected_at = now
  else if (parsed.data.to === 'job_completed') timestamps.completed_at = now

  const { data, error } = await supabase
    .from('work_items')
    .update({ status: parsed.data.to, ...timestamps })
    .eq('id', parsed.data.id)
    .select('id, status')
    .maybeSingle()

  if (error) return fail('db_error', error.message)
  if (!data) return fail('not_found', 'Work item not found')

  revalidatePath('/pipeline')
  revalidatePath(`/pipeline/${parsed.data.id}`)
  return { ok: true, data }
}

/** Assign a work_item to a team member. */
export async function assignWorkItem(input: unknown): Promise<ActionResult<void>> {
  const parsed = assignInputSchema.safeParse(input)
  if (!parsed.success) return fail('validation_error', parsed.error.message)

  const supabase = await createClient()
  const { error } = await supabase
    .from('work_items')
    .update({ assigned_to: parsed.data.user_id })
    .eq('id', parsed.data.id)

  if (error) return fail('db_error', error.message)
  revalidatePath(`/pipeline/${parsed.data.id}`)
  return { ok: true, data: undefined }
}

/** Archive a work_item — soft delete with reason. */
export async function archiveWorkItem(input: unknown): Promise<ActionResult<void>> {
  const parsed = archiveInputSchema.safeParse(input)
  if (!parsed.success) return fail('validation_error', parsed.error.message)

  const supabase = await createClient()
  const { error } = await supabase
    .from('work_items')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_reason: parsed.data.reason,
    })
    .eq('id', parsed.data.id)

  if (error) return fail('db_error', error.message)
  revalidatePath('/pipeline')
  return { ok: true, data: undefined }
}
