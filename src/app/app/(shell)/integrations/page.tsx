import { redirect } from 'next/navigation'
import {
  Calendar,
  CreditCard,
  Download,
  FileText,
  MessageSquare,
  Package,
  Slack,
  Sparkles,
  Zap,
} from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { StripeConnect } from '../settings/stripe-connect'
import { QuickbooksActions } from './quickbooks-card'

// ---------------------------------------------------------------------------

export default async function IntegrationsPage() {
  const { companyId, role } = await requireSession()

  const companyRows = await query<{
    stripe_account_id: string | null
    stripe_charges_enabled: boolean | null
    stripe_details_submitted: boolean | null
    pass_card_fees: boolean | null
  }>(
    `select stripe_account_id, stripe_charges_enabled, stripe_details_submitted, pass_card_fees
       from companies where id = $1 limit 1`,
    [companyId],
  )
  const company = companyRows[0]
  if (!company) redirect('/app/onboarding')
  const canEdit = role === 'owner' || role === 'admin'

  const [qbo] = await query<{
    realm_id: string
    connected_at: string
    last_synced_at: string | null
    last_error: string | null
  }>(
    `select realm_id, connected_at, last_synced_at, last_error
       from quickbooks_connections where company_id = $1 limit 1`,
    [companyId],
  )
  const qboConfigured = Boolean(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header>
        <div className="text-xs text-muted-foreground">Workspace</div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Connect your own accounts. Your data flows directly between Rivet and each service —
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
          badge={
            qbo
              ? qbo.last_error
                ? { label: 'Needs attention', tone: 'warn' }
                : { label: 'Connected', tone: 'good' }
              : { label: 'Not connected', tone: 'neutral' }
          }
          tagline="Bookkeeping only: invoices and recorded payments post to your books automatically. No money moves through this connection."
        >
          <div className="space-y-3">
            {qbo?.last_error && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                Last sync failed: {qbo.last_error}
              </p>
            )}
            {qbo && !qbo.last_error && (
              <p className="text-xs text-muted-foreground">
                {qbo.last_synced_at
                  ? `Last synced ${new Date(qbo.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
                  : 'Connected — the next invoice or payment will sync.'}
              </p>
            )}
            {qboConfigured ? (
              <QuickbooksActions connected={Boolean(qbo)} canEdit={canEdit} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Server not configured yet — set QBO_CLIENT_ID and QBO_CLIENT_SECRET.
              </p>
            )}
            <BookkeepingExports />
          </div>
        </IntegrationShell>
        <IntegrationShell
          logo={<FileText className="h-5 w-5" />}
          name="Xero"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Same as QuickBooks — one-click sync of invoices, payments, and payouts."
        >
          <ComingSoon />
        </IntegrationShell>
      </IntegrationCategory>

      {/* Calendar & Comms */}
      <IntegrationCategory title="Calendar & communication" description="Two-way sync + SMS.">
        <IntegrationShell
          logo={<Calendar className="h-5 w-5" />}
          name="Google Calendar"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Scheduled jobs appear on your Google Calendar. Two-way sync so reschedules land in Rivet."
        >
          <ComingSoon />
        </IntegrationShell>
        <IntegrationShell
          logo={<MessageSquare className="h-5 w-5" />}
          name="Twilio SMS"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Text quote and appointment reminders from your own Twilio number."
        >
          <ComingSoon />
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
          <ComingSoon />
        </IntegrationShell>
        <IntegrationShell
          logo={<Slack className="h-5 w-5" />}
          name="Slack"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Post to a channel when a big quote is accepted or an invoice hits paid."
        >
          <ComingSoon />
        </IntegrationShell>
        <IntegrationShell
          logo={<Package className="h-5 w-5" />}
          name="Webhooks"
          badge={{ label: 'Coming soon', tone: 'neutral' }}
          tagline="Raw HTTP POST for every workflow event. Bring your own endpoint."
        >
          <ComingSoon />
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
              Housecall Pro, ServiceTitan, Jobber, HubSpot, Salesforce — tell us your stack and we’ll
              prioritize. Every integration launches with a one-click connect and a live status card here.
            </p>
            {/*
              The "Request an integration" button pointed at
              hello@quotepro.demo, which does not resolve — the request went
              nowhere and the contractor had no way to know. Restore this as a
              real control once a support address exists (GTM business
              checklist §9.1); a button that silently discards the request is
              worse than the sentence alone.
            */}
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

/**
 * The bookkeeping exports, which already worked and which nothing linked to.
 *
 * `/api/export/[kind]` has been live, authenticated and permission-gated for a
 * while, and the only mention of QuickBooks on this page said "Coming soon" —
 * so a contractor had no way to reach a finished feature, and was told it did
 * not exist. Month-end re-keying is the actual QuickBooks complaint; this
 * answers it today, and a live sync can replace it later.
 */
function BookkeepingExports() {
  const kinds = [
    { kind: 'invoices', label: 'Invoices' },
    { kind: 'payments', label: 'Payments' },
    { kind: 'customers', label: 'Customers' },
  ]
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        CSV, ready to import. Owners and office staff only — this is your revenue by customer.
      </p>
      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {kinds.map((k) => (
          <a
            key={k.kind}
            href={`/api/export/${k.kind}`}
            download
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted lg:min-h-9"
          >
            <Download className="h-3.5 w-3.5" />
            {k.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function ComingSoon() {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center">
      {/*
        Was a "notify me" mailto to hello@quotepro.demo — a domain that does not
        exist, so the one interactive thing on this card opened a mail client
        addressed to nobody. No real support address is configured yet; saying
        less is better than offering a link that goes nowhere.
      */}
      <p className="text-xs text-muted-foreground">In development.</p>
    </div>
  )
}
