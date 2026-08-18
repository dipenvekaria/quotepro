import { describe, expect, it } from 'vitest'

import { formatQuantity, lineHours, unitSuffix } from '@/lib/format'

/**
 * The defect this pins: a 3-ton condenser at 8.75h labour booked 26.25 hours
 * (one afternoon's install shown as three working days), and the customer
 * read "3 × $1,650.00" as three air conditioners. Quantity counts repetitions
 * for counting units and describes size for measure units.
 */

describe('lineHours', () => {
  it('counting units multiply — six hours of labour is six hours', () => {
    expect(lineHours(1, 6, 'hour')).toBe(6)
    expect(lineHours(2.5, 2, 'each')).toBe(5)
    expect(lineHours(1.5, 2, 'visit')).toBe(3)
  })

  it('size units do not — a 3-ton condenser is one install', () => {
    expect(lineHours(8.75, 3, 'ton')).toBe(8.75)
    expect(lineHours(0.05, 2400, 'sq ft')).toBe(0.05)
    expect(lineHours(4, 120, 'linear ft')).toBe(4)
  })

  it('legacy lines with no unit keep the old behaviour', () => {
    expect(lineHours(2, 3, null)).toBe(6)
    expect(lineHours(2, 3, undefined)).toBe(6)
  })

  it('no hours means no answer, not zero', () => {
    expect(lineHours(null, 3, 'ton')).toBeNull()
    expect(lineHours(undefined, 3, 'each')).toBeNull()
  })
})

describe('formatQuantity / unitSuffix', () => {
  it('each and unknown render as a bare count, as before', () => {
    expect(formatQuantity(3, 'each')).toBe('3')
    expect(formatQuantity(3, null)).toBe('3')
    expect(unitSuffix('each')).toBe('')
    expect(unitSuffix(null)).toBe('')
  })

  it('measure units name themselves — three tons is not three condensers', () => {
    expect(formatQuantity(3, 'ton')).toBe('3 tons')
    expect(formatQuantity(1, 'ton')).toBe('1 ton')
    expect(formatQuantity(2400, 'sq ft')).toBe('2,400 sq ft')
    expect(formatQuantity(6, 'hour')).toBe('6 hours')
    expect(unitSuffix('ton')).toBe('/ton')
  })
})
