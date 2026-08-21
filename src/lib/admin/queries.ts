import { query } from '@/lib/db'

/**
 * Platform-wide reads for the /admin console. Deliberately cross-tenant —
 * every caller sits behind requirePlatformAdmin(). Consolidated here so the
 * tenancy scanner exempts one file, not statements scattered through pages.
 */

export type PlatformHealth = {
  degradedAi24h: number
  qboErrorCount: number
  recurringOverdue: number
  lastRecurringSpawn: string | null
  waitlistCount: number
}

export async function platformHealth(): Promise<PlatformHealth> {
  const [row] = await query<{
    degraded_ai: string
    qbo_errors: string
    recurring_overdue: string
    last_spawn: string | null
    waitlist: string
  }>(
    `select
       (select count(*) from ai_conversations
         where status = 'degraded' and created_at > now() - interval '24 hours') as degraded_ai,
       (select count(*) from quickbooks_connections where last_error is not null) as qbo_errors,
       (select count(*) from work_items
         where recurrence is not null
           and (recurrence->>'next_at')::timestamptz < now() - interval '26 hours'
           and status <> 'archived') as recurring_overdue,
       (select max(created_at) from activity_log where action = 'recurring_job_spawned') as last_spawn,
       (select count(*) from waitlist) as waitlist`,
  )
  return {
    degradedAi24h: Number(row.degraded_ai),
    qboErrorCount: Number(row.qbo_errors),
    recurringOverdue: Number(row.recurring_overdue),
    lastRecurringSpawn: row.last_spawn,
    waitlistCount: Number(row.waitlist),
  }
}

export type CompanyRow = {
  id: string
  name: string
  created_at: string
  plan: string | null
  subscription_status: string | null
  owner_email: string | null
  work_items: number
  last_activity: string | null
  stripe_charges_enabled: boolean | null
  qbo_connected: boolean
}

export async function platformCompanies(): Promise<CompanyRow[]> {
  return await query<CompanyRow>(
    `select co.id, co.name, co.created_at, co.plan, co.subscription_status,
            co.stripe_charges_enabled,
            (select au.email from users u join auth.users au on au.id = u.id
              where u.company_id = co.id and u.role = 'owner' limit 1) as owner_email,
            (select count(*) from work_items w where w.company_id = co.id)::int as work_items,
            (select max(created_at) from activity_log a where a.company_id = co.id) as last_activity,
            exists(select 1 from quickbooks_connections q where q.company_id = co.id) as qbo_connected
       from companies co
      order by co.created_at desc
      limit 100`,
  )
}

export type DegradedRun = {
  created_at: string
  company_name: string | null
  purpose: string | null
  error: string | null
}

export async function recentDegradedAi(): Promise<DegradedRun[]> {
  return await query<DegradedRun>(
    `select a.created_at, co.name as company_name, a.purpose,
            left(coalesce(a.error_message, ''), 200) as error
       from ai_conversations a
       left join companies co on co.id = a.company_id
      where a.status = 'degraded'
      order by a.created_at desc
      limit 15`,
  )
}

export type QboIssue = {
  company_name: string
  last_error: string
  last_synced_at: string | null
}

export async function qboIssues(): Promise<QboIssue[]> {
  return await query<QboIssue>(
    `select co.name as company_name, q.last_error, q.last_synced_at
       from quickbooks_connections q
       join companies co on co.id = q.company_id
      where q.last_error is not null
      order by q.last_synced_at desc nulls last
      limit 15`,
  )
}

export type PaymentRow = {
  paid_at: string
  amount: number
  method: string
  reference_number: string | null
  company_name: string | null
  invoice_number: string | null
}

export async function recentPayments(): Promise<PaymentRow[]> {
  return await query<PaymentRow>(
    `select p.paid_at, p.amount, p.method, p.reference_number,
            co.name as company_name, i.invoice_number
       from payments p
       join invoices i on i.id = p.invoice_id
       join companies co on co.id = i.company_id
      order by p.paid_at desc
      limit 15`,
  )
}

export type PlatformBusiness = {
  mrrCents: number
  soloActive: number
  teamActive: number
  trialing: number
  canceled: number
  canceled30d: number
  companiesTotal: number
  companiesNew30d: number
  activeCompanies30d: number
  endCustomers: number
}

type BizRow = Record<string, string>

export async function platformBusiness(): Promise<PlatformBusiness> {
  const [row] = await query<BizRow>(
    `select
       (select coalesce(sum(case plan when 'solo' then 3900 when 'team' then 9900 else 0 end), 0)
          from companies where subscription_status = 'active') as mrr_cents,
       (select count(*) from companies where plan = 'solo' and subscription_status = 'active') as solo_active,
       (select count(*) from companies where plan = 'team' and subscription_status = 'active') as team_active,
       (select count(*) from companies where subscription_status = 'trialing') as trialing,
       (select count(*) from companies where subscription_status = 'canceled') as canceled,
       (select count(*) from companies
         where subscription_status = 'canceled' and updated_at > now() - interval '30 days') as canceled_30d,
       (select count(*) from companies) as companies_total,
       (select count(*) from companies where created_at > now() - interval '30 days') as companies_new_30d,
       (select count(distinct company_id) from activity_log
         where created_at > now() - interval '30 days') as active_companies_30d,
       (select count(*) from customers) as end_customers`,
  )
  return {
    mrrCents: Number(row.mrr_cents),
    soloActive: Number(row.solo_active),
    teamActive: Number(row.team_active),
    trialing: Number(row.trialing),
    canceled: Number(row.canceled),
    canceled30d: Number(row.canceled_30d),
    companiesTotal: Number(row.companies_total),
    companiesNew30d: Number(row.companies_new_30d),
    activeCompanies30d: Number(row.active_companies_30d),
    endCustomers: Number(row.end_customers),
  }
}

export type AdminRow = { email: string; added_by: string | null; created_at: string }

export async function platformAdmins(): Promise<AdminRow[]> {
  return await query<AdminRow>(
    'select email, added_by, created_at from platform_admins order by created_at asc',
  )
}
