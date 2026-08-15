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
import { serviceAccountCredentials } from '@/lib/google/credentials'

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

/**
 * Vertex does not carry the floating `-latest` aliases — those are an AI Studio
 * convention, and asking for one there is a 404 that falls straight through to
 * the keyword matcher. Vertex wants pinned ids, so it gets its own chain, in
 * the same order: lite first for latency, full flash behind it.
 */
const DEFAULT_VERTEX_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']

export function geminiModels(): string[] {
  const configured = envServer().GEMINI_MODELS
  if (!configured) return vertexEnabled() ? DEFAULT_VERTEX_MODELS : DEFAULT_MODELS
  const list = configured
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  return list.length ? list : DEFAULT_MODELS
}

let _client: GoogleGenAI | null = null

/**
 * Vertex AI or the AI Studio developer API — the same Gemini models either way.
 *
 * The difference is billing, and it matters: AI Studio runs on its own prepay
 * balance, while Vertex bills the GCP account, so GCP credit (free trial
 * included) only reaches Gemini through Vertex. Switched on with
 * GOOGLE_GENAI_USE_VERTEXAI=true.
 */
function vertexEnabled(): boolean {
  const flag = envServer().GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase()
  return flag === 'true' || flag === '1'
}

function client(): GoogleGenAI | null {
  // Cached across invocations — Fluid Compute reuses warm instances, so
  // rebuilding the client per request is wasted work.
  if (_client) return _client

  if (vertexEnabled()) {
    const project = envServer().GOOGLE_CLOUD_PROJECT
    if (!project) {
      console.error('GOOGLE_GENAI_USE_VERTEXAI is set but GOOGLE_CLOUD_PROJECT is not')
      return null
    }
    const credentials = serviceAccountCredentials()
    _client = new GoogleGenAI({
      vertexai: true,
      project,
      location: envServer().GOOGLE_CLOUD_LOCATION || 'us-central1',
      // Explicit credentials when a key is configured; otherwise fall through
      // to ADC, which is what a GCP-hosted runtime already has.
      ...(credentials ? { googleAuthOptions: { credentials } } : {}),
    })
    return _client
  }

  const { GEMINI_API_KEY } = envServer()
  if (!GEMINI_API_KEY) return null
  _client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  return _client
}

/** Whether real generation is available, or everything degrades to the mock. */
export function aiEnabled(): boolean {
  if (vertexEnabled()) return Boolean(envServer().GOOGLE_CLOUD_PROJECT)
  return Boolean(envServer().GEMINI_API_KEY)
}

export type GeminiJsonResult = { data: unknown; model: string }

/**
 * How long the whole chain may take before the caller gives up and degrades.
 *
 * There was no timeout at all. An unresponsive model held the request until the
 * platform killed it at 300 seconds, so a contractor pressing "Draft with AI"
 * could watch a spinner for five minutes and then get nothing. The keyword
 * fallback exists precisely so there is something to degrade to; it just had no
 * way of being reached.
 *
 * 25s is generous — flash-lite answers in about two seconds — and the budget is
 * shared, so trying a second model cannot double the wait.
 */
const DEFAULT_CHAIN_BUDGET_MS = 25_000

function chainBudgetMs(): number {
  // Configurable so the degrade path can be exercised deliberately rather than
  // only when a model happens to hang.
  const raw = Number(process.env.GEMINI_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CHAIN_BUDGET_MS
}
/** Never leave less than this for an attempt; below it, fail fast instead. */
const MIN_ATTEMPT_MS = 4_000

/**
 * Call Gemini and parse a JSON object out of it, walking the model chain until
 * one succeeds. Returns null when AI is off or every model failed — callers
 * decide what to do with that, because the right answer differs: quoting falls
 * back to keyword matching, the customer summary shows nothing at all.
 */
/**
 * Whether a failure condemns every model, rather than just this one.
 *
 * 429 covers both "out of credit" and "too many requests"; neither is fixed by
 * asking a different model on the same key. 401/403 are the key itself.
 */
function isKeyLevelFailure(e: unknown, msg: string): boolean {
  const status = (e as { status?: number } | null)?.status
  if (status === 429 || status === 401 || status === 403) return true
  return /RESOURCE_EXHAUSTED|PERMISSION_DENIED|UNAUTHENTICATED|credits are depleted|quota/i.test(
    msg,
  )
}

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
  /**
   * Override the model chain for this call.
   *
   * Drafting a quote and reading a scanned price book are not the same
   * problem. Drafting picks items from a text list and flash-lite does it well
   * in about two seconds; extraction is OCR over dozens of scanned pages, and
   * on a real competitor price book flash-lite found 21 items where pro found
   * 45 — including the labour rates that are the pricing model rather than a
   * line item. Extraction runs once per contractor at onboarding, so the extra
   * minute costs nothing and the difference is most of their catalog.
   */
  models?: string[]
  /** Longer budget for a call that legitimately takes a minute. */
  budgetMs?: number
}): Promise<GeminiJsonResult | null> {
  const ai = client()
  if (!ai) return null

  const deadline = Date.now() + (opts.budgetMs ?? chainBudgetMs())

  for (const model of opts.models ?? geminiModels()) {
    const remaining = deadline - Date.now()
    if (remaining < Math.min(MIN_ATTEMPT_MS, chainBudgetMs())) {
      console.error(`gemini: out of time before trying ${model}`)
      break
    }

    for (const thinking of [true, false]) {
      const attemptMs = Math.max(
        Math.min(MIN_ATTEMPT_MS, chainBudgetMs()),
        deadline - Date.now(),
      )
      const abort = AbortSignal.timeout(attemptMs)
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: opts.contents,
          config: {
            // Both, because they bound different layers: httpOptions covers the
            // request, the signal covers everything after it.
            abortSignal: abort,
            httpOptions: { timeout: attemptMs },
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

        // Out of time. Retrying the same model with different settings cannot
        // help, and the next one has no budget left either.
        if (abort.aborted || /abort|timeout|timed out/i.test(msg)) {
          console.error(`gemini ${model} timed out after ${attemptMs}ms`)
          return null
        }

        // Only the thinking level was unacceptable — same model, second pass.
        if (thinking && /thinking/i.test(msg)) continue

        console.error(`gemini ${model} failed`, e)

        // Quota, billing and auth failures belong to the API key, not to the
        // model, so the next model in the chain is guaranteed to fail the same
        // way. Trying it anyway doubled the wasted calls and the latency the
        // contractor waits through before the keyword fallback appears —
        // observed as two identical "prepayment credits are depleted" errors
        // per quote. Stop the whole chain.
        if (isKeyLevelFailure(e, msg)) return null

        // Anything else is this model's problem; move on to the next one.
        break
      }
    }
  }

  return null
}
