import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, CreditCard, Mail, Users } from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { ROLE_LABEL } from '@/lib/team-personas'

import { loadBusinessHours } from '@/lib/scheduling/availability'

import { SettingsForm } from './settings-form'
import { WorkingHours } from './working-hours'
import { InviteTeammateDialog, RevokeInviteButton } from './invite-dialog'
import { DangerZone } from './danger-zone'

// ---------------------------------------------------------------------------

export default async function SettingsPage() {
  const { companyId, role } = await requireSession()

  const [company] = await query<{
    id: string
    name: string
    logo_url: string | null
    phone: string | null
    email: string | null
    address: string | null
    settings: Record<string, unknown> | null
    plan: string | null
    stripe_account_id: string | null
    stripe_charges_enabled: boolean | null
    stripe_details_submitted: boolean | null
    pass_card_fees: boolean | null
  }>(
    `select id, name, logo_url, phone, email, address, settings, plan,
            stripe_account_id, stripe_charges_enabled, stripe_details_submitted, pass_card_fees
       from companies
      where id = $1
      limit 1`,
    [companyId],
  )

  const teammates = await query<{
    id: string
    email: string | null
    role: string
    profile: Record<string, unknown> | null
    is_active: boolean
    last_login_at: string | null
  }>(
    `select u.id, au.email, u.role, u.profile, u.is_active, u.last_login_at
       from users u
       left join auth.users au on au.id = u.id
      where u.company_id = $1
      order by u.role asc`,
    [companyId],
  )

  const pendingInvites = await query<{
    id: string
    email: string
    role: string
    created_at: string
  }>(
    `select id, email, role, created_at
       from invitations
      where company_id = $1 and status = 'pending' and expires_at > now()
      order by created_at desc`,
    [companyId],
  )

  if (!company) redirect('/app/onboarding')

  const businessHours = await loadBusinessHours(companyId)

  const canEdit = role === 'owner' || role === 'admin'
  const canManageTeam = role === 'owner' || role === 'office'
  const settings = (company.settings ?? {}) as { tax_rate?: number }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header>
        <div className="text-xs text-muted-foreground">Workspace</div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage {company.name} — company details, tax rate, and team access.
        </p>
      </header>

      {/* Company */}
      <section className="mt-6 rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center gap-2 border-b border-border/70 px-5 py-3.5">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Company</h2>
        </header>
        <div className="p-5">
          <SettingsForm
            canEdit={canEdit}
            initial={{
              name: company.name,
              logo_url: company.logo_url ?? '',
              phone: company.phone ?? '',
              email: company.email ?? '',
              address: company.address ?? '',
              tax_rate: settings.tax_rate ?? 8.5,
            }}
          />
        </div>
      </section>

      {canEdit && (
        <div className="mt-6">
          <WorkingHours initial={businessHours} />
        </div>
      )}

      {/* Team */}
      <section id="team" className="mt-6 scroll-mt-24 rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Team</h2>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
              {teammates?.length ?? 0}
            </span>
          </div>
          {canManageTeam && <InviteTeammateDialog />}
        </header>
        <ul className="divide-y divide-border/70">
          {(teammates ?? []).map((t) => {
            const p = t.profile as { full_name?: string } | null
            const emailName = t.email ? t.email.split('@')[0].replace(/[._-]+/g, ' ') : ''
            const name = p?.full_name || emailName || 'Teammate'
            const initials = (name || '?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((s: string) => s.charAt(0))
              .join('')
              .toUpperCase()
            const subtitle =
              t.email ||
              (t.last_login_at ? `Last active ${new Date(t.last_login_at).toLocaleDateString()}` : 'Invited')
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium capitalize">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={t.role as string} />
                  <div className="text-xs text-muted-foreground">
                    {t.is_active ? 'Active' : 'Disabled'}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {canManageTeam && pendingInvites.length > 0 && (
          <div className="border-t border-border/70 px-5 py-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pending invites
            </div>
            <ul className="space-y-2">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{inv.email}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {ROLE_LABEL[inv.role as keyof typeof ROLE_LABEL] ?? inv.role}
                    </span>
                  </div>
                  <RevokeInviteButton id={inv.id} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Billing (mock) */}
      <section className="mt-6 rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center gap-2 border-b border-border/70 px-5 py-3.5">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Payments</h2>
        </header>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            Payment processing lives on the{' '}
            <Link href="/app/integrations" className="text-primary hover:underline">
              Integrations page
            </Link>{' '}
            — connect your own Stripe account there.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {company.stripe_charges_enabled ? 'Stripe status' : 'Payments'}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    company.stripe_charges_enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                  }`}
                />
                {company.stripe_charges_enabled
                  ? 'Ready — customers can pay online'
                  : company.stripe_account_id
                    ? 'Onboarding in progress'
                    : 'Not connected'}
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Plan</div>
              <div className="mt-1 text-sm font-semibold capitalize">
                {company.plan ?? 'trial'}
              </div>
            </div>
          </div>
          <Link
            href="/app/integrations"
            className="mt-3 inline-flex h-8 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Manage integrations <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <DangerZone isOwner={role === 'owner'} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-primary/10 text-primary',
    admin: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    office: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    technician: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  }
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium capitalize ${
        styles[role] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {role}
    </span>
  )
}
