import { describe, expect, it } from 'vitest'

import { toStructured } from '@/lib/places/google'

/**
 * Google's component list, flattened.
 *
 * This mapping is where address autocomplete quietly goes wrong: it returns a
 * plausible-looking object for an address it got half right, and the damage
 * shows up later as a wrong sales-tax rate on a five-figure quote.
 */

const comp = (types: string[], longText: string, shortText = longText) => ({
  types,
  longText,
  shortText,
})

const SUBURBAN = [
  comp(['street_number'], '1600'),
  comp(['route'], 'Amphitheatre Parkway'),
  comp(['locality'], 'Mountain View'),
  comp(['administrative_area_level_1'], 'California', 'CA'),
  comp(['postal_code'], '94043'),
  comp(['country'], 'United States', 'US'),
]

describe('toStructured', () => {
  it('builds the street line from number and route', () => {
    expect(toStructured(SUBURBAN, '').address).toBe('1600 Amphitheatre Parkway')
  })

  it('uses the two-letter state code, not the full name', () => {
    // Sales-tax tables key on the code. "California" would miss every lookup.
    expect(toStructured(SUBURBAN, '').state).toBe('CA')
  })

  it('pulls city and zip', () => {
    const r = toStructured(SUBURBAN, '')
    expect(r.city).toBe('Mountain View')
    expect(r.zip).toBe('94043')
  })

  it('appends a unit number to the street line', () => {
    const r = toStructured([...SUBURBAN, comp(['subpremise'], '4B')], '')
    expect(r.address).toBe('1600 Amphitheatre Parkway #4B')
  })

  it('falls back to postal_town when there is no locality', () => {
    // Unincorporated areas have no locality, which would otherwise store a
    // blank city on a perfectly real address.
    const r = toStructured(
      [
        comp(['street_number'], '5'),
        comp(['route'], 'Long Lane'),
        comp(['postal_town'], 'Guildford'),
        comp(['administrative_area_level_1'], 'Surrey', 'SRY'),
      ],
      '',
    )
    expect(r.city).toBe('Guildford')
  })

  it('falls back to sublocality when there is neither', () => {
    const r = toStructured(
      [comp(['route'], 'Some Road'), comp(['sublocality'], 'Queens')],
      '',
    )
    expect(r.city).toBe('Queens')
  })

  it('uses the formatted address when there is no street number or route', () => {
    // Rural routes and PO boxes have neither, and an empty street line would
    // make the address useless.
    const r = toStructured(
      [comp(['locality'], 'Cody'), comp(['administrative_area_level_1'], 'Wyoming', 'WY')],
      'PO Box 44, Cody, WY 82414, USA',
    )
    expect(r.address).toBe('PO Box 44')
  })

  it('returns empty strings rather than undefined for missing parts', () => {
    // The columns are nullable but the callers pass these straight into SQL,
    // and `undefined` would become the string "undefined".
    const r = toStructured([], '')
    expect(r).toEqual({ address: '', city: '', state: '', zip: '' })
  })

  it('does not invent a city from the country', () => {
    const r = toStructured(
      [comp(['route'], 'Main St'), comp(['country'], 'United States', 'US')],
      '',
    )
    expect(r.city).toBe('')
    expect(r.state).toBe('')
  })
})
