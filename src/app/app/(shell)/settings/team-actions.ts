'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { query, withUser } from '@/lib/db'
import { env } from '@/lib/env'
import { sendTeamInviteEmail } from '@/lib/email/senders'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'office', 'sales', 'technician']),
})

function joinLink(token: string) {
  const base = (env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  return `${base}/join/${token}`
}

// Invite a teammate — owners + office only. Returns a shareable join link
// (best-effort email on top).
export async function inviteTeammate(input: { email: string; role: string }) {
  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'office') {
    return { ok: false as const, error: 'Only owners and office managers can invite teammates.' }
  }

  const email = parsed.data.email.trim().toLowerCase()

  let token: string
  try {
    const rows = await query<{ token: string }>(
      `insert into invitations (company_id, email, role, invited_by)
       values ($1, $2, $3::user_role, $4)
       returning token`,
      [session.companyId, email, parsed.data.role, session.userId],
    )
    token = rows[0]!.token
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed to create invite' }
  }

  const link = joinLink(token)

  // Best-effort email. Failures are surfaced rather than swallowed: the invite
  // used to report success while Resend had refused it outright.
  let emailed = false
  let emailError: string | null = null
  try {
    const [company] = await query<{ name: string }>('select name from companies where id = $1', [
      session.companyId,
    ])
    const inviter = session.profile as { first_name?: string; last_name?: string } | null
    const res = await sendTeamInviteEmail({
      to: email,
      companyName: company?.name ?? 'the team',
      inviterName:
        [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') || session.email || null,
      link,
    })
    emailed = res.ok && !('skipped' in res && res.skipped)
    if (!res.ok) emailError = res.error
    else if ('skipped' in res && res.skipped) emailError = res.reason
  } catch (e) {
    emailError = e instanceof Error ? e.message : 'Send failed'
  }

  revalidatePath('/app/settings')
  return { ok: true as const, data: { link, emailed, email, emailError } }
}

export async function revokeInvitation(id: string) {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'office') {
    return { ok: false as const, error: 'Not allowed' }
  }
  await query(
    `update invitations set status = 'revoked'
      where id = $1 and company_id = $2 and status = 'pending'`,
    [id, session.companyId],
  )
  revalidatePath('/app/settings')
  return { ok: true as const }
}

// Accept an invite for the signed-in user (who may not have a company yet, so
// we auth via Supabase directly rather than requireSession/getSession).
export async function acceptInvite(token: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Please sign in to accept the invitation.' }

  try {
    await withUser(user.id, async (q) => {
      await q('select accept_invitation($1)', [token])
    })
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not accept invitation' }
  }

  revalidatePath('/app')
  return { ok: true as const }
}
