import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2 } from 'lucide-react'

import { requirePlatformAdmin } from '@/lib/admin/guard'
import { adminCompanyDetail } from '@/lib/admin/queries'
import { ManageCompany } from './manage-company'

export const dynamic = 'force-dynamic'

const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin()
  const { id } = await params
  const co = await adminCompanyDetail(id)
  if (!co) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Operations
      </Link>

      <header className="mt-2 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{co.name}</h1>
          <p className="text-xs text-muted-foreground">
            Since {fmtDay(co.created_at)} · {co.work_items} work items · {co.quotes_sent} sent ·{' '}
            ${co.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} collected
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-4">
        <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Billing</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Plan</dt>
              <dd className="capitalize">{co.plan ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="capitalize">
                {co.complimentary ? 'Complimentary' : (co.subscription_status ?? 'none')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Trial ends</dt>
              <dd>{fmtDay(co.trial_ends_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Stripe</dt>
              <dd className="truncate text-xs text-muted-foreground">
                {co.stripe_subscription_id ?? 'no subscription'}
              </dd>
            </div>
          </dl>
        </section>

        <ManageCompany
          companyId={co.id}
          complimentary={co.complimentary}
          trialEndsAt={co.trial_ends_at}
          hasStripeSub={Boolean(co.stripe_subscription_id)}
          notes={co.admin_notes ?? ''}
        />

        <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">People · {co.users.length}</h2>
          <ul className="mt-3 divide-y divide-border/50 text-sm">
            {co.users.map((u) => (
              <li key={u.email} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{u.name ?? u.email}</span>
                  {u.name && <span className="ml-2 truncate text-xs text-muted-foreground">{u.email}</span>}
                </span>
                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="text-xs capitalize text-muted-foreground">{u.role}</span>
                  <span className="text-xs tabular text-muted-foreground">
                    {u.last_sign_in ? `seen ${fmtDay(u.last_sign_in)}` : 'never signed in'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {co.recent_admin_actions.length > 0 && (
          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Admin history</h2>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {co.recent_admin_actions.map((a, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{a.action.replaceAll('_', ' ')}</span> —{' '}
                  {a.actor_email} · {fmtDay(a.created_at)}
                  {a.target.includes(' ') && <span> · {a.target.split(' ').slice(1).join(' ')}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
