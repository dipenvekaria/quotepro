/**
 * Untyped Supabase client wrappers.
 *
 * The generated `database.types.ts` is from the legacy schema and doesn't
 * cover the current tables (work_items, invoices, payments, users, etc.).
 * These wrappers cast the clients so callers can query the current schema
 * without every row narrowing to `never`. Row shapes should be declared
 * explicitly at each call site.
 */

import { createAdminClient as _createAdminClient } from './admin'
import { createClient as _createServerClient } from './server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = any

export async function sbServer(): Promise<Untyped> {
  return (await _createServerClient()) as unknown as Untyped
}

export function sbAdmin(): Untyped {
  return _createAdminClient() as unknown as Untyped
}
