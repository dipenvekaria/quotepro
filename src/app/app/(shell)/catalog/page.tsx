import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { hasPermission, type UserRole } from '@/lib/permissions'

import { CatalogManager, type CatalogItem } from './catalog-manager'

export default async function CatalogPage() {
  const { companyId, role } = await requireSession()

  const items = await query<CatalogItem>(
    `select id, name, description, category, base_price, unit, is_active
       from catalog_items
      where company_id = $1
      order by category asc nulls last, name asc
      limit 500`,
    [companyId],
  )

  const canEdit = hasPermission(role as UserRole, 'canEditCatalog')
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

      <CatalogManager items={items} canEdit={canEdit} />
    </div>
  )
}
