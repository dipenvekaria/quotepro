/**
 * AI feature hooks — thin wrappers over @/lib/ai/client for React components.
 *
 * Server actions call the backend directly; these hooks are for client
 * components that need loading state (e.g. AIChatPanel, generate button).
 */
import { useCallback, useState } from 'react'

import { AiClientError, aiClient } from '@/lib/ai/client'
import type { QuoteResponse } from '@/types/api'

// ---- generate-quote --------------------------------------------------------

export function useGenerateQuote(getToken: () => Promise<string | null>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AiClientError | null>(null)

  const mutate = useCallback(
    async (input: {
      company_id: string
      description: string
      customer_name?: string
      customer_address?: string
      existing_items?: QuoteResponse['line_items']
    }): Promise<QuoteResponse | null> => {
      setError(null)
      setPending(true)
      try {
        const token = await getToken()
        return await aiClient.generateQuote(
          {
            company_id: input.company_id,
            description: input.description,
            customer_name: input.customer_name,
            customer_address: input.customer_address,
            existing_items: input.existing_items ?? [],
          },
          { token: token ?? undefined },
        )
      } catch (e) {
        if (e instanceof AiClientError) setError(e)
        else setError(new AiClientError(String(e), { code: 'unknown_error', status: 0 }))
        return null
      } finally {
        setPending(false)
      }
    },
    [getToken],
  )

  return { mutate, pending, error }
}

// ---- update-quote ----------------------------------------------------------

export function useUpdateQuote(getToken: () => Promise<string | null>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AiClientError | null>(null)

  const mutate = useCallback(
    async (input: {
      work_item_id: string
      company_id: string
      user_prompt: string
      existing_items: QuoteResponse['line_items']
    }): Promise<QuoteResponse | null> => {
      setError(null)
      setPending(true)
      try {
        const token = await getToken()
        return await aiClient.updateQuote(input, { token: token ?? undefined })
      } catch (e) {
        if (e instanceof AiClientError) setError(e)
        else setError(new AiClientError(String(e), { code: 'unknown_error', status: 0 }))
        return null
      } finally {
        setPending(false)
      }
    },
    [getToken],
  )

  return { mutate, pending, error }
}
