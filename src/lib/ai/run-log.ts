import { query } from '@/lib/db'

/**
 * What the AI did, on which quote.
 *
 * Nothing recorded this. `ai_conversations` had existed since the baseline with
 * columns for model, tokens, cost and latency, and was written by nothing —
 * so "what did the AI do on Tom's quote" had no answer at all, and neither did
 * "why is this line here" or "what did this cost".
 *
 * The reason it was never recorded is structural rather than an oversight:
 * `generateQuoteItems` runs *before* the quote exists on a new draft, so there
 * was no id to hang a record on. Drafting from an existing quote does have one
 * and simply never passed it.
 *
 * So a run is recorded either way. With a work item when there is one — which
 * makes the quote the key, since the work item id is also the ADK session id —
 * and without one otherwise, where it is still auditable by company and time.
 */

export type AiRun = {
  companyId: string
  userId?: string | null
  /** The quote this was for, when it already exists. */
  workItemId?: string | null
  /** `gemini:<model>`, or `unavailable` when generation failed hard. Alerting reads this. */
  mode: string
  purpose: string
  prompt: string
  /** A summary rather than the payload — enough to explain the result, not to replay it. */
  result: Record<string, unknown>
  usage?: { input: number; output: number }
  latencyMs?: number
}

/**
 * Pricing for the flash-lite chain, per million tokens.
 *
 * Recorded per run rather than computed later, because the model can change
 * underneath and a cost recomputed with today's prices would quietly restate
 * history.
 */
const USD_PER_M_INPUT = 0.1
const USD_PER_M_OUTPUT = 0.4

export function estimateCostUsd(usage?: { input: number; output: number }): number {
  if (!usage) return 0
  return (
    (usage.input / 1_000_000) * USD_PER_M_INPUT +
    (usage.output / 1_000_000) * USD_PER_M_OUTPUT
  )
}

/**
 * Never throws and never blocks.
 *
 * A quote that could not be logged is still a quote. Failing the contractor's
 * draft because an audit row would not insert would trade the thing that
 * matters for the thing that explains it.
 */
export async function recordAiRun(run: AiRun): Promise<void> {
  try {
    await query(
      `insert into ai_conversations
         (company_id, user_id, entity_type, entity_id, agent_name, model, purpose,
          messages, tokens_input, tokens_output, cost_usd, latency_ms, status, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb)`,
      [
        run.companyId,
        run.userId ?? null,
        run.workItemId ? 'work_item' : 'company',
        run.workItemId ?? run.companyId,
        'rivet-quote-generator',
        run.mode,
        run.purpose,
        JSON.stringify([
          { role: 'user', text: run.prompt },
          { role: 'model', summary: run.result },
        ]),
        run.usage?.input ?? 0,
        run.usage?.output ?? 0,
        estimateCostUsd(run.usage),
        run.latencyMs ?? null,
        // Anything that is not a real Gemini run is recorded as degraded so it
        // can be alerted on. Since the fail-hard change this means
        // `unavailable` — the contractor saw an error and nothing was drafted;
        // a spike here is an outage, not a quality problem.
        run.mode.startsWith('gemini') ? 'success' : 'degraded',
        JSON.stringify({ mode: run.mode }),
      ],
    )
  } catch (e) {
    console.error('ai run not recorded', e)
  }
}

// The per-quote read side lives in `timelineForWorkItem` (src/lib/activity.ts),
// which merges these runs with the product activity trail. The standalone
// reader that used to sit here had no callers and one latent bug — it did not
// exclude the ADK session row (purpose 'quoting'), which shares this table.
