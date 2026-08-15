'use server'

import { z } from 'zod'

import { getSession } from '@/lib/auth/session'

import { addressDetails, autocompleteAddress, type StructuredAddress, type Suggestion } from './google'

/**
 * Address lookup, as server actions rather than a route handler.
 *
 * `/api/*` is deliberately outside the auth middleware, so a route here would
 * be an open endpoint anyone could point at to burn the Google quota. A server
 * action carries the session cookie and is refused without one.
 */

const searchSchema = z.object({
  input: z.string().max(200),
  /** Groups a run of keystrokes into one billable session. */
  sessionToken: z.string().uuid(),
})

export async function searchAddresses(
  input: unknown,
): Promise<{ ok: true; available: boolean; suggestions: Suggestion[] } | { ok: false; error: string }> {
  const parsed = searchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid search' }

  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const { available, suggestions } = await autocompleteAddress(
    parsed.data.input,
    parsed.data.sessionToken,
  )
  return { ok: true, available, suggestions }
}

const detailsSchema = z.object({
  placeId: z.string().min(1).max(400),
  sessionToken: z.string().uuid(),
})

export async function resolveAddress(
  input: unknown,
): Promise<{ ok: true; address: StructuredAddress } | { ok: false; error: string }> {
  const parsed = detailsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid address' }

  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const address = await addressDetails(parsed.data.placeId, parsed.data.sessionToken)
  if (!address) return { ok: false, error: 'Could not read that address' }
  return { ok: true, address }
}
