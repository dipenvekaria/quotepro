import { Pool, types, type QueryResultRow } from 'pg'

// pg returns numeric/decimal (OID 1700) as strings — parse to number so money
// columns behave like the Supabase client's responses did.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)))

// pg parses date/timestamp columns into JS Date objects by default. Return the
// raw ISO-ish string instead so values match our `string` types and support
// string ops (.slice) + `new Date(...)` the same way the Supabase client did.
const asRawString = (v: string) => v
types.setTypeParser(1082, asRawString) // date
types.setTypeParser(1114, asRawString) // timestamp (without time zone)
types.setTypeParser(1184, asRawString) // timestamptz

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
