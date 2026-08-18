import { query } from '@/lib/db'

/**
 * The product audit trail.
 *
 * `activity_log` shipped in the baseline schema and was written by nothing —
 * so "what happened on this quote" had no answer outside the AI run log. One
 * writer, called from the actions where the lifecycle actually turns: created,
 * sent, viewed, accepted, declined, scheduled, invoiced, paid, and price-book
 * edits.
 *
 * `user_id` is null for actions the customer took over the public token and
 * for system events (webhooks, crons) — the `action` names the actor class.
 */

export type ActivityAction =
  | 'quote_created'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_declined'
  | 'job_scheduled'
  | 'invoice_created'
  | 'invoice_sent'
  | 'payment_recorded'
  | 'price_book_item_added'
  | 'price_book_item_updated'
  | 'price_book_item_archived'
  | 'note'

/**
 * Never throws and never blocks — identical contract to `recordAiRun`, for the
 * same reason: an accepted quote that could not be logged is still accepted,
 * and failing the customer's action over an audit row would invert what
 * matters. This is a logging sink, not an output substitute.
 */
export async function logActivity(input: {
  companyId: string
  userId?: string | null
  entityType?: 'work_item' | 'catalog_item'
  entityId: string
  action: ActivityAction
  description?: string
  changes?: Record<string, unknown>
}): Promise<void> {
  try {
    await query(
      `insert into activity_log (company_id, user_id, entity_type, entity_id, action, description, changes)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        input.companyId,
        input.userId ?? null,
        input.entityType ?? 'work_item',
        input.entityId,
        input.action,
        input.description ?? null,
        input.changes ? JSON.stringify(input.changes) : null,
      ],
    )
  } catch (e) {
    console.error('activity not logged', e)
  }
}

export type TimelineEntry = {
  at: string
  kind: 'activity' | 'ai'
  action: string
  description: string | null
  /** Who did it: a user id, 'customer', or 'ai'. The UI resolves names. */
  actor: string
  detail: Record<string, unknown> | null
}

/**
 * Everything that happened on one quote, oldest first — the activity trail and
 * the AI runs merged into one story. The AI rows come from `ai_conversations`
 * with `purpose <> 'quoting'`: the ADK session shares that table and would
 * otherwise arrive as one giant pseudo-event.
 */
export async function timelineForWorkItem(
  companyId: string,
  workItemId: string,
): Promise<TimelineEntry[]> {
  const [activity, aiRuns] = await Promise.all([
    query<{
      created_at: string
      action: string
      description: string | null
      user_id: string | null
      changes: Record<string, unknown> | null
    }>(
      `select created_at, action, description, user_id, changes
         from activity_log
        where company_id = $1 and entity_type = 'work_item' and entity_id = $2
        order by created_at asc
        limit 200`,
      [companyId, workItemId],
    ),
    query<{
      created_at: string
      purpose: string
      status: string
      cost_usd: number
      mode: string
    }>(
      `select created_at, purpose, status, cost_usd,
              coalesce(metadata->>'mode', model) as mode
         from ai_conversations
        where company_id = $1 and entity_type = 'work_item' and entity_id = $2
          and purpose <> 'quoting'
        order by created_at asc
        limit 100`,
      [companyId, workItemId],
    ),
  ])

  const entries: TimelineEntry[] = [
    ...activity.map((a) => ({
      at: a.created_at,
      kind: 'activity' as const,
      action: a.action,
      description: a.description,
      actor: a.user_id ?? (a.action.startsWith('quote_v') || a.action.endsWith('accepted') || a.action.endsWith('declined') ? 'customer' : 'system'),
      detail: a.changes,
    })),
    ...aiRuns.map((r) => ({
      at: r.created_at,
      kind: 'ai' as const,
      action: r.purpose,
      description: null,
      actor: 'ai',
      detail: { status: r.status, mode: r.mode, cost_usd: r.cost_usd },
    })),
  ]

  return entries.sort((a, b) => a.at.localeCompare(b.at))
}
