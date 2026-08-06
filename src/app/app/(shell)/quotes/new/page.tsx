import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { QuoteEditor, type CatalogItem } from './quote-editor'

export default async function NewQuotePage() {
  const { companyId } = await requireSession()

  const [company] = await query<{ settings: Record<string, unknown> | null }>(
    `select settings from companies where id = $1 limit 1`,
    [companyId],
  )

  const settings = (company?.settings ?? {}) as { tax_rate?: number }
  const defaultTaxRate = settings.tax_rate ?? 8.5

  const catalog = await query<{
    id: string
    name: string
    description: string | null
    category: string | null
    base_price: number
    unit: string | null
  }>(
    `select id, name, description, category, base_price, unit
       from catalog_items
      where company_id = $1 and is_active = true
      order by category asc nulls last, name asc
      limit 500`,
    [companyId],
  )

  return (
    <QuoteEditor
      companyId={companyId}
      defaultTaxRate={defaultTaxRate}
      catalog={catalog as CatalogItem[]}
    />
  )
}
