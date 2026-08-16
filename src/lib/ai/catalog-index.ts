import { query } from '@/lib/db'

import { catalogItemText, embedText, embedTexts, toVectorLiteral } from './embeddings'

/**
 * The company's price book, searchable.
 *
 * Quoting today hands the model the first 80 rows of a 200-row slice and hopes
 * the right item is among them. Whether it is depends on `order by name`, not on
 * what the customer asked for — so a contractor with a big, well-maintained
 * catalog gets *worse* results than one with eighty items, which is exactly
 * backwards for a product whose whole argument is that the price book is the
 * moat.
 *
 * Retrieval goes through `match_documents`, which already existed and had never
 * been called: hybrid vector + full-text with reciprocal rank fusion, and
 * `match_company_id` is a required argument, so tenancy is enforced *inside* the
 * search rather than remembered around it.
 */

const ENTITY_TYPE = 'catalog_item'

/**
 * How similar is similar enough. Measured, not guessed.
 *
 * `match_documents` defaults to 0.6, and against the demo catalog that silently
 * returned *nothing* for the two queries most like how a contractor actually
 * talks:
 *
 *   "furnace not heating"  → both furnaces at 0.559 and 0.540
 *   "wifi controls"        → both Wi-Fi thermostats at 0.495 and 0.493
 *   "thermostat"           → both thermostats at 0.664 and 0.624
 *
 * The ranking was right every time; the cutoff was throwing the answer away.
 * Cross-phrasing — a symptom against a product name — simply does not score
 * above 0.6.
 *
 * 0.3 is deliberately loose because of what this feeds: a model choosing from a
 * shortlist, not a final answer shown to anyone. Missing the furnace entirely is
 * fatal; including a humidifier the model then ignores costs a few tokens. Recall
 * over precision, and the RRF fusion still does the ordering.
 */
const VECTOR_THRESHOLD = 0.3

export type CatalogMatch = {
  id: string
  name: string
  description: string | null
  category: string | null
  unit: string | null
  base_price: number
  labor_hours: number | null
  score: number
}

/**
 * Index one item. Called on create and on edit.
 *
 * The write path owns this rather than a nightly job. An index that drifts from
 * the catalog is worse than no index — it answers confidently with last week's
 * prices, and nobody notices until a customer accepts one.
 */
export async function indexCatalogItem(companyId: string, itemId: string): Promise<boolean> {
  const [item] = await query<{
    id: string
    name: string
    description: string | null
    category: string | null
  }>(
    `select id, name, description, category
       from catalog_items where id = $1 and company_id = $2 limit 1`,
    [itemId, companyId],
  )
  if (!item) return false

  const content = catalogItemText(item)
  const vector = await embedText(content)
  if (!vector) return false

  await query(
    `insert into document_embeddings (company_id, entity_type, entity_id, content, embedding)
     values ($1, $2, $3, $4, $5::vector)
     on conflict (company_id, entity_type, entity_id)
       do update set content = excluded.content,
                     embedding = excluded.embedding,
                     updated_at = now()`,
    [companyId, ENTITY_TYPE, item.id, content, toVectorLiteral(vector)],
  )
  return true
}

/** Drop an item from the index. Called when a catalog item is deleted. */
export async function unindexCatalogItem(companyId: string, itemId: string): Promise<void> {
  await query(
    'delete from document_embeddings where company_id = $1 and entity_type = $2 and entity_id = $3',
    [companyId, ENTITY_TYPE, itemId],
  )
}

/**
 * Index everything not yet indexed, or everything that has changed.
 *
 * Returns how many were written. Used by the backfill script and after a CSV or
 * document import, where indexing item-by-item would mean one embedding call per
 * row instead of one per hundred.
 */
export async function indexCatalog(
  companyId: string,
  opts: { force?: boolean } = {},
): Promise<{ indexed: number; skipped: number }> {
  // Two literal statements rather than one with an interpolated join. The
  // conditional version was scoped correctly and the tenancy scanner still
  // flagged it, because it could not see the predicate through the template —
  // and a guard that has to be argued with is a guard on its way to being
  // switched off. Written out, both are checkable.
  type Row = { id: string; name: string; description: string | null; category: string | null }

  const rows = opts.force
    ? await query<Row>(
        `select ci.id, ci.name, ci.description, ci.category
           from catalog_items ci
          where ci.company_id = $1`,
        [companyId],
      )
    : await query<Row>(
        `select ci.id, ci.name, ci.description, ci.category
           from catalog_items ci
           left join document_embeddings de
             on de.entity_id = ci.id
            and de.entity_type = 'catalog_item'
            and de.company_id = ci.company_id
          where ci.company_id = $1
            and (de.id is null or de.updated_at < ci.updated_at)`,
        [companyId],
      )
  if (rows.length === 0) return { indexed: 0, skipped: 0 }

  const contents = rows.map(catalogItemText)
  const vectors = await embedTexts(contents)
  // All-or-nothing on purpose: a half-embedded catalog searches like a thin one
  // rather than a broken one, which is the failure nobody reports.
  if (!vectors) return { indexed: 0, skipped: rows.length }

  const values: unknown[] = []
  const tuples = rows.map((r, i) => {
    const b = i * 5
    values.push(companyId, ENTITY_TYPE, r.id, contents[i], toVectorLiteral(vectors[i]))
    return i === 0
      ? `($1::uuid, $2::text, $3::uuid, $4::text, $5::vector)`
      : `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`
  })

  await query(
    `insert into document_embeddings (company_id, entity_type, entity_id, content, embedding)
     values ${tuples.join(', ')}
     on conflict (company_id, entity_type, entity_id)
       do update set content = excluded.content,
                     embedding = excluded.embedding,
                     updated_at = now()`,
    values,
  )

  return { indexed: rows.length, skipped: 0 }
}

/**
 * The items worth showing the model for this request.
 *
 * Falls back to keyword-only when embedding is unavailable, because a search
 * that returns the trigram matches is still far better than the first eighty
 * rows in the table — and quoting must never stop working because Vertex is
 * having an afternoon.
 */
export async function searchCatalog(
  companyId: string,
  q: string,
  limit = 20,
): Promise<CatalogMatch[]> {
  const vector = await embedText(q)

  if (!vector) return keywordOnly(companyId, q, limit)

  const rows = await query<CatalogMatch>(
    // match_documents returns rrf_score — the fused rank, not either input
    // score. Ordering by the vector score alone would throw away the keyword
    // half that makes an exact part number findable.
    `select ci.id, ci.name, ci.description, ci.category, ci.unit,
            ci.base_price, ci.labor_hours, m.rrf_score as score
       from match_documents($1::vector, $2, $3, $4, $5, $6) m
       join catalog_items ci on ci.id = m.entity_id
      where ci.company_id = $3 and ci.is_active
      order by m.rrf_score desc`,
    [toVectorLiteral(vector), q, companyId, ENTITY_TYPE, limit, VECTOR_THRESHOLD],
  )
  // An empty index means nothing has been embedded yet; keyword still answers.
  return rows.length > 0 ? rows : keywordOnly(companyId, q, limit)
}

async function keywordOnly(companyId: string, q: string, limit: number): Promise<CatalogMatch[]> {
  const term = q.trim()
  if (!term) return []
  return query<CatalogMatch>(
    `select id, name, description, category, unit, base_price, labor_hours,
            similarity(name, $2) as score
       from catalog_items
      where company_id = $1 and is_active
        and (name ilike '%' || $2 || '%' or description ilike '%' || $2 || '%'
             or category ilike '%' || $2 || '%')
      order by score desc nulls last, name asc
      limit $3`,
    [companyId, term, limit],
  )
}
