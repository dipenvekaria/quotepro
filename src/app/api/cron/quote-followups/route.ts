import { NextResponse } from 'next/server'

import { envServer } from '@/lib/env'
import { companiesWithDueFollowUps, sendQuoteFollowUps } from '@/features/quotes/followups'

/**
 * Nightly sweep that chases unaccepted quotes.
 *
 * This is the one place in the app that touches several tenants in a single
 * request, because there is no session to scope it by. It stays safe by
 * enumerating company ids first and then calling the same company-scoped
 * function a signed-in user would — never by running an unscoped update.
 *
 * Scheduled from vercel.json. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = envServer()

  // Without a secret this endpoint would let anyone on the internet make every
  // contractor's customers receive email. Refuse rather than run open.
  if (!CRON_SECRET) {
    console.error('cron/quote-followups: CRON_SECRET is not set; refusing to run')
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const companies = await companiesWithDueFollowUps()

  let sent = 0
  let failed = 0
  for (const companyId of companies) {
    try {
      const r = await sendQuoteFollowUps(companyId)
      sent += r.sent
      failed += r.failed
    } catch (e) {
      failed++
      console.error(`cron/quote-followups: company ${companyId} failed`, e)
    }
  }

  console.warn(
    `cron/quote-followups: ${companies.length} companies, ${sent} sent, ${failed} failed`,
  )
  return NextResponse.json({ companies: companies.length, sent, failed })
}
