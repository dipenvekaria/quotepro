import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { QuoteEditor, type CatalogItem, type InitialCustomer } from './quote-editor'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>
}) {
  const { companyId } = await requireSession()
  const { customer_id: customerId } = await searchParams

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

  // Starting a quote from a customer's page should not ask who it is for. The
  // company predicate is the tenancy check — an id from anywhere else loads
  // nothing rather than leaking a name.
  let initialCustomer: InitialCustomer | null = null
  if (customerId) {
    const [row] = await query<{
      id: string
      name: string
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
      job_count: number
    }>(
      `select c.id, c.name, c.email, c.phone,
              a.address, a.city, a.state, a.zip,
              (select count(*) from work_items w where w.customer_id = c.id)::int as job_count
         from customers c
         left join lateral (
           select address, city, state, zip from customer_addresses
            where customer_id = c.id order by is_primary desc, created_at limit 1
         ) a on true
        where c.id = $1 and c.company_id = $2
        limit 1`,
      [customerId, companyId],
    )
    if (row) initialCustomer = row
  }

  return (
    <QuoteEditor
      defaultTaxRate={defaultTaxRate}
      catalog={catalog as CatalogItem[]}
      initialCustomer={initialCustomer}
    />
  )
}
