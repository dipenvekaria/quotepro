import { Pool, type QueryResultRow } from 'pg'

// Raw Postgres access (no ORM). DATABASE_URL points at local Postgres in dev and
// Cloud SQL in prod (via the Cloud SQL Connector / private IP). Tenant scoping
// (company_id) must be enforced in each query — this connection is not RLS-bound.
const globalForDb = globalThis as unknown as { __pgPool?: Pool }

const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.__pgPool = pool

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params)
  return result.rows
}

export { pool }
