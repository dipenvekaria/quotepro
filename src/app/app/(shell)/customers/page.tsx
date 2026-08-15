import Link from 'next/link'
import { Mail, MapPin, Phone, Plus, Users } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { NewCustomer } from './new-customer'

export default async function CustomersPage() {
  const { companyId } = await requireSession()

  // Data via the raw-Postgres layer. company_id is enforced here because this
  // connection is not RLS-bound.
  const list = await query<{
    id: string
    name: string
    email: string | null
    phone: string | null
    created_at: Date
  }>(
    `select id, name, email, phone, created_at
       from customers
      where company_id = $1
      order by created_at desc
      limit 200`,
    [companyId],
  )

  const addressRows = list.length
    ? await query<{
        customer_id: string
        address: string
        city: string | null
        state: string | null
        is_primary: boolean
      }>(
        `select customer_id, address, city, state, is_primary
           from customer_addresses
          where customer_id = any($1::uuid[])`,
        [list.map((c) => c.id)],
      )
    : []
  const primaryByCustomer = new Map<string, { address: string; city: string | null; state: string | null }>()
  for (const a of addressRows) {
    if (a.is_primary || !primaryByCustomer.has(a.customer_id)) {
      primaryByCustomer.set(a.customer_id, { address: a.address, city: a.city, state: a.state })
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
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
        <NewCustomer />
      </div>

      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="They get added automatically when you quote someone — or add one now and quote them later."
            action={<NewCustomer />}
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
                        {(c.name.split(' ').slice(0, 2).map((s: string) => s[0]).join('') || '?').toUpperCase()}
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
