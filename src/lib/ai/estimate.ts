import { query } from '@/lib/db'

import { searchCatalog } from './catalog-index'

/**
 * A price for something the price book does not carry.
 *
 * Deliberately **not** from a web search. A retail listing is not a
 * contractor's price: it carries no labour, no markup, no overhead and no local
 * cost, so quoting from one under-quotes systematically — and under-quoting is
 * the expensive direction, because the customer accepts it and the contractor
 * eats the difference. It would also throw away the one thing that makes the
 * price book worth having.
 *
 * The contractor's own catalog is a far better source. It already knows what
 * they charge for the nearest comparable thing, and their settings already
 * carry the labour rate and materials markup captured at onboarding. An
 * estimate built from those is wrong in the contractor's own units rather than
 * wrong in a stranger's.
 *
 * The result is a starting point for a person, never an answer. The salesperson
 * accepts it, changes it, or drops the line.
 */

export type Estimate = {
  price: number
  /** Plain-language basis, shown to the contractor so they can judge it. */
  basis: string
  /** The catalog row it was derived from, for the price-book nudge. */
  comparableId: string | null
}

type Rates = {
  labor_rate?: number
  materials_markup?: number
  service_call_fee?: number
}

/**
 * Estimate from the nearest comparable item the company already prices.
 *
 * Returns null when there is nothing close enough to reason from. A refusal is
 * a better answer than a number with no basis — the salesperson can still type
 * a price themselves, and at least knows the software did not invent one.
 */
export async function estimateFromCatalog(
  companyId: string,
  description: string,
): Promise<Estimate | null> {
  const [comparable] = await searchCatalog(companyId, description, 1)
  if (!comparable) return null

  const [company] = await query<{ settings: Rates | null }>(
    'select settings from companies where id = $1 limit 1',
    [companyId],
  )
  const rates = company?.settings ?? {}

  const comparablePrice = Number(comparable.base_price)
  if (!Number.isFinite(comparablePrice) || comparablePrice <= 0) return null

  /*
    The comparable's own price is the estimate.

    Not an average of the catalog, and not the comparable plus an invented
    premium for the brand being asked for. Both would be arithmetic dressed up
    as knowledge — nothing here knows whether the requested item is dearer or
    cheaper than the one it resembles. Saying "we charge this for the closest
    thing we do" is a claim that is actually true, and it is the number a
    contractor would start from themselves.
  */
  const price = Math.round(comparablePrice * 100) / 100

  const bits = [`your ${comparable.name} at $${comparablePrice.toFixed(2)}`]
  if (comparable.labor_hours) bits.push(`${comparable.labor_hours}h labour`)
  if (rates.materials_markup) bits.push(`${rates.materials_markup}% markup`)

  return {
    price,
    basis: `Estimated from ${bits.join(', ')}`,
    comparableId: comparable.id,
  }
}
