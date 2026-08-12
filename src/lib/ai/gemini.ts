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

import { GoogleGenAI, Type, type Schema } from '@google/genai'

import { envServer } from '@/lib/env'

export { Type, type Schema }

// Tried in order; a quota limit or a retired model degrades to the next rather
// than failing the request.
//
// `gemini-flash-latest` leads rather than `gemini-2.5-flash`, which the API now
// rejects with 404 "no longer available to new users" for keys issued after it
// was retired. Keeping it first cost a wasted round-trip on every single quote.
// It stays in the chain because older keys can still reach it.
const DEFAULT_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
]

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
  contents: string
  schema: Schema
  temperature?: number
}): Promise<GeminiJsonResult | null> {
  const ai = client()
  if (!ai) return null

  for (const model of geminiModels()) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: opts.contents,
        config: {
          systemInstruction: opts.system,
          responseMimeType: 'application/json',
          responseSchema: opts.schema,
          temperature: opts.temperature ?? 0,
        },
      })
      const raw = resp.text
      if (!raw) continue
      return { data: JSON.parse(raw), model }
    } catch (e) {
      // Try the next model. A single model being over quota, or returning
      // something unparseable, should not take the feature down.
      console.error(`gemini ${model} failed`, e)
    }
  }

  return null
}
