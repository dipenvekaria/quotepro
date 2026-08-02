/**
 * Streaming chat hook — consumes the SSE endpoint from src/lib/ai/client.ts.
 *
 * Vercel-AI-SDK-shaped API: `messages`, `input`, `sendMessage`, `stop`.
 * Kept independent of `ai/react` so the surface is stable if we swap SDKs later.
 */
import { useCallback, useRef, useState } from 'react'

import { streamChat } from '@/lib/ai/client'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function useQuoteChat(opts: {
  getToken: () => Promise<string | null>
  agent?: string
  entityType?: string
  entityId?: string
  initialSessionId?: string | null
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(opts.initialSessionId ?? null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || pending) return
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
      }
      setMessages((m) => [...m, userMessage])

      const assistantId = crypto.randomUUID()
      setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: '' }])

      setPending(true)
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const token = await opts.getToken()
        const stream = streamChat(
          {
            messages: [{ role: 'user', content: userText }],
            session_id: sessionId,
            entity_type: opts.entityType ?? null,
            entity_id: opts.entityId ?? null,
            agent: opts.agent ?? 'router',
          },
          { token: token ?? undefined, signal: controller.signal },
        )
        for await (const event of stream) {
          if (event.type === 'session') {
            setSessionId(event.session_id)
          } else if (event.type === 'token') {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, content: msg.content + event.text } : msg,
              ),
            )
          } else if (event.type === 'error') {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, content: `⚠️ ${event.message}` } : msg,
              ),
            )
            break
          } else if (event.type === 'done') {
            break
          }
        }
      } finally {
        setPending(false)
        abortRef.current = null
      }
    },
    [opts, pending, sessionId],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setPending(false)
  }, [])

  return { messages, sendMessage, stop, pending, sessionId }
}
