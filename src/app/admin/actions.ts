'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { query } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/admin/guard'

const emailSchema = z.object({ email: z.string().email() })

async function audit(actor: string, action: string, target: string) {
  await query('insert into admin_audit (actor_email, action, target) values ($1, $2, $3)', [
    actor,
    action,
    target,
  ])
}

export async function addPlatformAdmin(input: z.infer<typeof emailSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Enter a valid email.' }

  await query(
    `insert into platform_admins (email, added_by) values (lower($1), $2)
     on conflict (email) do nothing`,
    [parsed.data.email, session.email],
  )
  await audit(session.email, 'admin_granted', parsed.data.email.toLowerCase())
  revalidatePath('/admin')
  return { ok: true as const }
}

export async function removePlatformAdmin(input: z.infer<typeof emailSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid email.' }

  // One statement, three guards: the founding (oldest) row is irremovable,
  // and the not-the-last-row check happens inside the same delete so two
  // concurrent removals cannot empty the list.
  const rows = await query<{ email: string }>(
    `delete from platform_admins
      where lower(email) = lower($1)
        and email <> (select email from platform_admins order by created_at asc limit 1)
        and (select count(*) from platform_admins) > 1
      returning email`,
    [parsed.data.email],
  )
  if (!rows.length) {
    return { ok: false as const, error: 'That admin cannot be removed.' }
  }
  await audit(session.email, 'admin_revoked', rows[0].email)
  revalidatePath('/admin')
  return { ok: true as const }
}


// ---------------------------------------------------------------------------
// Company management — the unpredictable-scenario levers. Every action is
// audited with the acting admin's email and the company id.

const trialSchema = z.object({ company_id: z.guid(), days: z.number().int().min(1).max(365) })

export async function extendCompanyTrial(input: z.infer<typeof trialSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = trialSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const [co] = await query<{
    id: string
    trial_ends_at: string | null
    stripe_subscription_id: string | null
    subscription_status: string | null
  }>(
    `select id, trial_ends_at, stripe_subscription_id, subscription_status
       from companies where id = $1 limit 1`,
    [parsed.data.company_id],
  )
  if (!co) return { ok: false as const, error: 'Company not found' }

  const base = co.trial_ends_at ? Math.max(Date.now(), new Date(co.trial_ends_at).getTime()) : Date.now()
  const newEnd = new Date(base + parsed.data.days * 86_400_000)

  // A live Stripe trial is the source of truth — push the date there and let
  // the webhook sync it back; the direct update just makes the UI immediate.
  if (co.stripe_subscription_id && co.subscription_status === 'trialing') {
    const { getStripe } = await import('@/lib/stripe/client')
    const stripe = getStripe()
    if (!stripe) return { ok: false as const, error: 'Stripe is not configured' }
    try {
      await stripe.subscriptions.update(co.stripe_subscription_id, {
        trial_end: Math.floor(newEnd.getTime() / 1000),
        proration_behavior: 'none',
      })
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Stripe rejected the change' }
    }
  }

  await query(`update companies set trial_ends_at = $2 where id = $1`, [co.id, newEnd.toISOString()])
  await audit(session.email, 'trial_extended', `company:${co.id} +${parsed.data.days}d → ${newEnd.toISOString().slice(0, 10)}`)
  revalidatePath(`/admin/companies/${co.id}`)
  return { ok: true as const, data: { trial_ends_at: newEnd.toISOString() } }
}

const compSchema = z.object({ company_id: z.guid(), complimentary: z.boolean() })

export async function setCompanyComplimentary(input: z.infer<typeof compSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = compSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const rows = await query<{ id: string }>(
    `update companies set complimentary = $2 where id = $1 returning id`,
    [parsed.data.company_id, parsed.data.complimentary],
  )
  if (!rows[0]) return { ok: false as const, error: 'Company not found' }
  await audit(
    session.email,
    parsed.data.complimentary ? 'comp_granted' : 'comp_revoked',
    `company:${parsed.data.company_id}`,
  )
  revalidatePath(`/admin/companies/${parsed.data.company_id}`)
  return { ok: true as const }
}

const notesSchema = z.object({ company_id: z.guid(), notes: z.string().max(4000) })

export async function saveCompanyNotes(input: z.infer<typeof notesSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = notesSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const rows = await query<{ id: string }>(
    `update companies set admin_notes = nullif($2, '') where id = $1 returning id`,
    [parsed.data.company_id, parsed.data.notes.trim()],
  )
  if (!rows[0]) return { ok: false as const, error: 'Company not found' }
  await audit(session.email, 'notes_updated', `company:${parsed.data.company_id}`)
  revalidatePath(`/admin/companies/${parsed.data.company_id}`)
  return { ok: true as const }
}
