import { query } from '@/lib/db'

/**
 * The getting-started facts, shared by the dashboard card and Settings.
 * Dismissal is a company-level settings flag; the steps stay visible in
 * Settings forever so dismissing the card loses nothing.
 */

export type GettingStartedStep = { done: boolean; label: string; href: string }

export async function gettingStartedSteps(companyId: string): Promise<{
  steps: GettingStartedStep[]
  remaining: number
  dismissed: boolean
}> {
  const [[co], [sent]] = await Promise.all([
    query<{
      stripe_charges_enabled: boolean | null
      logo_url: string | null
      settings: {
        review_link_google?: string | null
        review_link_facebook?: string | null
        getting_started_dismissed?: boolean
      } | null
    }>(
      `select stripe_charges_enabled, logo_url, settings from companies where id = $1 limit 1`,
      [companyId],
    ),
    query<{ n: number }>(
      `select count(*)::int as n from work_items where company_id = $1 and sent_at is not null limit 1`,
      [companyId],
    ),
  ])

  const steps: GettingStartedStep[] = [
    { done: true, label: 'Price book ready', href: '/app/catalog' },
    { done: (sent?.n ?? 0) > 0, label: 'Send your first quote', href: '/app/quotes/new' },
    { done: Boolean(co?.stripe_charges_enabled), label: 'Connect Stripe to take card payments', href: '/app/integrations' },
    { done: Boolean(co?.logo_url), label: 'Upload your logo — it fronts every email', href: '/app/settings' },
    {
      done: Boolean(co?.settings?.review_link_google || co?.settings?.review_link_facebook),
      label: 'Add your review links',
      href: '/app/settings',
    },
  ]
  return {
    steps,
    remaining: steps.filter((s) => !s.done).length,
    dismissed: Boolean(co?.settings?.getting_started_dismissed),
  }
}
