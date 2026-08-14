/**
 * Gemini client and the model-fallback chain.
 *
 * This replaced the FastAPI service on 2026-08-11 (docs/adr/0009). The AI now
 * runs in-process inside server actions, which removes the second runtime, the
 * second deploy, and the shared-secret trust boundary between them.
 *
 * Model policy (docs/adr, CLAUDE.md, .claude/skills/rivet-ai): Google Gemini
 * only, temperature <= 0.2, JSON mime type and a response schema whenever the
 * output is parsed. Money and JSON must be deterministic.
 */

import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type ContentListUnion,
  type Schema,
} from '@google/genai'

import { envServer } from '@/lib/env'

export { Type, type ContentListUnion, type Schema }

// Tried in order; a quota limit degrades to the next rather than failing.
//
// **Lite leads deliberately.** Measured against the same three jobs and the
// same catalog, lite returns in 1.4-1.8s where flash takes 23-70s — flash is a
// thinking model and is also the one that 503s under load. Every task here
// picks items from a supplied list and is pinned to a response schema, which
// lite does perfectly well; flash's extra capability buys nothing and costs a
// contractor a minute of staring at a spinner. Flash stays as the fallback.
//
// Only the two floating aliases are left. `gemini-2.5-flash`,
// `gemini-2.5-flash-lite` and `gemini-2.0-flash` were all in this chain and all
// three now return 404 "no longer available" — every one of them was a wasted
// round-trip on the path to a model that works. Pinning a dated Gemini model
// buys nothing here and expires without warning; the aliases do not.
const DEFAULT_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest']

export function geminiModels(): string[] {
  const configured = envServer().GEMINI_MODELS
  if (!configured) return DEFAULT_MODELS
  const list = configured
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  return list.length ? list : DEFAULT_MODELS
}

let _client: GoogleGenAI | null = null

function client(): GoogleGenAI | null {
  const { GEMINI_API_KEY } = envServer()
  if (!GEMINI_API_KEY) return null
  // Cached across invocations — Fluid Compute reuses warm instances, so
  // rebuilding the client per request is wasted work.
  if (!_client) _client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  return _client
}

/** Whether real generation is available, or everything degrades to the mock. */
export function aiEnabled(): boolean {
  return Boolean(envServer().GEMINI_API_KEY)
}

export type GeminiJsonResult = { data: unknown; model: string }

/**
 * Call Gemini and parse a JSON object out of it, walking the model chain until
 * one succeeds. Returns null when AI is off or every model failed — callers
 * decide what to do with that, because the right answer differs: quoting falls
 * back to keyword matching, the customer summary shows nothing at all.
 */
export async function generateJson(opts: {
  system: string
  /**
   * A prompt string, or parts for multimodal input — an `inlineData` part
   * carries a PDF or photo the model reads directly.
   */
  contents: ContentListUnion
  schema: Schema
  temperature?: number
  maxOutputTokens?: number
}): Promise<GeminiJsonResult | null> {
  const ai = client()
  if (!ai) return null

  for (const model of geminiModels()) {
    for (const thinking of [true, false]) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: opts.contents,
          config: {
            systemInstruction: opts.system,
            responseMimeType: 'application/json',
            responseSchema: opts.schema,
            temperature: opts.temperature ?? 0,
            // Thinking buys nothing on a schema-constrained extraction and
            // costs a great deal: unbounded, these calls took 70-230s and one
            // reply reached 63KB of JSON before failing to parse.
            //
            // But the level a model accepts is not stable. `thinkingBudget: 0`
            // is rejected outright, and MINIMAL was accepted one day and 400ing
            // with "not supported for this model" the next — the floating
            // aliases resolve to different models over time. So it is an
            // attempt, not a requirement: on rejection the same model is
            // retried with whatever thinking it defaults to. A slow answer
            // beats no answer.
            ...(thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
            // An unbounded response is what turned a 3-second call into a
            // 4-minute one. Thinking tokens count against this budget, so it
            // has to clear the reply by a wide margin — 4096 truncated the JSON
            // mid-object, and a failed parse is worse than a slow success.
            maxOutputTokens: opts.maxOutputTokens ?? 16384,
          },
        })
        const raw = resp.text
        if (!raw) break
        return { data: JSON.parse(raw), model }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // Only the thinking level was unacceptable — same model, second pass.
        if (thinking && /thinking/i.test(msg)) continue
        // Anything else is this model's problem; move on to the next one.
        console.error(`gemini ${model} failed`, e)
        break
      }
    }
  }

  return null
}
