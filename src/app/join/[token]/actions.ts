'use server'

import { z } from 'zod'

import { query } from '@/lib/db'

const tokenSchema = z.object({ token: z.string().min(16).max(128) })

export type InviteContext = {
  email: string
  company: string | null
  role: string
}

/**
 * Who an invitation is addressed to, resolved from its token.
 *
 * The sign-in page needs the invited address so it can fill it in and stop the
 * invitee typing a different one — an account created under the wrong email
 * cannot accept, and they only find that out after they have made it.
 *
 * Resolved from the token rather than carried in the URL on purpose. Putting
 * the address in a query string writes it into server logs, browser history and
 * any Referer header the page leaks, which is a poor trade for a value the
 * server can look up. The token is already in the URL, and whoever holds it was
 * sent the email anyway.
 *
 * Unauthenticated by necessity — the whole point is that nobody has an account
 * yet. The 128-bit token is the credential, and this returns nothing at all for
 * one that is used, expired or wrong.
 */
export async function inviteContext(input: { token: string }): Promise<InviteContext | null> {
  const parsed = tokenSchema.safeParse(input)
  if (!parsed.success) return null

  const [row] = await query<InviteContext>(
    `select i.email, i.role, c.name as company
       from invitations i
       left join companies c on c.id = i.company_id
      where i.token = $1
        and i.status = 'pending'
        and i.expires_at > now()
      limit 1`,
    [parsed.data.token],
  )

  return row ?? null
}
