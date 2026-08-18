import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Every AI generation on a quote must leave a journey record.
 *
 * The good/better/best path (`generateQuoteTiers`) once generated quotes and
 * logged nothing, so "what did the AI do on this quote, and what did it cost"
 * was answerable for the single-line path and blind for the tiers path — the
 * exact gap found on a real production quote whose only logged event described
 * items that were not on it.
 *
 * This guards the class rather than the instance: every server action that
 * calls a model generator must also call `recordAiRun`. A fourth generation
 * path that forgets to log fails here instead of in production.
 */

const ACTIONS = 'src/app/app/(shell)/quotes/new/actions.ts'

// The generators that hit a model. Add a row when a new one lands — the point
// is that adding a generator without logging it is a visible, failing omission.
const GENERATORS = ['generateQuote(', 'generateTieredQuote(', 'runQuoteTurn(']

function bodyOf(src: string, exportName: string): string {
  const start = src.indexOf(`export async function ${exportName}`)
  if (start === -1) return ''
  const next = src.indexOf('\nexport async function ', start + 1)
  return src.slice(start, next === -1 ? undefined : next)
}

describe('AI generation is always logged', () => {
  const src = readFileSync(ACTIONS, 'utf8')

  // Find every exported action, then keep the ones that invoke a generator.
  const exportNames = [...src.matchAll(/export async function (\w+)/g)].map((m) => m[1])

  const generatingActions = exportNames.filter((name) => {
    const body = bodyOf(src, name)
    return GENERATORS.some((g) => body.includes(g))
  })

  it('finds the generating actions (not vacuously green)', () => {
    // generateQuoteItems, generateQuoteTiers, editQuoteWithAi at time of writing.
    expect(generatingActions.length).toBeGreaterThanOrEqual(3)
  })

  it.each(GENERATORS)('an action calling %s also records a run', (generator) => {
    const owning = generatingActions.filter((name) => bodyOf(src, name).includes(generator))
    for (const name of owning) {
      expect(
        bodyOf(src, name).includes('recordAiRun('),
        `${name} calls a model generator but never recordAiRun — its work leaves no journey record`,
      ).toBe(true)
    }
  })
})
