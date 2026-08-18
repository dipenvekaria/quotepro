import { describe, expect, it } from 'vitest'

import { mergeGrounding } from '@/lib/ai/quote'

/**
 * The model only quotes what it is shown. The grounding set used to be the
 * first eighty catalog rows alphabetically, which made everything from ~S
 * onward unquotable — a real 102-item catalog answered "smart thermostat"
 * with the Programmable one for days because the Smart Thermostat sat at
 * position 83. Search hits lead now; the alphabetical fill keeps the set no
 * narrower than it ever was.
 */

const item = (id: string) => ({ id, name: id })
const all = ['a', 'b', 'c', 'd', 'e', 'f'].map(item)

describe('mergeGrounding', () => {
  it('puts search hits first, fills alphabetically, dedupes', () => {
    const out = mergeGrounding([{ id: 'e' }, { id: 'b' }], all, 4)
    expect(out.map((i) => i.id)).toEqual(['e', 'b', 'a', 'c'])
  })

  it('caps at the budget even when hits alone exceed it', () => {
    const out = mergeGrounding(
      ['f', 'e', 'd', 'c', 'b'].map((id) => ({ id })),
      all,
      3,
    )
    expect(out.map((i) => i.id)).toEqual(['f', 'e', 'd'])
  })

  it('drops hits that are not in the fetched catalog rather than inventing them', () => {
    const out = mergeGrounding([{ id: 'ghost' }, { id: 'c' }], all, 3)
    expect(out.map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('an item past the old cutoff is present when search finds it', () => {
    // The regression this exists to prevent: 102 items, the relevant one at
    // position 83, budget 80 — previously unreachable.
    const big = Array.from({ length: 102 }, (_, i) =>
      item(`item-${String(i).padStart(3, '0')}`),
    )
    const wanted = big[82]
    const out = mergeGrounding([{ id: wanted.id }], big, 80)
    expect(out).toHaveLength(80)
    expect(out[0].id).toBe(wanted.id)
  })

  it('with no hits, behaves exactly like the old slice', () => {
    const out = mergeGrounding([], all, 3)
    expect(out.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})
