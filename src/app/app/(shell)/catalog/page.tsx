import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Package, Plus } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: items } = await supabase
    .from('catalog_items')
    .select('id, name, description, category, base_price, unit, tags, is_active')
    .eq('company_id', profile.company_id)
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(500)

  const list = items ?? []

  // group by category
  const grouped: Record<string, typeof list> = {}
  for (const it of list) {
    const cat = it.category ?? 'Uncategorized'
    grouped[cat] ??= []
    grouped[cat].push(it)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-foreground">Catalog</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length} pricing {list.length === 1 ? 'item' : 'items'} across {Object.keys(grouped).length} categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm hover:text-foreground">
            Import CSV
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Package}
            title="Your catalog is empty"
            description="Add items your business sells so AI can ground quotes in real pricing."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <section key={category} className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <header className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-5 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {category}
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                    {catItems.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular">
                  {fmtMoney(catItems.reduce((s, i) => s + Number(i.base_price), 0))} total
                </span>
              </header>

              <ul className="divide-y divide-border/70">
                {catItems.map((it) => (
                  <li
                    key={it.id}
                    className={cn(
                      'grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3',
                      !it.is_active && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{it.name}</div>
                      {it.description && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {it.description}
                        </div>
                      )}
                      {it.tags && it.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {it.tags.slice(0, 4).map((t: string) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="hidden text-right text-xs text-muted-foreground sm:block">
                      per {it.unit}
                    </div>
                    <div className="text-right text-sm font-semibold tabular">
                      {fmtMoney(Number(it.base_price))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
