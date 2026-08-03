/**
 * Service-role Supabase client — bypasses RLS.
 *
 * SERVER-ONLY. Do not import from a `'use client'` component.
 * Use inside server actions, route handlers, and RSCs when a task legitimately
 * needs to cross RLS boundaries (indexer, webhooks, admin operations).
 */

import { createClient } from '@supabase/supabase-js'

import { env, envServer } from '@/lib/env'

let _admin: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() called from client bundle')
  }
  if (_admin) return _admin
  _admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    envServer().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
  return _admin
}
