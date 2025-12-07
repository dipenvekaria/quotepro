/**
 * Base API client - handles fetch with auth, error handling, JSON parsing
 */

import { createClient } from '@/lib/supabase/client'

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

interface FetchOptions extends RequestInit {
  body?: any
  timeout?: number
}

/**
 * Base fetch wrapper with automatic auth, JSON handling, error parsing
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.headers) {
    Object.assign(headers, options.headers)
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const timeout = options.timeout || 60000 // 60s default
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const config: RequestInit = {
    ...options,
    headers,
    signal: controller.signal,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }

  try {
    const response = await fetch(endpoint, config)
    clearTimeout(timeoutId)

    if (!response.ok) {
      let error: APIError
      try {
        const errorData = await response.json()
        error = new APIError(
          errorData.error || errorData.message || 'Request failed',
          response.status,
          errorData.code
        )
      } catch {
        error = new APIError(
          `Request failed: ${response.statusText}`,
          response.status
        )
      }
      throw error
    }

    return response.json() as Promise<T>
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new APIError('Request timeout', 408)
    }
    throw err
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: <T = any>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any) =>
    apiClient<T>(endpoint, { method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any) =>
    apiClient<T>(endpoint, { method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any) =>
    apiClient<T>(endpoint, { method: 'PATCH', body }),

  delete: <T = any>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
}
