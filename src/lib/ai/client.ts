/**
 * Typed FastAPI client — every response Zod-validated.
 *
 * Reads env.NEXT_PUBLIC_BACKEND_URL on the client and envServer().BACKEND_INTERNAL_URL
 * on the server (so server-to-server calls can bypass CDNs / load balancers).
 *
 * Auth: pass a Supabase JWT via `token`. Server actions should read the token
 * from the session on request context and forward it.
 */

import { z } from 'zod'

import { env } from '@/lib/env'
import {
  type QuoteResponse,
  backfillResponseSchema,
  catalogSearchResponseSchema,
  errorEnvelope,
  generateQuoteRequestSchema,
  quoteResponseSchema,
  taxRateResponseSchema,
  updateQuoteRequestSchema,
} from '@/types/api'

// ---------------------------------------------------------------------------

export type AiClientOptions = {
  /** Supabase JWT — required for authenticated endpoints. */
  token?: string
  /** Override base URL (defaults to env.NEXT_PUBLIC_BACKEND_URL). */
  baseUrl?: string
  /** Optional AbortSignal for cancellation. */
  signal?: AbortSignal
}

export class AiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(message: string, opts: { code: string; status: number; details?: unknown }) {
    super(message)
    this.name = 'AiClientError'
    this.code = opts.code
    this.status = opts.status
    this.details = opts.details
  }
}

async function request<T extends z.ZodTypeAny>(
  path: string,
  {
    method = 'POST',
    body,
    schema,
    token,
    baseUrl,
    signal,
  }: {
    method?: 'GET' | 'POST'
    body?: unknown
    schema: T
    token?: string
    baseUrl?: string
    signal?: AbortSignal
  },
): Promise<z.infer<T>> {
  const base = baseUrl ?? env.NEXT_PUBLIC_BACKEND_URL
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  })

  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  if (!res.ok) {
    const errParse = errorEnvelope.safeParse(parsed)
    if (errParse.success) {
      throw new AiClientError(errParse.data.error.message, {
        code: errParse.data.error.code,
        status: res.status,
        details: errParse.data.error.details,
      })
    }
    throw new AiClientError(`Backend ${res.status}: ${text.slice(0, 300)}`, {
      code: 'unknown_error',
      status: res.status,
    })
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new AiClientError('Backend response failed schema validation', {
      code: 'schema_mismatch',
      status: 200,
      details: result.error.flatten(),
    })
  }
  return result.data
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const aiClient = {
  async generateQuote(
    body: z.infer<typeof generateQuoteRequestSchema>,
    opts: AiClientOptions = {},
  ): Promise<QuoteResponse> {
    const validated = generateQuoteRequestSchema.parse(body)
    return request('/api/ai/generate-quote', {
      body: validated,
      schema: quoteResponseSchema,
      ...opts,
    })
  },

  async updateQuote(
    body: z.infer<typeof updateQuoteRequestSchema>,
    opts: AiClientOptions = {},
  ): Promise<QuoteResponse> {
    const validated = updateQuoteRequestSchema.parse(body)
    return request('/api/ai/update-quote', {
      body: validated,
      schema: quoteResponseSchema,
      ...opts,
    })
  },

  async calculateTaxRate(
    body: { address: string; company_id?: string },
    opts: AiClientOptions = {},
  ) {
    return request('/api/ai/tax', {
      body,
      schema: taxRateResponseSchema,
      ...opts,
    })
  },

  async searchCatalog(query: string, limit = 10, opts: AiClientOptions = {}) {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    return request(`/api/catalog/search?${params.toString()}`, {
      method: 'GET',
      schema: catalogSearchResponseSchema,
      ...opts,
    })
  },

  async backfillEmbeddings(
    body: { catalog?: boolean; work_items?: boolean } = { catalog: true, work_items: true },
    opts: AiClientOptions = {},
  ) {
    return request('/api/index/backfill', {
      body,
      schema: backfillResponseSchema,
      ...opts,
    })
  },
}

// ---------------------------------------------------------------------------
// SSE streaming chat — returns an async iterable of typed events.
// ---------------------------------------------------------------------------

export type ChatEvent =
  | { type: 'session'; session_id: string }
  | { type: 'token'; text: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | { type: 'agent_switch'; from: string; to: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export async function* streamChat(
  body: {
    messages: { role: string; content: string }[]
    session_id?: string | null
    entity_type?: string | null
    entity_id?: string | null
    agent?: string
  },
  opts: AiClientOptions = {},
): AsyncIterable<ChatEvent> {
  const base = opts.baseUrl ?? env.NEXT_PUBLIC_BACKEND_URL
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    throw new AiClientError(`Chat stream failed: ${res.status}`, {
      code: 'stream_error',
      status: res.status,
    })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Parse SSE frames separated by blank lines.
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const event = parseSseFrame(frame)
      if (event) yield event
    }
  }
}

function parseSseFrame(frame: string): ChatEvent | null {
  let event = 'message'
  let data = ''
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!data) return null

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>
    switch (event) {
      case 'session':
        return { type: 'session', session_id: String(parsed.session_id ?? '') }
      case 'token':
        return { type: 'token', text: String(parsed.text ?? data) }
      case 'tool_call':
        return { type: 'tool_call', name: String(parsed.name ?? ''), args: parsed.args }
      case 'tool_result':
        return { type: 'tool_result', name: String(parsed.name ?? ''), result: parsed.result }
      case 'agent_switch':
        return {
          type: 'agent_switch',
          from: String(parsed.from ?? ''),
          to: String(parsed.to ?? ''),
        }
      case 'done':
        return { type: 'done' }
      case 'error':
        return { type: 'error', message: String(parsed.message ?? 'unknown') }
    }
  } catch {
    // Token events sometimes ship raw text
    if (event === 'token') return { type: 'token', text: data }
  }
  return null
}
