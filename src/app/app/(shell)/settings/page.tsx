import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, Check, ChevronDown, Clock, CreditCard, ListChecks, Mail, Palette, Users, Wallet, type LucideIcon } from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { ROLE_LABEL } from '@/lib/team-personas'
import { loadBusinessHours } from '@/lib/scheduling/availability'

import { SettingsForm } from './settings-form'
import { BillingCard } from './billing-card'
import { gettingStartedSteps } from '@/lib/getting-started'
import { refreshStripeAccountFlags } from '@/lib/stripe/connect-status'
import { PLANS, currentTier } from '@/lib/stripe/billing'
import { WorkingHours } from './working-hours'
import { InviteTeammateDialog, RevokeInviteButton } from './invite-dialog'
import { DangerZone } from './danger-zone'
import { AppearanceSettings } from './appearance'
import { CatalogAccessToggle } from './catalog-access'

// ---------------------------------------------------------------------------

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { companyId, role } = await requireSession()
  const sp = await searchParams
  if (sp.stripe) await refreshStripeAccountFlags(companyId)

  // Withhold in the query, not the markup: a value behind a JSX conditional
  // still ships in the RSC payload. Technicians and sales get neither the team
  // roster nor the company's financial settings.
  const canEdit = role === 'owner'
  const canManageTeam = role === 'owner' || role === 'office'

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
            stripe_subscription_id, subscription_status, trial_ends_at,
            stripe_account_id, stripe_charges_enabled, stripe_details_submitted, pass_card_fees
       from companies
      where id = $1
      limit 1`,
    [companyId],
  )

  const teammates = canManageTeam
    ? await query<{
        id: string
        email: string | null
        role: string
        profile: Record<string, unknown> | null
        is_active: boolean
        last_login_at: string | null
        can_edit_catalog: boolean | null
      }>(
        `select u.id, au.email, u.role, u.profile, u.is_active, u.last_login_at, u.can_edit_catalog
           from users u
           left join auth.users au on au.id = u.id
          where u.company_id = $1
          order by u.role asc`,
        [companyId],
      )
    : []

  const pendingInvites = canManageTeam
    ? await query<{
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
    : []

  if (!company) redirect('/app/onboarding')

  const businessHours = await loadBusinessHours(companyId)

  const gs = await gettingStartedSteps(companyId)
  const settings = (company.settings ?? {}) as {
    tax_rate?: number
    timezone?: string
    review_link_google?: string | null
    review_link_facebook?: string | null
    quote_terms?: string | null
    business_tax_id?: string | null
  }

  const tier = canEdit ? await currentTier() : 'founding'

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header>
        <div className="text-xs text-muted-foreground">Workspace</div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage {company.name} — company details, tax rate, and team access.
        </p>
      </header>

      {/* Collapsed <details> cards: the page reads as a scannable index instead
          of one long scroll. Native element — no JS, keyboard for free. */}
      <SettingsGroup icon={Palette} title="Appearance">
        <div className="p-5">
          <AppearanceSettings />
        </div>
      </SettingsGroup>

      {/* Getting started — permanent home; the dashboard card is dismissible */}
      <SettingsGroup
        icon={ListChecks}
        title="Getting started"
        hint={`${gs.steps.length - gs.remaining} of ${gs.steps.length} done`}
        defaultOpen={gs.remaining > 0}
      >
        <ul className="space-y-1 p-5 pt-3">
          {gs.steps.map((step) => (
            <li key={step.label}>
              {step.done ? (
                <div className="flex min-h-9 items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="line-through decoration-muted-foreground/40">{step.label}</span>
                </div>
              ) : (
                <Link
                  href={step.href}
                  className="flex min-h-11 items-center gap-2.5 rounded-md text-sm font-medium hover:bg-muted/50 lg:min-h-9"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-primary/40" />
                  {step.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </SettingsGroup>

      {canEdit && (
      <SettingsGroup
        icon={CreditCard}
        title="Billing"
        hint={(company as { subscription_status?: string | null }).subscription_status === 'trialing'
          ? 'Trial'
          : `${(company.plan ?? 'trial').charAt(0).toUpperCase()}${(company.plan ?? 'trial').slice(1)}`}
      >
        <div className="p-5">
          <BillingCard
            plan={company.plan ?? null}
            status={(company as { subscription_status?: string | null }).subscription_status ?? null}
            trialEndsAt={(company as { trial_ends_at?: string | null }).trial_ends_at ?? null}
            canEdit={canEdit}
            founding={tier === 'founding'}
            prices={{
              solo: `$${PLANS.solo[tier].amount / 100}`,
              team: `$${PLANS.team[tier].amount / 100}`,
            }}
          />
        </div>
      </SettingsGroup>
      )}

      {canEdit && (
      <SettingsGroup icon={Building2} title="Company" hint={company.name}>
        <div className="p-5">
          <SettingsForm
            logoUrl={company.logo_url ?? null}
            canEdit={canEdit}
            initial={{
              name: company.name,
              phone: company.phone ?? '',
              email: company.email ?? '',
              address: company.address ?? '',
              tax_rate: settings.tax_rate ?? 8.5,
              review_link_google: settings.review_link_google ?? '',
              review_link_facebook: settings.review_link_facebook ?? '',
              quote_terms: settings.quote_terms ?? '',
              business_tax_id: settings.business_tax_id ?? '',
              timezone: typeof settings.timezone === 'string' ? settings.timezone : 'America/Chicago',
            }}
          />
        </div>
      </SettingsGroup>
      )}

      {canEdit && (
        <SettingsGroup icon={Clock} title="Working hours">
          <WorkingHours initial={businessHours} />
        </SettingsGroup>
      )}

      {canManageTeam && (
      <SettingsGroup
        id="team"
        icon={Users}
        title="Team"
        hint={`${teammates?.length ?? 0} ${(teammates?.length ?? 0) === 1 ? 'person' : 'people'}`}
        defaultOpen={Boolean(sp.invite)}
      >
        {canManageTeam && (
          <div className="flex justify-end border-b border-border/70 px-5 py-3">
            <InviteTeammateDialog />
          </div>
        )}
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
                  {/* Owners are omitted rather than shown switched on: they can
                      always edit, and a control that cannot be turned off reads
                      as broken. */}
                  {role === 'owner' && t.role !== 'owner' && (
                    <CatalogAccessToggle
                      userId={t.id}
                      name={name}
                      initial={t.can_edit_catalog === true}
                    />
                  )}
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
      </SettingsGroup>
      )}

      {canEdit && (
      <SettingsGroup
        icon={Wallet}
        title="Payments"
        hint={company.stripe_charges_enabled
          ? 'Ready'
          : company.stripe_account_id
            ? 'Onboarding'
            : 'Not connected'}
      >
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
            className="mt-3 inline-flex h-11 items-center gap-1 text-xs font-medium text-primary hover:underline lg:h-8"
          >
            Manage integrations <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </SettingsGroup>
      )}

      <div className="mt-4">
        <DangerZone isOwner={role === 'owner'} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function SettingsGroup({
  icon: Icon,
  title,
  hint,
  defaultOpen = false,
  id,
  children,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  defaultOpen?: boolean
  id?: string
  children: React.ReactNode
}) {
  return (
    <details
      id={id}
      open={defaultOpen || undefined}
      className="group mt-4 scroll-mt-24 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
    >
      <summary className="flex min-h-12 cursor-pointer select-none list-none items-center gap-2.5 px-5 py-3.5 transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto flex min-w-0 items-center gap-2.5 pl-3">
          {hint ? <span className="truncate text-xs text-muted-foreground">{hint}</span> : null}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-border/70">{children}</div>
    </details>
  )
}

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
