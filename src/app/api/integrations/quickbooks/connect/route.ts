import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

import { getSession } from '@/lib/auth/session'
import { qboAuthorizeUrl, qboConfigured } from '@/lib/quickbooks/client'

/**
 * Kick off the Intuit OAuth dance. The state nonce rides an httpOnly cookie
 * and comes back in the callback — a forged callback with someone else's code
 * fails the compare and writes nothing.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))
  if (session.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners and admins connect integrations' }, { status: 403 })
  }
  if (!qboConfigured()) {
    return NextResponse.json({ error: 'QuickBooks is not configured on this server' }, { status: 503 })
  }

  const state = randomBytes(16).toString('hex')
  const jar = await cookies()
  jar.set('qbo_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/integrations/quickbooks',
  })
  return NextResponse.redirect(qboAuthorizeUrl(state))
}
