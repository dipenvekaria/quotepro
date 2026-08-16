import { BaseSessionService } from '@google/adk'
import type {
  AppendEventRequest,
  CreateSessionRequest,
  DeleteSessionRequest,
  Event,
  GetSessionRequest,
  ListSessionsRequest,
  ListSessionsResponse,
  Session,
} from '@google/adk'

import { query } from '@/lib/db'

import { geminiModels } from './gemini'

/**
 * ADK sessions, stored in Postgres.
 *
 * ADK ships `DatabaseSessionService` (MikroORM) and `VertexAiSessionService`.
 * Neither is used. This codebase reaches Postgres with raw `pg` and
 * parameterised SQL — that is a stated rule, not a preference — and a session
 * store is not the place to introduce an ORM and a second connection pool.
 * `BaseSessionService` is abstract precisely so this is possible.
 *
 * **The session id is the work item id.** A quote belongs to exactly one
 * customer, so "customer + quote" and "quote" identify the same conversation,
 * and the work item is the id the rest of the product already uses — the URL,
 * the pipeline, the invoice all key off it. Inventing a separate session
 * identifier would mean a mapping table and a way for the two to disagree.
 *
 * Rows live in `ai_conversations`, which already had `entity_type`,
 * `entity_id`, `messages` and the token and cost columns. It had never held a
 * row.
 */

const APP_NAME = 'rivet-quoting'
const ENTITY_TYPE = 'work_item'
const LIST_LIMIT = 100

type Row = {
  entity_id: string
  user_id: string | null
  messages: unknown
  metadata: Record<string, unknown> | null
  updated_at: string | null
  created_at: string
}

function toSession(row: Row): Session {
  const events = Array.isArray(row.messages) ? row.messages : []
  return {
    id: row.entity_id,
    appName: APP_NAME,
    userId: row.user_id ?? '',
    state: (row.metadata?.state as Record<string, unknown>) ?? {},
    // ADK's Event shape is what we wrote out; it round-trips through jsonb.
    events: events as Session['events'],
    lastUpdateTime: new Date(row.updated_at ?? row.created_at).getTime() / 1000,
  }
}

/**
 * Sessions scoped to one company.
 *
 * The company id is a constructor argument rather than something read per call,
 * because every statement below must carry it and a parameter that is easy to
 * forget will eventually be forgotten. The `pg` pool bypasses RLS, so this is
 * the only thing standing between one contractor's quoting history and another's.
 */
export class PostgresSessionService extends BaseSessionService {
  constructor(private readonly companyId: string) {
    super()
  }

  async createSession(request: CreateSessionRequest): Promise<Session> {
    const id = request.sessionId
    if (!id) throw new Error('a quote session must be created with the work item id')

    const [row] = await query<Row>(
      // `model` is NOT NULL on this table — it was designed to log one
      // completion per row, where the model was known at insert. A session spans
      // many completions and may span a model change mid-chain, so the column
      // records which chain this session started on rather than pretending to a
      // single answer.
      `insert into ai_conversations
         (company_id, user_id, entity_type, entity_id, agent_name, model, purpose, messages, metadata)
       values ($1, $2, $3, $4, $5, $7, 'quoting', '[]'::jsonb, $6)
       on conflict (company_id, entity_type, entity_id) where purpose = 'quoting'
         do update set updated_at = now()
       returning entity_id, user_id, messages, metadata, created_at, updated_at`,
      [
        this.companyId,
        request.userId || null,
        ENTITY_TYPE,
        id,
        APP_NAME,
        JSON.stringify({ state: request.state ?? {} }),
        geminiModels()[0],
      ],
    )
    return toSession(row)
  }

  async getSession(request: GetSessionRequest): Promise<Session | undefined> {
    const [row] = await query<Row>(
      `select entity_id, user_id, messages, metadata, created_at, updated_at
         from ai_conversations
        where company_id = $1 and entity_type = $2 and entity_id = $3
        limit 1`,
      [this.companyId, ENTITY_TYPE, request.sessionId],
    )
    return row ? toSession(row) : undefined
  }

  async listSessions(request: ListSessionsRequest): Promise<ListSessionsResponse> {
    const rows = await query<Row>(
      `select entity_id, user_id, messages, metadata, created_at, updated_at
         from ai_conversations
        where company_id = $1 and entity_type = $2 and ($3::uuid is null or user_id = $3)
        order by created_at desc
        limit ${LIST_LIMIT}`,
      [this.companyId, ENTITY_TYPE, request.userId || null],
    )
    // Deliberately unpaginated: a company has one quoting session per quote,
    // and the cap below is an upper bound rather than a page.
    const sessions = rows.map(toSession)
    return {
      sessions,
      page: 1,
      limit: LIST_LIMIT,
      totalItems: sessions.length,
      totalPages: 1,
    }
  }

  async deleteSession(request: DeleteSessionRequest): Promise<void> {
    // Quoting history is a record of what was promised and why a price changed.
    // Marked closed rather than removed, in line with how the rest of the
    // product treats destructive operations.
    await query(
      `update ai_conversations set status = 'closed'
        where company_id = $1 and entity_type = $2 and entity_id = $3`,
      [this.companyId, ENTITY_TYPE, request.sessionId],
    )
  }

  /**
   * Persist a turn.
   *
   * The base class updates the in-memory session; this writes it through, so a
   * contractor who comes back tomorrow finds the conversation where they left
   * it. Appending in SQL rather than rewriting the array avoids losing a turn
   * to two tabs open on the same quote.
   */
  async appendEvent(request: AppendEventRequest): Promise<Event> {
    const result = await super.appendEvent(request)
    await query(
      `update ai_conversations
          set messages = coalesce(messages, '[]'::jsonb) || $4::jsonb,
              updated_at = now()
        where company_id = $1 and entity_type = $2 and entity_id = $3`,
      [
        this.companyId,
        ENTITY_TYPE,
        request.session.id,
        JSON.stringify([request.event]),
      ],
    )
    return result
  }
}
