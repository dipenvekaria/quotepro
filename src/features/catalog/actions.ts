'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const upsertCatalogItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  base_price: z.number().nonnegative(),
  unit: z.string().default('each'),
  tags: z.array(z.string()).default([]),
  typical_quantity: z.number().nullable().optional(),
  labor_hours: z.number().nullable().optional(),
  material_cost: z.number().nullable().optional(),
  job_type: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

export type UpsertCatalogItemInput = z.infer<typeof upsertCatalogItemSchema>

export async function upsertCatalogItem(input: UpsertCatalogItemInput) {
  const parsed = upsertCatalogItemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: { code: 'validation_error', message: parsed.error.message } }
  }

  const supabase = await createClient()
  const { data: userRow } = await supabase.auth.getUser()
  const uid = userRow.user?.id
  if (!uid) return { ok: false as const, error: { code: 'auth_error', message: 'Not authenticated' } }

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', uid).single()
  const companyId = profile?.company_id
  if (!companyId) {
    return { ok: false as const, error: { code: 'auth_error', message: 'No company' } }
  }

  const { data, error } = await supabase
    .from('catalog_items')
    .upsert({ ...parsed.data, company_id: companyId }, { onConflict: 'id' })
    .select('id')
    .single()

  if (error) return { ok: false as const, error: { code: 'db_error', message: error.message } }
  revalidatePath('/catalog')
  return { ok: true as const, data: { id: data.id } }
}

export async function deactivateCatalogItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('catalog_items').update({ is_active: false }).eq('id', id)
  if (error) return { ok: false as const, error: { code: 'db_error', message: error.message } }
  revalidatePath('/catalog')
  return { ok: true as const, data: undefined }
}
