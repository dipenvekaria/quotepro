import { describe, expect, it } from 'vitest'

import { computeTotals, lineTotal, roundMoney } from '../src/lib/money'

/**
 * A quote's numbers are the product. The customer accepts a contract based on
 * them, and the contractor is bound by the result — so these are the cases that
 * cost money when they are wrong, not a coverage exercise.
 */
describe('roundMoney', () => {
  it('rounds to cents', () => {
    expect(roundMoney(1.234)).toBe(1.23)
    expect(roundMoney(1.236)).toBe(1.24)
  })

  it('rounds a half-cent up rather than down', () => {
    // 1.005 * 100 is 100.49999999999999 in binary floating point, so a plain
    // Math.round returns 1.00 here — a cent lost on every such line.
    expect(roundMoney(1.005)).toBe(1.01)
    expect(roundMoney(2.675)).toBe(2.68)
  })

  it('survives values that cannot be represented exactly', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })

  it('treats non-finite input as zero rather than propagating NaN', () => {
    expect(roundMoney(Number.NaN)).toBe(0)
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('lineTotal', () => {
  it('rounds each line the way the generated column does', () => {
    // quote_items.total is GENERATED ALWAYS AS (quantity * unit_price) on
    // NUMERIC(14,2), so a line is rounded before it reaches the subtotal.
    expect(lineTotal({ quantity: 3, unit_price: 19.99 })).toBe(59.97)
    expect(lineTotal({ quantity: 1.5, unit_price: 33.33 })).toBe(50.0)
  })
})

describe('computeTotals', () => {
  it('computes a straightforward quote', () => {
    const t = computeTotals(
      [
        { quantity: 2, unit_price: 125 }, // 250.00 labour
        { quantity: 1, unit_price: 890.5 }, // 890.50 equipment
      ],
      8.5,
    )
    expect(t.subtotal).toBe(1140.5)
    expect(t.taxAmount).toBe(96.94) // 1140.50 * 0.085 = 96.9425
    expect(t.total).toBe(1237.44)
  })

  it('treats tax_rate as a percentage, not a fraction', () => {
    // Reading 8.5 as 0.085x rather than 8.5% would overcharge by ~100x.
    const t = computeTotals([{ quantity: 1, unit_price: 100 }], 8.5)
    expect(t.taxAmount).toBe(8.5)
  })

  it('does not accumulate float error across many lines', () => {
    const items = Array.from({ length: 10 }, () => ({ quantity: 1, unit_price: 0.1 }))
    const t = computeTotals(items, 0)
    expect(t.subtotal).toBe(1) // naive summing gives 0.9999999999999999
    expect(t.total).toBe(1)
  })

  it('keeps subtotal + tax === total', () => {
    // The invariant a customer can check by eye. If these three drift apart the
    // quote looks wrong even when each number is individually defensible.
    for (const price of [0.01, 3.33, 19.99, 1234.56, 99999.99]) {
      const t = computeTotals([{ quantity: 3, unit_price: price }], 8.25)
      expect(roundMoney(t.subtotal + t.taxAmount)).toBe(t.total)
    }
  })

  it('handles an empty quote', () => {
    expect(computeTotals([], 8.5)).toEqual({
      subtotal: 0,
      taxRate: 8.5,
      taxAmount: 0,
      total: 0,
    })
  })

  it('handles a tax-exempt company', () => {
    const t = computeTotals([{ quantity: 1, unit_price: 500 }], 0)
    expect(t.taxAmount).toBe(0)
    expect(t.total).toBe(500)
  })

  it('coerces a nonsense tax rate to zero instead of producing NaN', () => {
    // Better a visibly untaxed quote than NaN written to a NUMERIC column.
    expect(computeTotals([{ quantity: 1, unit_price: 100 }], Number.NaN).total).toBe(100)
    expect(computeTotals([{ quantity: 1, unit_price: 100 }], -5).taxAmount).toBe(0)
  })

  it('supports fractional quantities, which trades bill in', () => {
    // 2.5 hours of labour at $125/hr.
    const t = computeTotals([{ quantity: 2.5, unit_price: 125 }], 0)
    expect(t.subtotal).toBe(312.5)
  })

  it('handles a discount line without going negative on tax', () => {
    const t = computeTotals(
      [
        { quantity: 1, unit_price: 1000 },
        { quantity: 1, unit_price: -100 }, // discount
      ],
      10,
    )
    expect(t.subtotal).toBe(900)
    expect(t.taxAmount).toBe(90)
    expect(t.total).toBe(990)
  })
})
