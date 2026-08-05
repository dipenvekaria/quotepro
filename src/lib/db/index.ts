import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

// Direct Postgres connection (Cloud SQL-ready). Swap DATABASE_URL to point at
// Cloud SQL in prod — no code change. NOTE: this connects as the app DB user and
// bypasses Supabase RLS, so tenant scoping (company_id) must be enforced in each
// query until we move RLS/authz into this layer.
const globalForDb = globalThis as unknown as { __pgPool?: Pool }

const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.__pgPool = pool

export const db = drizzle(pool, { schema })
