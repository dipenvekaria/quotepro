import { AiUnavailableError, Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
import { loadPrompt } from '@/lib/ai/prompts'

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['tags'],
}

/**
 * Describe a job photo for the work portfolio. Trade-agnostic by rule: the
 * prompt asks the model to name only what it sees in general terms, never to
 * infer a trade. Returns a small set of lowercase tags, or throws
 * AiUnavailableError when Gemini is not configured / every model fails.
 */
export async function tagJobPhoto(input: { data: Buffer; mimeType: string }): Promise<string[]> {
  if (!aiEnabled()) throw new AiUnavailableError('no Gemini credentials are configured')

  const result = await generateJson({
    system: loadPrompt('photo-tagging.md'),
    contents: [
      { inlineData: { mimeType: input.mimeType, data: input.data.toString('base64') } },
      { text: 'Tag this job photo.' },
    ],
    schema: SCHEMA,
    temperature: 0.1,
    maxOutputTokens: 256,
    // Cheapest capable vision model — this runs on every uploaded photo.
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    budgetMs: 30_000,
  })
  if (!result) throw new AiUnavailableError('every model failed or returned nothing')

  const raw = (result.data as { tags?: unknown }).tags
  const tags = (Array.isArray(raw) ? raw : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 40)
  return [...new Set(tags)].slice(0, 6)
}
