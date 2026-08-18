import { beforeAll, describe, expect, it } from 'vitest'

import { NoCatalogError, VagueJobError, generateTieredQuote } from '@/lib/ai/tiers'

import { requireDatabase } from './setup'

/**
 * The tiers generator must refuse a non-description before the model sees it.
 *
 * The single-quote path can ask a clarifying question; this path's schema is
 * three tiers of line items and nothing else, and given that shape the model
 * fills it — fed the literal placeholder "Quote" it invented a complete,
 * catalog-priced three-option job on a real production quote. The prompt rule
 * against it was ignored, so the gate is code, and this test is what keeps it
 * from being quietly removed.
 */

beforeAll(async () => {
  await requireDatabase()
})

// A company id that exists nowhere. If the gate works, these calls throw
// before any query or model call, so the id never matters.
const NOBODY = '00000000-0000-0000-0000-000000000000'

describe('placeholders are refused before any model call', () => {
  it.each(['Quote', 'quote', 'estimate', 'fix', 'job', 'Quote please', 'need a quote', 'a', ''])(
    'refuses %j',
    async (description) => {
      await expect(
        generateTieredQuote({ companyId: NOBODY, description, taxRate: 8.5 }),
      ).rejects.toBeInstanceOf(VagueJobError)
    },
  )
})

describe('a real description gets past the gate', () => {
  it('reaches the catalog fetch (NoCatalogError for a nonexistent company)', async () => {
    // Throwing NoCatalogError proves the vague gate let it through and the
    // next step ran — without ever touching a model.
    await expect(
      generateTieredQuote({
        companyId: NOBODY,
        description: 'Replace the condenser fan motor and run capacitor',
        taxRate: 8.5,
      }),
    ).rejects.toBeInstanceOf(NoCatalogError)
  })
})
