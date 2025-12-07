// src/lib/hooks/useAdk.ts
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'agent'
  text: string
}

interface UseAdkChatOptions {
  userId?: string
}

export function useAdkChat({ userId = 'default_user' }: UseAdkChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (message: string) => {
    if (!message.trim()) return

    setIsLoading(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: message }])

    try {
      const response = await fetch('/api/adk/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id: userId,
          session_id: sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'An unknown error occurred')
      }

      const data = await response.json()

      setSessionId(data.session_id)
      setMessages(prev => [...prev, { role: 'agent', text: data.reply }])
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get a response from the assistant.'
      setError(errorMessage)
      toast.error(errorMessage)
      // Remove the user's message if the API call failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    sendMessage,
    isLoading,
    error,
  }
}
