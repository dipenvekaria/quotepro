/**
 * Good/better/best quote options.
 *
 * Housecall Pro and Jobber both ship this and Jobber gates it at $120/month.
 * Adoption is low everywhere because building three options by hand is three
 * times the work — so the feature is not the differentiator, the absence of the
 * tedium is. See docs/FEATURE_STRATEGY_V1.md §2.1.
 *
 * Prices come from the catalog, never the model, via the same reconciliation
 * single-quote generation uses. A hallucinated price is a number the contractor
 * is contractually bound to once the customer accepts.
 */

import { Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
import { loadPrompt } from '@/lib/ai/prompts'
import { fetchCatalog, type AiLineItem, type CatalogItem } from '@/lib/ai/quote'
import { computeTotals } from '@/lib/money'

/**
 * The prompt and the model reason in these words — "good" is a poor label to
 * ask a model to build the smallest honest fix around, and it reads as faint
 * praise to a customer.
 */
export const TIERS = ['essential', 'recommended', 'complete'] as const
export type TierKey = (typeof TIERS)[number]

/**
 * `quote_options.tier` and `quote_items.option_tier` are constrained to
 * good/better/best, which is the industry's term for this. The key stays that;
 * the words a human reads live in `quote_options.name`.
 */
export const TIER_DB_KEY: Record<TierKey, 'good' | 'better' | 'best'> = {
  essential: 'good',
  recommended: 'better',
  complete: 'best',
}

export type QuoteTier = {
  tier: TierKey
  name: string
  description: string
  line_items: AiLineItem[]
  subtotal: number
  taxAmount: number
  total: number
  /** The middle tier, unless only one came back. */
  isRecommended: boolean
}

export type TieredQuote = {
  tiers: QuoteTier[]
  reasoning: string
  mode: string
  /** Token usage for the generation, so the run log can cost it. */
  usage?: { input: number; output: number }
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tiers: {
      type: Type.ARRAY,
      maxItems: '3',
      items: {
        type: Type.OBJECT,
        properties: {
          tier: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          line_items: {
            type: Type.ARRAY,
            maxItems: '12',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit_price: { type: Type.NUMBER },
              },
              required: ['name', 'quantity'],
            },
          },
        },
        required: ['tier', 'name', 'description', 'line_items'],
      },
    },
    reasoning: { type: Type.STRING },
  },
  required: ['tiers'],
}

const FALLBACK = `You are a senior trades estimator building three options for one job: Essential (the smallest honest fix), Recommended (Essential plus what a tradesperson would genuinely advise), and Complete (Recommended plus what makes the whole system right). Each tier must contain everything in the tier below it. Use ONLY items from CATALOG and copy their names exactly. Never invent an item to pad a tier. Return valid JSON only.`

function normalise(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}
function loosely(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Match returned items back to catalog rows and price them from the database.
 * Shares the rules of single-quote reconciliation: unmatched items are dropped
 * rather than quoted, and duplicates collapse rather than summing.
 */
function reconcileTier(
  raw: { name?: unknown; quantity?: unknown }[],
  catalog: CatalogItem[],
): { items: AiLineItem[]; dropped: string[] } {
  const byName = new Map(catalog.map((c) => [normalise(c.name), c]))
  const byLoose = new Map(catalog.map((c) => [loosely(c.name), c]))

  const items: AiLineItem[] = []
  const seen = new Set<string>()
  const dropped: string[] = []

  for (const li of raw) {
    const name = typeof li.name === 'string' ? li.name.trim() : ''
    if (!name) continue

    const match = byName.get(normalise(name)) ?? byLoose.get(loosely(name))
    if (!match) {
      dropped.push(name)
      continue
    }
    if (seen.has(match.id)) continue
    seen.add(match.id)

    const qty = Number(li.quantity)
    items.push({
      name: match.name,
      description: match.description,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unit_price: Number(match.base_price),
      is_upsell: false,
      is_discount: false,
    })
  }

  return { items, dropped }
}

export class NoCatalogError extends Error {
  constructor() {
    super('No active catalog items for company')
    this.name = 'NoCatalogError'
  }
}

export async function generateTieredQuote(input: {
  companyId: string
  description: string
  taxRate: number
}): Promise<TieredQuote | null> {
  const catalog = await fetchCatalog(input.companyId)
  if (catalog.length === 0) throw new NoCatalogError()
  if (!aiEnabled()) return null

  const catalogText = catalog
    .slice(0, 80)
    .map(
      (c) =>
        `- ${c.name} | ${c.category || 'General'} | $${c.base_price}/${c.unit || 'each'} | ${c.description || ''}`,
    )
    .join('\n')

  const result = await generateJson({
    system: loadPrompt('quote-tiers.md', FALLBACK),
    contents: `JOB DESCRIPTION:\n${input.description}\n\nCATALOG:\n${catalogText}\n`,
    schema: SCHEMA,
  })
  if (!result) return null

  const data = result.data as {
    tiers?: { tier?: unknown; name?: unknown; description?: unknown; line_items?: unknown }[]
    reasoning?: unknown
  }
  const rawTiers = Array.isArray(data.tiers) ? data.tiers : []

  const built: Omit<QuoteTier, 'isRecommended'>[] = []
  const allDropped: string[] = []

  for (const t of rawTiers) {
    const key = typeof t.tier === 'string' ? (t.tier.toLowerCase().trim() as TierKey) : null
    if (!key || !TIERS.includes(key)) continue
    if (built.some((b) => b.tier === key)) continue

    const raw = Array.isArray(t.line_items) ? (t.line_items as { name?: unknown }[]) : []
    const { items, dropped } = reconcileTier(raw, catalog)
    allDropped.push(...dropped)
    // A tier with nothing real in it is not an option, it is a blank column.
    if (items.length === 0) continue

    const totals = computeTotals(items, input.taxRate)
    built.push({
      tier: key,
      name: typeof t.name === 'string' && t.name.trim() ? t.name.trim() : key,
      description: typeof t.description === 'string' ? t.description.trim() : '',
      line_items: items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
    })
  }

  if (allDropped.length) {
    console.warn('ai/tiers: dropped items with no catalog match', allDropped)
  }
  if (built.length === 0) return null

  built.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))

  // Tiers that do not get more expensive as they go up are not tiers. Rather
  // than show a customer a "Complete" option that costs less than Essential,
  // treat the set as unusable and let the caller fall back to a single quote.
  for (let i = 1; i < built.length; i++) {
    if (built[i].total < built[i - 1].total) {
      console.warn('ai/tiers: tiers did not increase in price; discarding')
      return null
    }
  }

  // The middle one, which is the point of offering three — the customer is
  // choosing a level rather than answering yes or no. With two, the upper.
  const recommendedAt = built.length >= 3 ? 1 : built.length - 1

  return {
    tiers: built.map((t, i) => ({ ...t, isRecommended: i === recommendedAt })),
    reasoning: typeof data.reasoning === 'string' ? data.reasoning.trim() : '',
    mode: `gemini:${result.model}`,
    usage: result.usage,
  }
}
