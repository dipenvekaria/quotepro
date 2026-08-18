import { NextResponse } from 'next/server'

import { indexCatalog } from '@/lib/ai/catalog-index'
import { envServer } from '@/lib/env'
import { query } from '@/lib/db'

// Embedding ~100 items per company against Vertex takes seconds each; give the
// sweep room for dozens of tenants rather than the default function budget.
export const maxDuration = 300

/**
 * Nightly self-heal for the catalog search index.
 *
 * Per-edit reindexing runs in `after()` and swallows its failures, so an item
 * whose embedding write failed silently never became searchable — the AI then
 * reached for an estimate on a thing the contractor actually priced. Nothing
 * called the repair query (`indexCatalog` non-force embeds only missing or
 * stale rows) on any schedule; this is that schedule. A quiet night costs two
 * embedding calls per company that needs nothing.
 *
 * Multi-tenant by enumeration, like quote-followups: list company ids first,
 * then run the same company-scoped function everything else uses.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = envServer()

  if (!CRON_SECRET) {
    console.error('cron/reindex-catalogs: CRON_SECRET is not set; refusing to run')
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const companies = await query<{ id: string }>(
    `select distinct c.id
       from companies c
       join catalog_items ci on ci.company_id = c.id and ci.is_active
      order by c.id`,
  )

  let indexed = 0
  let failed = 0
  for (const { id } of companies) {
    try {
      const r = await indexCatalog(id)
      indexed += r.indexed
    } catch (e) {
      failed++
      console.error(`cron/reindex-catalogs: company ${id} failed`, e)
    }
  }

  console.warn(
    `cron/reindex-catalogs: ${companies.length} companies, ${indexed} embeddings written, ${failed} failed`,
  )
  return NextResponse.json({ companies: companies.length, indexed, failed })
}
