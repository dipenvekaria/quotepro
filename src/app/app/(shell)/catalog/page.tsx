import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { canSeeCatalog } from '@/lib/auth/scope'
import { query } from '@/lib/db'
import { hasPermission, type UserRole } from '@/lib/permissions'

import { listPromotions } from './actions'
import { CatalogManager, type CatalogItem } from './catalog-manager'
import { PromotionsManager } from './promotions-manager'

export default async function CatalogPage() {
  const { companyId, role } = await requireSession()

  // The price book is the contractor's margin. permissions.ts has always said
  // canViewCatalog is false for sales and technicians; nothing enforced it.
  if (!canSeeCatalog(role as UserRole)) notFound()

  const items = await query<CatalogItem>(
    `select ci.id, ci.name, ci.description, ci.category, ci.base_price, ci.unit, ci.is_active,
            coalesce(
              (select array_agg(l.name order by l.name)
                 from catalog_item_labels il
                 join catalog_labels l on l.id = il.label_id
                where il.catalog_item_id = ci.id),
              '{}'
            ) as labels
       from catalog_items ci
      where ci.company_id = $1
      order by ci.category asc nulls last, ci.name asc
      limit 500`,
    [companyId],
  )

  const canEdit = hasPermission(role as UserRole, 'canEditCatalog')
  const promotions = await listPromotions()
  const labelOptions = [...new Set(items.flatMap((i) => i.labels ?? []))].sort()

  const categories = new Set(items.map((i) => i.category?.trim() || 'Uncategorized'))

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-foreground">Catalog</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? 'Add the items your business sells so quotes use your real pricing.'
              : `${items.length} pricing ${items.length === 1 ? 'item' : 'items'} across ${categories.size} ${categories.size === 1 ? 'category' : 'categories'}.`}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PromotionsManager
          promotions={promotions}
          labelOptions={labelOptions}
          canEdit={canEdit}
        />
      </div>

      <CatalogManager items={items} canEdit={canEdit} />
    </div>
  )
}
