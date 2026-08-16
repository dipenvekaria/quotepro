import { describe, expect, it } from 'vitest'

import { catalogItemText, EMBEDDING_DIMS, toVectorLiteral } from '@/lib/ai/embeddings'

describe('catalogItemText', () => {
  it('joins name, category and description', () => {
    expect(
      catalogItemText({ name: 'Thermostat — Nest', category: 'HVAC', description: 'Wi-Fi enabled' }),
    ).toBe('Thermostat — Nest — HVAC — Wi-Fi enabled')
  })

  it('drops missing parts rather than leaving empty separators', () => {
    expect(catalogItemText({ name: 'Trip Fee' })).toBe('Trip Fee')
    expect(catalogItemText({ name: 'Trip Fee', description: null, category: null })).toBe('Trip Fee')
  })

  it('includes the category, which is how contractors often search', () => {
    // "electrical" must find items whose names never say it.
    expect(catalogItemText({ name: 'Breaker swap', category: 'Electrical' })).toContain('Electrical')
  })
})

describe('toVectorLiteral', () => {
  it('produces pgvector literal form', () => {
    expect(toVectorLiteral([0.1, -0.2, 0])).toBe('[0.1,-0.2,0]')
  })

  it('round-trips the declared dimension', () => {
    // The column is vector(768); a mismatch is rejected by Postgres at insert,
    // so the constant and the schema must agree.
    const v = Array.from({ length: EMBEDDING_DIMS }, (_, i) => i / 1000)
    expect(toVectorLiteral(v).split(',')).toHaveLength(768)
  })
})
