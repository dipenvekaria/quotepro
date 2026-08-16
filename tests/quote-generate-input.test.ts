import { describe, expect, it } from 'vitest'
import { z } from 'zod'

/**
 * `.optional()` accepts `undefined` and rejects `null`.
 *
 * Every caller that reads a customer out of Postgres has `null`, because that is
 * what an empty column is. Drafting from the pipeline passed
 * `customer_address: null` and the contractor editing an existing quote got
 * "invalid input, expected string got null" — while the new-quote editor, which
 * happened to write `|| undefined`, happened to work.
 *
 * This pins the distinction rather than the one call site. The schema is
 * duplicated here because it is module-private; if it is ever exported, import
 * it and delete the copy.
 */
const generateSchema = z.object({
  description: z.string().min(3).max(4000),
  customer_name: z.string().max(200).nullish(),
  customer_address: z.string().max(500).nullish(),
})

describe('quote generation input', () => {
  it('accepts null for customer fields — which is what a database row holds', () => {
    const r = generateSchema.safeParse({
      description: 'Replace the thermostat',
      customer_name: null,
      customer_address: null,
    })
    expect(r.success).toBe(true)
  })

  it.each([
    ['undefined', undefined],
    ['a string', 'Sarah Johnson'],
    ['an empty string', ''],
  ])('still accepts %s', (_label, value) => {
    const r = generateSchema.safeParse({
      description: 'Replace the thermostat',
      customer_name: value,
      customer_address: value,
    })
    expect(r.success).toBe(true)
  })

  it('would have failed before the fix', () => {
    // The exact shape that broke, against the old contract.
    const old = z.object({ customer_address: z.string().max(500).optional() })
    expect(old.safeParse({ customer_address: null }).success).toBe(false)
    expect(generateSchema.safeParse({
      description: 'Replace the thermostat',
      customer_address: null,
    }).success).toBe(true)
  })

  it('still rejects a description that is missing or too short', () => {
    expect(generateSchema.safeParse({ customer_name: null }).success).toBe(false)
    expect(generateSchema.safeParse({ description: 'x' }).success).toBe(false)
  })
})
