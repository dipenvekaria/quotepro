import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  MessageSquare,
  Package,
  Slack,
  Sparkles,
  Zap,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

import { StripeConnect } from '../settings/stripe-connect'

// ---------------------------------------------------------------------------

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: company } = await supabase
    .from('companies')
    .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted, pass_card_fees')
    .eq('id', profile.company_id)
    .maybeSingle()

  if (!company) redirect('/app/onboarding')
  const canEdit = profile.role === 'owner' || profile.role === 'admin'

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header>
        <div className="text-xs text-muted-foreground">Workspace</div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Connect your own accounts. Your data flows directly between QuotePro and each service —
          we never touch your money or store credentials for you.
        </p>
      </header>

      {/* Payments */}
      <IntegrationCategory title="Payments" description="Get paid on invoices — bring your existing Stripe account.">
        <IntegrationShell
          logo={<CreditCard className="h-5 w-5" />}
          name="Stripe"
          badge={
            company.stripe_charges_enabled
              ? { label: 'Connected', tone: 'good' }
              : company.stripe_account_id
                ? { label: 'Setup needed', tone: 'warn' }
                : { label: 'Not connected', tone: 'neutral' }
          }
          tagline="0.8% capped at $5 for bank transfers, 2.9% + $0.30 for cards. No monthly fee."
        >
          <StripeConnect
            connected={Boolean(company.stripe_account_id)}
            chargesEnabled={Boolean(company.stripe_charges_enabled)}
            detailsSubmitted={Boolean(company.stripe_details_submitted)}
            passCardFees={Boolean(company.pass_card_fees)}
            canEdit={canEdit}
          />
        </IntegrationShell>
      </IntegrationCategory>

      {/* Accounting */}
      <IntegrationCategory title="Accounting" description="Sync paid invoices and payouts into your books.">
        <IntegrationShell
          logo={<FileText className="h-5 w-5" />}
          name="QuickBooks Online"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Auto-post each paid invoice as a sales receipt. Match Stripe payouts to deposits."
        >
          <ComingSoon feature="quickbooks" />
        </IntegrationShell>
        <IntegrationShell
          logo={<FileText className="h-5 w-5" />}
          name="Xero"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Same as QuickBooks — one-click sync of invoices, payments, and payouts."
        >
          <ComingSoon feature="xero" />
        </IntegrationShell>
      </IntegrationCategory>

      {/* Calendar & Comms */}
      <IntegrationCategory title="Calendar & communication" description="Two-way sync + SMS.">
        <IntegrationShell
          logo={<Calendar className="h-5 w-5" />}
          name="Google Calendar"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Scheduled jobs appear on your Google Calendar. Two-way sync so reschedules land in QuotePro."
        >
          <ComingSoon feature="google-calendar" />
        </IntegrationShell>
        <IntegrationShell
          logo={<MessageSquare className="h-5 w-5" />}
          name="Twilio SMS"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Text quote and appointment reminders from your own Twilio number."
        >
          <ComingSoon feature="twilio" />
        </IntegrationShell>
      </IntegrationCategory>

      {/* Ops */}
      <IntegrationCategory title="Automation & alerts" description="Pipe events to your stack.">
        <IntegrationShell
          logo={<Zap className="h-5 w-5" />}
          name="Zapier"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Trigger flows on new lead, quote sent, quote accepted, or invoice paid."
        >
          <ComingSoon feature="zapier" />
        </IntegrationShell>
        <IntegrationShell
          logo={<Slack className="h-5 w-5" />}
          name="Slack"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Post to a channel when a big quote is accepted or an invoice hits paid."
        >
          <ComingSoon feature="slack" />
        </IntegrationShell>
        <IntegrationShell
          logo={<Package className="h-5 w-5" />}
          name="Webhooks"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Raw HTTP POST for every workflow event. Bring your own endpoint."
        >
          <ComingSoon feature="webhooks" />
        </IntegrationShell>
      </IntegrationCategory>

      {/* AI ping */}
      <section className="my-10 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Want a custom integration?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Housecall Pro, ServiceTitan, Jobber, HubSpot, Salesforce — tell us your stack and we'll
              prioritize. Every integration launches with a one-click connect and a live status card here.
            </p>
            <Link
              href="mailto:hello@quotepro.demo?subject=Integration%20request"
              className="mt-3 inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              Request an integration <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

function IntegrationCategory({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
    </section>
  )
}

function IntegrationShell({
  logo,
  name,
  badge,
  tagline,
  children,
}: {
  logo: React.ReactNode
  name: string
  badge: { label: string; tone: 'good' | 'warn' | 'neutral' }
  tagline: string
  children: React.ReactNode
}) {
  const badgeCls =
    badge.tone === 'good'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : badge.tone === 'warn'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-muted text-muted-foreground'

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground/80">
            {logo}
          </div>
          <div>
            <div className="text-sm font-semibold">{name}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{tagline}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeCls}`}>
          {badge.label}
        </span>
      </header>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function ComingSoon({ feature }: { feature: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">
        In development —{' '}
        <a
          href={`mailto:hello@quotepro.demo?subject=Interested%20in%20${encodeURIComponent(feature)}`}
          className="text-primary hover:underline"
        >
          notify me
        </a>{' '}
        when it launches.
      </p>
    </div>
  )
}
