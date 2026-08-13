/**
 * Per-trade starter catalogs.
 *
 * A new account cannot generate a quote until it has catalog items, and typing
 * in a price book by hand is where contractors abandon setup on every tool in
 * this category (docs/PRODUCT_REVIEW.md §1).
 *
 * The files in `data/starter-catalogs/` carry a pricing *model*, not prices:
 * `labor_hours` and `material_cost` per item. Task times are stable across
 * regions; labor rates vary two to three times between markets, so the
 * contractor gives us their rate and we compute every price from it. We never
 * invent a price — see docs/STRATEGY.md §Lever 2.
 *
 * These files are read from disk, so they reach production through
 * `outputFileTracingIncludes` in next.config.ts, scoped to the onboarding route.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mapHeaders, parseCsv, parsePrice } from '@/lib/csv'
import { roundMoney } from '@/lib/money'

const DIR = join(process.cwd(), 'data', 'starter-catalogs')

export type Trade = { name: string; category: string; slug: string }

export type StarterItem = {
  name: string
  description: string | null
  category: string | null
  unit: string
  base_price: number
  labor_hours: number
  material_cost: number
}

export type Rates = {
  /** What the contractor charges per technician hour. */
  laborRate: number
  /** Materials markup as a fraction — 0.5 is a 50% markup. */
  markup: number
  /** Advertised call-out fee, used verbatim for diagnostic items. */
  serviceCallFee: number
}

export function slugifyTrade(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

let _trades: Trade[] | null = null

/** The trades a contractor can pick at onboarding. Empty if the data is absent. */
export function listTrades(): Trade[] {
  if (_trades) return _trades
  try {
    const raw = JSON.parse(readFileSync(join(DIR, '_trades.json'), 'utf8')) as {
      name: string
      category: string
    }[]
    _trades = raw
      .filter((t) => t?.name)
      .map((t) => ({ name: t.name, category: t.category ?? 'Specialty', slug: slugifyTrade(t.name) }))
  } catch {
    // No starter data in the bundle. Onboarding still works; the contractor
    // just starts from the minimal catalog instead of a trade one.
    _trades = []
  }
  return _trades
}

/**
 * A contractor's advertised call-out fee is a number they know and have already
 * decided on, so it is used verbatim rather than derived from hours.
 *
 * Only the plain version. A catalog typically carries several variants, and
 * "Emergency After-Hours Service Call" is deliberately dearer than the standard
 * one — pinning every match to the same fee erased that premium, which is
 * margin the contractor charges on purpose.
 */
const PREMIUM_VARIANT = /\b(emergency|after[- ]?hours?|weekend|holiday|overtime|24[/-]?7|night)\b/i

function isStandardCallOut(name: string): boolean {
  if (PREMIUM_VARIANT.test(name)) return false
  return /\b(diagnostic|service call|call[- ]?out|trip charge)\b/i.test(name)
}

/** price = labor_hours x rate + material_cost x (1 + markup) */
export function priceItem(item: Pick<StarterItem, 'name' | 'labor_hours' | 'material_cost'>, rates: Rates): number {
  if (isStandardCallOut(item.name) && rates.serviceCallFee > 0) return roundMoney(rates.serviceCallFee)
  const price = item.labor_hours * rates.laborRate + item.material_cost * (1 + rates.markup)
  // Never zero: a $0 line item quotes work as free.
  return roundMoney(Math.max(price, 1))
}

/**
 * Reads one trade's catalog and prices it at the contractor's rates. Returns an
 * empty array when the trade is unknown, so a bad slug degrades to the minimal
 * catalog rather than failing signup.
 */
export function loadStarterCatalog(slug: string, rates: Rates): StarterItem[] {
  let text: string
  try {
    text = readFileSync(join(DIR, `${slug}.csv`), 'utf8')
  } catch {
    return []
  }

  const table = parseCsv(text)
  if (table.length < 2) return []

  const cols = mapHeaders(table[0])
  if (cols.name === undefined) return []

  // labor_hours / material_cost are ours, not part of the contractor-facing
  // import aliases, so they are located by exact header name.
  const header = table[0].map((h) => h.trim().toLowerCase())
  const hoursAt = header.indexOf('labor_hours')
  const materialAt = header.indexOf('material_cost')

  const items: StarterItem[] = []

  for (const row of table.slice(1)) {
    const name = (row[cols.name] ?? '').trim()
    if (!name) continue

    const labor_hours = hoursAt === -1 ? 0 : Number(row[hoursAt]) || 0
    const material_cost = materialAt === -1 ? 0 : Number(row[materialAt]) || 0

    // Without a pricing model there is nothing to recompute, so fall back to
    // the file's own price rather than dropping a real item.
    const fallback = cols.base_price === undefined ? null : parsePrice(row[cols.base_price] ?? '')
    const base_price =
      labor_hours > 0 || material_cost > 0
        ? priceItem({ name, labor_hours, material_cost }, rates)
        : roundMoney(Math.max(fallback ?? 0, 1))

    items.push({
      name,
      description: cols.description !== undefined ? (row[cols.description] ?? '').trim() || null : null,
      category: cols.category !== undefined ? (row[cols.category] ?? '').trim() || null : null,
      unit: (cols.unit !== undefined ? (row[cols.unit] ?? '').trim() : '') || 'each',
      base_price,
      labor_hours,
      material_cost,
    })
  }

  return items
}
