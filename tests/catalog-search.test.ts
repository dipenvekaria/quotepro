import { describe, expect, it } from 'vitest'

import { matchesCatalogSearch, type SearchableItem } from '@/lib/catalog/search'

const item: SearchableItem = {
  name: 'Thermostat — Ecobee Smart',
  description: 'Wi-Fi enabled with room sensors',
  category: 'HVAC',
  labels: ['autumn-promo', 'Smart Home'],
}

describe('matchesCatalogSearch', () => {
  it('matches on name, case-insensitively', () => {
    expect(matchesCatalogSearch(item, 'ecobee')).toBe(true)
    expect(matchesCatalogSearch(item, 'ECOBEE')).toBe(true)
  })

  it('matches on description', () => {
    expect(matchesCatalogSearch(item, 'room sensors')).toBe(true)
  })

  it('matches on category', () => {
    // Someone hunting a thermostat may well type the category it lives in.
    expect(matchesCatalogSearch(item, 'hvac')).toBe(true)
  })

  it('matches on labels', () => {
    // Labels are how promotions group items, so searching the promotion name
    // should surface everything it applies to.
    expect(matchesCatalogSearch(item, 'autumn')).toBe(true)
    expect(matchesCatalogSearch(item, 'smart home')).toBe(true)
  })

  it('does not match unrelated terms', () => {
    expect(matchesCatalogSearch(item, 'breaker')).toBe(false)
  })

  it('treats an empty or whitespace term as no filter', () => {
    // The list must not empty itself while someone clears the box.
    expect(matchesCatalogSearch(item, '')).toBe(true)
    expect(matchesCatalogSearch(item, '   ')).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(matchesCatalogSearch(item, '  ecobee  ')).toBe(true)
  })

  it('survives missing optional fields', () => {
    // Items imported from CSV frequently have no description, category or
    // labels; a null must not throw halfway down a 500-item list.
    const bare: SearchableItem = { name: 'Trip Fee' }
    expect(matchesCatalogSearch(bare, 'trip')).toBe(true)
    expect(matchesCatalogSearch(bare, 'hvac')).toBe(false)
    expect(matchesCatalogSearch({ ...bare, category: null, description: null }, 'fee')).toBe(true)
  })
})
