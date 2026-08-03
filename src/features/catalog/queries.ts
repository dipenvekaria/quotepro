/**
 * Catalog queries + server actions.
 */

import { z } from 'zod'

import 'server-only'

import { createClient } from '@/lib/supabase/server'

export const catalogItemFilterSchema = z.object({
  category: z.string().optional(),
  is_active: z.boolean().default(true),
  search: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(200).default(100),
})

export type CatalogItemFilter = z.infer<typeof catalogItemFilterSchema>

export type CatalogItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  subcategory: string | null
  base_price: number
  unit: string
  is_active: boolean
  tags: string[]
  typical_quantity: number | null
  labor_hours: number | null
  material_cost: number | null
  job_type: string | null
}

const SELECT =
  'id, name, description, category, subcategory, base_price, unit, is_active, ' +
  'tags, typical_quantity, labor_hours, material_cost, job_type'

export async function listCatalog(filter: Partial<CatalogItemFilter> = {}): Promise<CatalogItem[]> {
  const parsed = catalogItemFilterSchema.parse(filter)
  const supabase = await createClient()

  let query = supabase
    .from('catalog_items')
    .select(SELECT)
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(parsed.limit)

  if (parsed.is_active !== undefined) query = query.eq('is_active', parsed.is_active)
  if (parsed.category) query = query.eq('category', parsed.category)
  if (parsed.search) query = query.ilike('name', `%${parsed.search}%`)

  const { data, error } = await query
  if (error) throw new Error(`listCatalog: ${error.message}`)
  return ((data ?? []) as unknown) as CatalogItem[]
}

export async function getCatalogCategories(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('catalog_items')
    .select('category')
    .not('category', 'is', null)
  if (error) throw new Error(`getCatalogCategories: ${error.message}`)
  const uniq = new Set<string>()
  for (const row of data ?? []) {
    const cat = (row as { category: string | null }).category
    if (cat) uniq.add(cat)
  }
  return [...uniq].sort()
}
