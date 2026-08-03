import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mail, MapPin, Phone, Plus, Users } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/server'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) redirect('/app/onboarding')
  const companyId = profile.company_id as string

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email, phone, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(200)

  const list = customers ?? []

  const addresses = list.length
    ? await supabase
        .from('customer_addresses')
        .select('customer_id, address, city, state, is_primary')
        .in('customer_id', list.map((c) => c.id))
    : { data: [] }
  const primaryByCustomer = new Map<string, { address: string; city: string | null; state: string | null }>()
  for (const a of (addresses.data ?? [])) {
    if (a.is_primary || !primaryByCustomer.has(a.customer_id)) {
      primaryByCustomer.set(a.customer_id, { address: a.address, city: a.city, state: a.state })
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10 lg:py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-foreground">Customers</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? 'customer' : 'customers'} in your book.
          </p>
        </div>
        <Link
          href="/app/quotes/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add via new quote
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Customers get added automatically when you create a lead or quote."
            action={
              <Link
                href="/app/quotes/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" /> New quote
              </Link>
            }
          />
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border/70 bg-muted/40 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div>Name</div>
            <div className="hidden sm:block">Contact</div>
            <div className="hidden lg:block">Primary address</div>
            <div className="text-right">Added</div>
          </div>
          <ul className="divide-y divide-border/70">
            {list.map((c) => {
              const addr = primaryByCustomer.get(c.id)
              return (
                <li key={c.id}>
                  <Link
                    href={`/app/customers/${c.id}`}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(c.name.split(' ').slice(0, 2).map((s) => s[0]).join('') || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground sm:hidden">
                          {c.email ?? c.phone ?? '—'}
                        </div>
                      </div>
                    </div>
                    <div className="hidden min-w-0 items-center gap-3 sm:flex">
                      {c.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> <span className="truncate">{c.email}</span>
                        </span>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                    </div>
                    <div className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground lg:flex">
                      {addr ? (
                        <>
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {[addr.address, addr.city, addr.state].filter(Boolean).join(', ')}
                          </span>
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground tabular">
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
