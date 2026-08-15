import { query } from '@/lib/db'

/**
 * Integration tests need a real database — that is the point of them, and it is
 * why the pure-function suites could not have caught the invitation bug.
 *
 * When Postgres is not reachable they fail loudly rather than skipping.
 * A suite that quietly does nothing when the environment is wrong is worse than
 * no suite: it reports green while protecting nothing, which is exactly the
 * failure mode this directory exists to correct.
 */
export async function requireDatabase(): Promise<void> {
  try {
    await query('select 1')
  } catch (e) {
    throw new Error(
      'Integration tests need Postgres.\n' +
        '  Local:  supabase start\n' +
        '  CI:     the workflow starts Supabase before running tests\n' +
        `  Cause:  ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}
