import Link from 'next/link'
import { Activity, AlertTriangle, BookText, CreditCard, ExternalLink, Users } from 'lucide-react'

import { requirePlatformAdmin } from '@/lib/admin/guard'
import {
  platformAdmins,
  platformBusiness,
  platformCompanies,
  platformHealth,
  qboIssues,
  recentDegradedAi,
  recentPayments,
} from '@/lib/admin/queries'
import { posthogSnapshot, sentrySnapshot, vercelSnapshot, type ProviderCard } from '@/lib/admin/providers'

import { AdminsCard } from './admins-card'

export const dynamic = 'force-dynamic'

const fmtWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '—'

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default async function PlatformAdminPage() {
  const session = await requirePlatformAdmin()
  const [health, companies, degraded, qbo, payments, admins, vercel, sentry, posthog] =
    await Promise.all([
      platformHealth(),
      platformCompanies(),
      recentDegradedAi(),
      qboIssues(),
      recentPayments(),
      platformAdmins(),
      vercelSnapshot(),
      sentrySnapshot(),
      posthogSnapshot(),
    ])
  const biz = await platformBusiness()

  const alerts =
    health.degradedAi24h + health.qboErrorCount + health.recurringOverdue

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Operations</h1>
        <div className="flex gap-2">
          <a
            href="https://rivet-technologies.sentry.io/issues/"
            target="_blank" rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            Sentry <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://vercel.com/getrivet/rivet/logs"
            target="_blank" rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            Vercel logs <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://us.posthog.com"
            target="_blank" rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            PostHog <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Health strip */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Needs attention" value={String(alerts)} tone={alerts ? 'bad' : 'good'} />
        <Stat label="AI failures · 24h" value={String(health.degradedAi24h)} tone={health.degradedAi24h ? 'bad' : 'good'} />
        <Stat label="QuickBooks errors" value={String(health.qboErrorCount)} tone={health.qboErrorCount ? 'bad' : 'good'} />
        <Stat
          label="Last recurring spawn"
          value={fmtWhen(health.lastRecurringSpawn)}
          tone={health.recurringOverdue ? 'bad' : 'good'}
          hint={health.recurringOverdue ? `${health.recurringOverdue} overdue` : undefined}
        />
      </section>

      {/* Business */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="MRR" value={money(biz.mrrCents / 100)} tone="good" />
        <Stat
          label="Subscriptions"
          value={`${biz.soloActive + biz.teamActive}`}
          tone="good"
          hint={`${biz.soloActive} solo · ${biz.teamActive} team · ${biz.trialing} trialing`}
        />
        <Stat
          label="Companies"
          value={String(biz.companiesTotal)}
          tone="good"
          hint={`+${biz.companiesNew30d} in 30d`}
        />
        <Stat label="Active · 30d" value={String(biz.activeCompanies30d)} tone="good" />
        <Stat
          label="Churned"
          value={String(biz.canceled)}
          tone={biz.canceled30d ? 'bad' : 'good'}
          hint={biz.canceled30d ? `${biz.canceled30d} in 30d` : undefined}
        />
      </section>

      {/* Outside services — five-minute snapshots, fetched on page load only */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Provider title="Vercel" card={vercel} href="https://vercel.com/getrivet/rivet" />
        <Provider title="Sentry" card={sentry} href="https://rivet-technologies.sentry.io/issues/" />
        <Provider title="PostHog" card={posthog} href="https://us.posthog.com" />
      </section>

      {/* Alert detail */}
      {degraded.length > 0 && (
        <Card title="AI failures" icon={<AlertTriangle className="h-4 w-4 text-destructive" />}>
          <ul className="divide-y divide-border/60 text-sm">
            {degraded.map((d, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="text-xs tabular text-muted-foreground">{fmtWhen(d.created_at)}</span>
                <span className="font-medium">{d.company_name ?? '—'}</span>
                <span className="text-xs text-muted-foreground">{d.purpose}</span>
                <span className="w-full truncate font-mono text-xs text-muted-foreground">{d.error}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {qbo.length > 0 && (
        <Card title="QuickBooks sync errors" icon={<BookText className="h-4 w-4 text-destructive" />}>
          <ul className="divide-y divide-border/60 text-sm">
            {qbo.map((q, i) => (
              <li key={i} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{q.company_name}</span>
                  <span className="text-xs tabular text-muted-foreground">{fmtWhen(q.last_synced_at)}</span>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">{q.last_error}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Payments */}
      <Card title="Recent payments" icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {payments.map((p, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="text-xs tabular text-muted-foreground">{fmtWhen(p.paid_at)}</span>
                <span className="font-medium">{p.company_name}</span>
                <span className="text-xs text-muted-foreground">{p.invoice_number} · {p.method}</span>
                <span className="ml-auto tabular font-medium">{money(Number(p.amount))}</span>
                {p.reference_number && (
                  <span className="w-full truncate font-mono text-[10px] text-muted-foreground/80">{p.reference_number}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Companies */}
      <Card
        title={`Companies · ${companies.length}`}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        hint={`waitlist ${health.waitlistCount}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Company</th>
                <th className="py-2 pr-3 font-medium">Owner</th>
                <th className="py-2 pr-3 font-medium">Plan</th>
                <th className="py-2 pr-3 font-medium">Jobs</th>
                <th className="py-2 pr-3 font-medium">Stripe</th>
                <th className="py-2 pr-3 font-medium">QBO</th>
                <th className="py-2 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-3 font-medium">
                    <Link href={`/admin/companies/${c.id}`} className="underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate py-2 pr-3 text-muted-foreground">{c.owner_email ?? '—'}</td>
                  <td className="py-2 pr-3 capitalize">{c.subscription_status === 'trialing' ? 'trial' : (c.plan ?? '—')}</td>
                  <td className="py-2 pr-3 tabular">{c.work_items}</td>
                  <td className="py-2 pr-3">{c.stripe_charges_enabled ? '✓' : '—'}</td>
                  <td className="py-2 pr-3">{c.qbo_connected ? '✓' : '—'}</td>
                  <td className="py-2 text-xs tabular text-muted-foreground">{fmtWhen(c.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Access */}
      <Card title="Platform admins" icon={<Activity className="h-4 w-4 text-muted-foreground" />}>
        <AdminsCard admins={admins} self={session.email} />
        <p className="mt-3 text-[11px] text-muted-foreground">
          Anyone listed signs in at <Link href="/login" className="underline">getrivet.ai/login</Link> with
          Google using that address, then opens /admin. Everyone else sees a 404.
        </p>
      </Card>
    </div>
  )
}

function Provider({ title, card, href }: { title: string; card: ProviderCard; href: string }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <a href={href} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline">
          open <ExternalLink className="ml-0.5 inline h-3 w-3" />
        </a>
      </header>
      <div className="space-y-1.5 p-4 text-sm">
        {card.state === 'unconfigured' && (
          <p className="text-xs text-muted-foreground">{card.hint} in Vercel to activate.</p>
        )}
        {card.state === 'error' && (
          <p className="font-mono text-xs text-destructive">{card.error}</p>
        )}
        {card.state === 'ok' &&
          card.lines.map((l, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-xs text-muted-foreground">{l.label}</span>
              <span className="truncate text-right tabular">{l.value}</span>
            </div>
          ))}
      </div>
    </section>
  )
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone: 'good' | 'bad'; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular ${tone === 'bad' ? 'text-destructive' : ''}`}>{value}</div>
      {hint && (
        <div className={`text-xs ${tone === 'bad' ? 'text-destructive' : 'text-muted-foreground'}`}>{hint}</div>
      )}
    </div>
  )
}

function Card({ title, icon, hint, children }: { title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
      </header>
      <div className="p-5 pt-3">{children}</div>
    </section>
  )
}
