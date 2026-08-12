/**
 * Plain-language quote summary for the homeowner.
 *
 * Prices are deliberately not sent to the model. They are rendered directly
 * beneath this text, and a model that cannot see them cannot contradict them —
 * which matters when the number is the thing being agreed to.
 */

import { Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
import { loadPrompt } from '@/lib/ai/prompts'

const FALLBACK = `You are explaining a contractor's quote to the homeowner who received it. Write a short plain-language summary of the work based ONLY on the line items provided. Never invent work, parts, prices or timelines. Never restate prices. Two short paragraphs at most.`

const SUMMARY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { summary: { type: Type.STRING } },
  required: ['summary'],
}

export type ExplainInput = {
  companyName?: string | null
  jobDescription?: string | null
  lineItems: { name: string; description: string | null; quantity: number }[]
}

/**
 * Returns an empty summary when AI is off or every model failed. There is no
 * keyword fallback here on purpose: inventing an explanation is worse than
 * showing none, because it reaches the customer as the contractor's own words.
 */
export async function explainQuote(input: ExplainInput): Promise<{ summary: string; mode: string }> {
  if (input.lineItems.length === 0) return { summary: '', mode: 'mock' }
  if (!aiEnabled()) return { summary: '', mode: 'mock' }

  const itemsText = input.lineItems
    .slice(0, 40)
    .map((it) => {
      const name = it.name || 'Item'
      const desc = it.description ? ` — ${it.description}` : ''
      const qty = it.quantity && it.quantity !== 1 ? ` (qty ${it.quantity})` : ''
      return `- ${name}${desc}${qty}`
    })
    .join('\n')

  const contents =
    `CONTRACTOR: ${input.companyName || 'The contractor'}\n` +
    `JOB DESCRIPTION: ${input.jobDescription || '(none given)'}\n\n` +
    `LINE ITEMS:\n${itemsText}\n`

  const result = await generateJson({
    system: loadPrompt('quote-explanation.md', FALLBACK),
    contents,
    schema: SUMMARY_SCHEMA,
    temperature: 0.2,
  })
  if (!result) return { summary: '', mode: 'mock' }

  const data = result.data as { summary?: unknown }
  const summary = typeof data.summary === 'string' ? data.summary.trim() : ''
  return { summary, mode: summary ? `gemini:${result.model}` : 'mock' }
}
