import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { env } from '@/lib/env'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'
import { exchangeCode } from '@/lib/quickbooks/client'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL('/login', env.NEXT_PUBLIC_APP_URL))
  if (session.role !== 'owner') {
    return NextResponse.redirect(new URL('/app/integrations?qbo=denied', env.NEXT_PUBLIC_APP_URL))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const realmId = url.searchParams.get('realmId')
  const state = url.searchParams.get('state')

  const jar = await cookies()
  const expected = jar.get('qbo_oauth_state')?.value
  jar.delete('qbo_oauth_state')

  if (!code || !realmId || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/app/integrations?qbo=error', env.NEXT_PUBLIC_APP_URL))
  }

  try {
    const t = await exchangeCode(code)
    await query(
      `insert into quickbooks_connections
         (company_id, realm_id, access_token, refresh_token, access_expires_at, connected_by, last_error)
       values ($1, $2, $3, $4, $5, $6, null)
       on conflict (company_id) do update
         set realm_id = excluded.realm_id,
             access_token = excluded.access_token,
             refresh_token = excluded.refresh_token,
             access_expires_at = excluded.access_expires_at,
             connected_by = excluded.connected_by,
             connected_at = now(),
             last_error = null`,
      [
        session.companyId,
        realmId,
        t.access_token,
        t.refresh_token,
        new Date(Date.now() + t.expires_in * 1000).toISOString(),
        session.userId,
      ],
    )
    return NextResponse.redirect(new URL('/app/integrations?qbo=connected', env.NEXT_PUBLIC_APP_URL))
  } catch (e) {
    console.error('qbo: oauth exchange failed', e)
    return NextResponse.redirect(new URL('/app/integrations?qbo=error', env.NEXT_PUBLIC_APP_URL))
  }
}
