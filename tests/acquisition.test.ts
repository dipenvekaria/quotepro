import { describe, expect, it } from 'vitest'

import {
  ACQUISITION_SOURCES,
  ACQUISITION_VALUES,
  acquisitionSource,
  wantsDetail,
} from '@/lib/acquisition'

/**
 * The onboarding form renders this list, the server action validates against it
 * with a Zod enum built from the same array, and the follow-up box appears iff
 * `detailLabel` is set. Three consumers, one definition — these lock the shape
 * they all assume.
 */

describe('acquisition sources', () => {
  it('has unique values', () => {
    const values = ACQUISITION_SOURCES.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('every source is labelled', () => {
    for (const s of ACQUISITION_SOURCES) {
      expect(s.label.trim().length).toBeGreaterThan(0)
      expect(s.value).toMatch(/^[a-z_]+$/)
    }
  })

  it('ACQUISITION_VALUES tracks the list the form renders', () => {
    // The Zod enum is built from this. If it drifts, a source the contractor
    // can pick becomes one the action rejects — a signup that fails only for
    // people who answered the optional question.
    expect(ACQUISITION_VALUES).toEqual(ACQUISITION_SOURCES.map((s) => s.value))
  })

  it('fits the column', () => {
    // `acquisition_source text check (length <= 40)`.
    for (const s of ACQUISITION_SOURCES) expect(s.value.length).toBeLessThanOrEqual(40)
  })
})

describe('acquisitionSource', () => {
  it('resolves a known value', () => {
    expect(acquisitionSource('referral')?.label).toBe('Another contractor told me')
  })

  it.each([null, undefined, '', 'not_a_source'])('returns undefined for %o', (v) => {
    expect(acquisitionSource(v)).toBeUndefined()
  })
})

describe('wantsDetail', () => {
  it('is true only where a follow-up is defined', () => {
    for (const s of ACQUISITION_SOURCES) {
      expect(wantsDetail(s.value)).toBe(Boolean(s.detailLabel))
    }
  })

  it('asks who to thank for a referral', () => {
    expect(wantsDetail('referral')).toBe(true)
    expect(acquisitionSource('referral')?.detailLabel).toBe('Who should we thank?')
  })

  it('does not ask for detail on a bare search hit', () => {
    expect(wantsDetail('search')).toBe(false)
  })

  it.each([null, undefined, '', 'not_a_source'])('is false for %o', (v) => {
    // The action reads this to decide whether to keep a typed detail. An
    // unknown source must not carry text through to the column.
    expect(wantsDetail(v)).toBe(false)
  })
})
