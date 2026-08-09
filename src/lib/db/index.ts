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

// Raw Postgres access (no ORM). Tenant scoping (company_id) must be enforced in
// each query — this connection is not RLS-bound.
//
// DATABASE_URL is what we set by hand (local dev, Railway). POSTGRES_URL is what
// Vercel's Supabase integration provisions automatically, already pointed at the
// transaction-mode pooler. Falling back to it means a Vercel deploy works without
// hand-copying a connection string that contains the database password.
// Never use POSTGRES_URL_NON_POOLING here: the direct endpoint is IPv6-only and
// serverless concurrency exhausts it.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

const globalForDb = globalThis as unknown as { __pgPool?: Pool }

const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString,
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

// Query fn bound to a single transaction client.
export type TxQuery = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<T[]>

// Run `fn` inside a BEGIN/COMMIT transaction; ROLLBACK on any throw.
export async function withTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const q: TxQuery = async (text, params = []) => (await client.query(text, params)).rows
    const result = await fn(q)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

// Like withTransaction, but first sets the Supabase auth context
// (request.jwt.claims) so SQL functions using auth.uid() resolve to `userId`.
// Needed for RPCs like create_work_item_with_customer / bootstrap_company that
// read auth.uid() internally (NULL under the raw superuser connection otherwise).
export async function withUser<T>(userId: string, fn: (q: TxQuery) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ])
    const q: TxQuery = async (text, params = []) => (await client.query(text, params)).rows
    const result = await fn(q)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export { pool }
