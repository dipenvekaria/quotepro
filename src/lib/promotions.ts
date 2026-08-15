/**
 * Contractor-applied promotions.
 *
 * "Fall promotion — service call is $9.99 instead of $59.99." The contractor
 * sets it up once against a label; every quote that includes a matching item is
 * priced accordingly, without them remembering to discount anything.
 *
 * Pure functions here, data access in the actions that call them, so the
 * arithmetic that decides what a customer is charged is testable on its own.
 */

import { roundMoney } from '@/lib/money'

export type DiscountType = 'percent' | 'amount' | 'fixed_price'

export type Promotion = {
  id: string
  name: string
  discountType: DiscountType
  discountValue: number
  startsAt: Date | null
  endsAt: Date | null
  isActive: boolean
  /** Catalog label ids this promotion covers. */
  labelIds: string[]
}

/** A promotion is live when it is active and `now` sits inside its window. */
export function isLive(p: Promotion, now: Date = new Date()): boolean {
  if (!p.isActive) return false
  if (p.startsAt && now < p.startsAt) return false
  if (p.endsAt && now > p.endsAt) return false
  return true
}

/**
 * The price after a promotion.
 *
 * Never below zero, and never above the list price — a "discount" that raises a
 * price is a misconfiguration, and the customer should not pay for it.
 */
export function discountedPrice(listPrice: number, p: Promotion): number {
  let next: number
  switch (p.discountType) {
    case 'percent':
      next = listPrice * (1 - p.discountValue / 100)
      break
    case 'amount':
      next = listPrice - p.discountValue
      break
    case 'fixed_price':
      next = p.discountValue
      break
  }
  return roundMoney(Math.min(Math.max(next, 0), listPrice))
}

export type PricedItem = {
  unitPrice: number
  /** Set only when a promotion applied, so the customer can see the saving. */
  listPrice: number | null
  promotionId: string | null
  promotionName: string | null
}

/**
 * Prices one catalog item against the live promotions.
 *
 * When several promotions cover the same item — a seasonal offer and a standing
 * one, say — the cheapest wins. Anything else means the contractor advertised a
 * price the software then declined to honour.
 */
export function priceWithPromotions(input: {
  listPrice: number
  labelIds: string[]
  promotions: Promotion[]
  now?: Date
}): PricedItem {
  const now = input.now ?? new Date()
  const labels = new Set(input.labelIds)

  let best: { price: number; promo: Promotion } | null = null

  for (const p of input.promotions) {
    if (!isLive(p, now)) continue
    // No targets means no coverage. A promotion that has not been pointed at
    // anything must not quietly discount the whole catalog.
    if (p.labelIds.length === 0) continue
    if (!p.labelIds.some((id) => labels.has(id))) continue

    const price = discountedPrice(input.listPrice, p)
    if (price >= input.listPrice) continue
    if (!best || price < best.price) best = { price, promo: p }
  }

  if (!best) {
    return {
      unitPrice: roundMoney(input.listPrice),
      listPrice: null,
      promotionId: null,
      promotionName: null,
    }
  }

  return {
    unitPrice: best.price,
    listPrice: roundMoney(input.listPrice),
    promotionId: best.promo.id,
    promotionName: best.promo.name,
  }
}

/** What the customer saved, for display. Zero when nothing applied. */
export function savingOn(item: { unitPrice: number; listPrice: number | null }, quantity = 1): number {
  if (item.listPrice === null) return 0
  return roundMoney((item.listPrice - item.unitPrice) * quantity)
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Live promotions for a company, with the labels they cover.
 *
 * Loaded once per quote save rather than per line: a quote with twelve lines
 * should not run twelve identical queries.
 */
export async function loadLivePromotions(companyId: string): Promise<Promotion[]> {
  const { query } = await import('@/lib/db')

  const rows = await query<{
    id: string
    name: string
    discount_type: DiscountType
    discount_value: number
    starts_at: string | null
    ends_at: string | null
    is_active: boolean
    label_ids: string[]
  }>(
    `select p.id, p.name, p.discount_type, p.discount_value,
            p.starts_at, p.ends_at, p.is_active,
            coalesce(
              (select array_agg(pl.label_id) from promotion_labels pl
                where pl.promotion_id = p.id),
              '{}'
            ) as label_ids
       from promotions p
      where p.company_id = $1
        and p.is_active = true
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at >= now())`,
    [companyId],
  )

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    startsAt: r.starts_at ? new Date(r.starts_at) : null,
    endsAt: r.ends_at ? new Date(r.ends_at) : null,
    isActive: r.is_active,
    labelIds: r.label_ids,
  }))
}

/** Label ids per catalog item name, for matching a quote line to a promotion. */
export async function loadItemLabels(companyId: string): Promise<Map<string, string[]>> {
  const { query } = await import('@/lib/db')

  const rows = await query<{ name: string; label_ids: string[] }>(
    `select ci.name,
            coalesce(
              (select array_agg(il.label_id) from catalog_item_labels il
                where il.catalog_item_id = ci.id),
              '{}'
            ) as label_ids
       from catalog_items ci
      where ci.company_id = $1`,
    [companyId],
  )

  // Keyed on the lowercased name because a quote line carries the name, not the
  // catalog id — the same basis reconcile() matches on.
  return new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.label_ids]))
}
