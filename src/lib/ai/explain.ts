/**
 * Plain-language quote summary for the homeowner.
 *
 * Prices are deliberately not sent to the model. They are rendered directly
 * beneath this text, and a model that cannot see them cannot contradict them —
 * which matters when the number is the thing being agreed to.
 */

import { AiUnavailableError, Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
import { loadPrompt } from '@/lib/ai/prompts'

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
 * Throws when AI is off or every model failed — the contractor pressed a
 * button and silence would read as the button being broken. There is no
 * keyword fallback on purpose: inventing an explanation is worse than an
 * error, because it reaches the customer as the contractor's own words.
 *
 * An empty line-item list is not a failure — there is nothing to explain —
 * so that one returns an empty summary rather than throwing.
 */
export async function explainQuote(input: ExplainInput): Promise<{ summary: string; mode: string }> {
  if (input.lineItems.length === 0) return { summary: '', mode: 'empty' }
  if (!aiEnabled()) throw new AiUnavailableError('no Gemini credentials are configured')

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
    system: loadPrompt('quote-explanation.md'),
    contents,
    schema: SUMMARY_SCHEMA,
    temperature: 0.2,
  })
  if (!result) throw new AiUnavailableError('every model failed or returned nothing')

  const data = result.data as { summary?: unknown }
  const summary = typeof data.summary === 'string' ? data.summary.trim() : ''
  if (!summary) throw new AiUnavailableError('the model returned an empty summary')
  return { summary, mode: `gemini:${result.model}` }
}
