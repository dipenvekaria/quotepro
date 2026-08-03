import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, CreditCard, Sparkles, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { SettingsForm } from './settings-form'

// ---------------------------------------------------------------------------

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, profile, email')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url, phone, email, address, settings, subscription_tier, subscription_status, stripe_account_id, stripe_charges_enabled, stripe_details_submitted, pass_card_fees')
    .eq('id', profile.company_id)
    .maybeSingle()

  const { data: teammates } = await supabase
    .from('users')
    .select('id, email, role, profile, is_active, last_seen_at')
    .eq('company_id', profile.company_id)
    .order('role', { ascending: true })

  if (!company) redirect('/app/onboarding')

  const canEdit = profile.role === 'owner' || profile.role === 'admin'
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

      {/* Team */}
      <section className="mt-6 rounded-xl border border-border/70 bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Team</h2>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
              {teammates?.length ?? 0}
            </span>
          </div>
          {canEdit && (
            <button
              disabled
              className="rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground"
              title="Invite flow coming next"
            >
              Invite teammate
            </button>
          )}
        </header>
        <ul className="divide-y divide-border/70">
          {(teammates ?? []).map((t) => {
            const p = t.profile as { full_name?: string } | null
            const name = p?.full_name || t.email
            const initials = (name || '?')
              .split(' ')
              .slice(0, 2)
              .map((s: string) => s.charAt(0))
              .join('')
              .toUpperCase()
            return (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">{t.email}</div>
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
                {company.subscription_tier ?? 'trial'}
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

      {/* AI (mock) */}
      <section className="mt-6 mb-10 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-semibold">AI configuration</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The AI backend at{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">python-backend/</code>{' '}
          is grounded on your catalog. Real Gemini generation activates when{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">GEMINI_API_KEY</code>{' '}
          is set; otherwise it falls back to a keyword-matched preview using your catalog items.
        </p>
      </section>
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
