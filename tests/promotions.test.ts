import { describe, expect, it } from 'vitest'

import {
  discountedPrice,
  isLive,
  priceWithPromotions,
  savingOn,
  type Promotion,
} from '../src/lib/promotions'

/**
 * Promotions decide what a customer is charged, so the cases that matter are
 * the ones that would overcharge, undercharge, or advertise a price the
 * software then declines to honour.
 */

const base: Promotion = {
  id: 'p1',
  name: 'Fall promotion',
  discountType: 'fixed_price',
  discountValue: 9.99,
  startsAt: null,
  endsAt: null,
  isActive: true,
  labelIds: ['diagnostics'],
}

const NOW = new Date('2026-10-01T12:00:00Z')

describe('discountedPrice', () => {
  it('replaces the price outright for fixed_price', () => {
    expect(discountedPrice(59.99, base)).toBe(9.99)
  })

  it('takes a percentage off', () => {
    expect(discountedPrice(200, { ...base, discountType: 'percent', discountValue: 25 })).toBe(150)
  })

  it('takes an amount off', () => {
    expect(discountedPrice(200, { ...base, discountType: 'amount', discountValue: 50 })).toBe(150)
  })

  it('never goes below zero', () => {
    expect(discountedPrice(40, { ...base, discountType: 'amount', discountValue: 100 })).toBe(0)
  })

  it('never raises a price', () => {
    // A fixed price above list is a misconfiguration; the customer must not pay for it.
    expect(discountedPrice(50, { ...base, discountType: 'fixed_price', discountValue: 80 })).toBe(50)
  })
})

describe('isLive', () => {
  it('is not live when inactive', () => {
    expect(isLive({ ...base, isActive: false }, NOW)).toBe(false)
  })

  it('is not live before it starts', () => {
    expect(isLive({ ...base, startsAt: new Date('2026-11-01') }, NOW)).toBe(false)
  })

  it('is not live after it ends', () => {
    expect(isLive({ ...base, endsAt: new Date('2026-09-01') }, NOW)).toBe(false)
  })

  it('is live inside the window', () => {
    expect(
      isLive({ ...base, startsAt: new Date('2026-09-01'), endsAt: new Date('2026-12-01') }, NOW),
    ).toBe(true)
  })

  it('is live with no window at all', () => {
    expect(isLive(base, NOW)).toBe(true)
  })
})

describe('priceWithPromotions', () => {
  const priced = (labelIds: string[], promotions: Promotion[], listPrice = 59.99) =>
    priceWithPromotions({ listPrice, labelIds, promotions, now: NOW })

  it('applies a promotion to a matching label', () => {
    const r = priced(['diagnostics'], [base])
    expect(r.unitPrice).toBe(9.99)
    expect(r.listPrice).toBe(59.99)
    expect(r.promotionName).toBe('Fall promotion')
  })

  it('leaves an unmatched item alone', () => {
    const r = priced(['plumbing'], [base])
    expect(r.unitPrice).toBe(59.99)
    expect(r.listPrice).toBeNull()
    expect(r.promotionId).toBeNull()
  })

  it('ignores a promotion with no labels rather than discounting everything', () => {
    const r = priced(['diagnostics'], [{ ...base, labelIds: [] }])
    expect(r.unitPrice).toBe(59.99)
    expect(r.promotionId).toBeNull()
  })

  it('ignores an expired promotion', () => {
    const r = priced(['diagnostics'], [{ ...base, endsAt: new Date('2026-09-01') }])
    expect(r.unitPrice).toBe(59.99)
  })

  it('picks the cheapest when several apply', () => {
    const r = priced(['diagnostics'], [
      base,
      { ...base, id: 'p2', name: 'Half price', discountType: 'percent', discountValue: 50 },
    ])
    // 9.99 beats 29.995 — the contractor advertised both, so honour the better.
    expect(r.unitPrice).toBe(9.99)
    expect(r.promotionId).toBe('p1')
  })

  it('matches when the item carries several labels and one is covered', () => {
    const r = priced(['call-out', 'diagnostics'], [base])
    expect(r.unitPrice).toBe(9.99)
  })
})

describe('savingOn', () => {
  it('is zero when nothing applied', () => {
    expect(savingOn({ unitPrice: 59.99, listPrice: null })).toBe(0)
  })

  it('multiplies by quantity', () => {
    expect(savingOn({ unitPrice: 9.99, listPrice: 59.99 }, 2)).toBe(100)
  })
})
