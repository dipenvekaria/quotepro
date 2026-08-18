import { searchCatalog } from '@/lib/ai/catalog-index'
import { query } from '@/lib/db'

/**
 * "Goes with this job" — the replacement for good/better/best.
 *
 * The dropped three-options feature asked the customer to pick a bundle size.
 * This asks nothing: as lines land on a quote, suggest the items that
 * historically accompany them — the company's own quoting habits, the way a
 * cart suggests what others added. One tap adds the line; ignoring it costs
 * nothing.
 *
 * Two sources, in trust order:
 *  1. Co-occurrence in this company's past quotes ("you quoted these together
 *     14 times") — real behaviour, no model.
 *  2. Catalog similarity via the existing search index, to top up when the
 *     history is thin (a new company has no habits yet).
 */

export type Recommendation = {
  id: string
  name: string
  base_price: number
  unit: string | null
  description: string | null
  /** How many past quotes paired this with the current lines; 0 = similarity. */
  together: number
}

export async function recommendCompanions(
  companyId: string,
  currentNames: string[],
  limit = 4,
): Promise<Recommendation[]> {
  const names = [...new Set(currentNames.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  if (names.length === 0) return []

  const out = new Map<string, Recommendation>()

  const history = await query<Recommendation>(
    `select ci.id, ci.name, ci.base_price, ci.unit, ci.description,
            count(distinct companion.work_item_id)::int as together
       from quote_items companion
       join work_items w on w.id = companion.work_item_id and w.company_id = $1
       join catalog_items ci
         on lower(ci.name) = lower(companion.name)
        and ci.company_id = $1 and ci.is_active
      where companion.work_item_id in (
              select qi.work_item_id
                from quote_items qi
                join work_items wi on wi.id = qi.work_item_id and wi.company_id = $1
               where lower(qi.name) = any($2)
            )
        and lower(companion.name) <> all($2)
        and not companion.is_discount
      group by ci.id, ci.name, ci.base_price, ci.unit, ci.description
      order by together desc, ci.name asc
      limit $3`,
    [companyId, names, limit],
  )
  for (const r of history) out.set(r.id, { ...r, base_price: Number(r.base_price) })

  if (out.size < limit) {
    // Similarity top-up through the same index the AI grounds on. Wrong here
    // is cheap — a suggestion the contractor ignores — so the search threshold
    // does not need to be strict.
    const similar = await searchCatalog(companyId, names.join(', '), limit * 3)
    for (const s of similar) {
      if (out.size >= limit) break
      if (out.has(s.id)) continue
      if (names.includes(s.name.trim().toLowerCase())) continue
      out.set(s.id, {
        id: s.id,
        name: s.name,
        base_price: Number(s.base_price),
        unit: s.unit,
        description: s.description,
        together: 0,
      })
    }
  }

  return [...out.values()].slice(0, limit)
}
