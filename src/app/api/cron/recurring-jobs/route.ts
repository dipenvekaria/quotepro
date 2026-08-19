import { NextResponse } from 'next/server'

import { envServer } from '@/lib/env'
import { runRecurringSpawns } from '@/lib/recurring'

export const maxDuration = 300

/**
 * Daily spawn of due recurring visits. Same shape as the other crons:
 * refuse-closed without the secret, enumerate work inside the lib.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = envServer()

  if (!CRON_SECRET) {
    console.error('cron/recurring-jobs: CRON_SECRET is not set; refusing to run')
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const spawned = await runRecurringSpawns()
  console.log(`cron/recurring-jobs: spawned ${spawned.length} visit(s)`)
  return NextResponse.json({ spawned })
}
