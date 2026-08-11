/**
 * Money arithmetic for quotes and invoices.
 *
 * This was previously duplicated in three places — the save action, the quote
 * editor, and the work-item detail view — which agreed by coincidence rather
 * than by construction. A quote's numbers are the product; the customer sees
 * them and accepts a contract based on them, so they have exactly one
 * implementation.
 *
 * Two rules the database imposes, which this mirrors:
 *
 *  - `quote_items.total` is `GENERATED ALWAYS AS (quantity * unit_price) STORED`
 *    on `NUMERIC(14,2)`, so Postgres rounds every line to two decimals. Summing
 *    unrounded products in JS therefore drifts from what the database holds.
 *  - `work_items.{subtotal,tax_amount,total}` are `NUMERIC(12,2)`, written by
 *    the application. Values are rounded here so what the browser displays is
 *    what gets stored.
 */

export type LineItemAmount = {
  quantity: number
  unit_price: number
}

export type Totals = {
  subtotal: number
  /** Percentage, as stored — 8.5 means 8.5%, not 0.085. */
  taxRate: number
  taxAmount: number
  total: number
}

/**
 * Round to cents.
 *
 * The EPSILON nudge matters: `1.005 * 100` is `100.49999999999999` in binary
 * floating point, so a plain `Math.round` gives 1.00 where a person expects
 * 1.01.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** One line's extended amount, rounded the way the database rounds it. */
export function lineTotal(item: LineItemAmount): number {
  return roundMoney(item.quantity * item.unit_price)
}

/**
 * Subtotal, tax and total for a set of line items.
 *
 * All four values are computed together and rounded at each step, because a
 * partially-updated set leaves a quote whose numbers visibly do not add up.
 */
export function computeTotals(items: readonly LineItemAmount[], taxRate: number): Totals {
  const rate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0

  const subtotal = roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0))
  const taxAmount = roundMoney(subtotal * (rate / 100))
  const total = roundMoney(subtotal + taxAmount)

  return { subtotal, taxRate: rate, taxAmount, total }
}
