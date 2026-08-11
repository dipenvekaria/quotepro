import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Tenancy guard.
 *
 * The `pg` pool connects as superuser and bypasses RLS, so `where company_id =
 * $n` in each statement is the *primary* access control — there is no framework
 * catching a missing one. A forgotten predicate is a cross-tenant read that
 * compiles, passes review, and looks correct in local testing against a single
 * seeded company.
 *
 * This test extracts every SQL statement in live code and fails on any that is
 * neither self-evidently scoped nor explicitly accounted for below. It cannot
 * prove a query is safe — a statement can carry `company_id` and still be wrong
 * — but it makes an *unscoped* one impossible to add silently.
 *
 * A manual audit on 2026-08-10 reviewed all 53 call sites and found no leaks.
 * The exemptions below are that audit, written down.
 */

const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')

/**
 * Statements with no literal `company_id`, each safe for a specific reason.
 *
 * Adding an entry is a deliberate act: state why the statement cannot leak.
 * "It looked fine" is not a reason — the safe pattern is that a preceding query
 * already verified the parent row against the caller's company AND the code
 * bails when that lookup returns nothing.
 */
const EXEMPT: Array<{ file: string; match: string; reason: string }> = [
  // --- reads scoped by a session-derived company id -------------------------
  {
    file: 'src/app/app/(shell)/layout.tsx',
    match: 'from companies where id = $1',
    reason: '$1 is companyId from requireSession()',
  },
  {
    file: 'src/app/app/(shell)/integrations/page.tsx',
    match: 'from companies',
    reason: '$1 is companyId from requireSession()',
  },
  {
    file: 'src/app/app/(shell)/settings/team-actions.ts',
    match: 'from companies where id = $1',
    reason: '$1 is session.companyId',
  },
  {
    file: 'src/app/app/(shell)/settings/actions.ts',
    match: 'update companies set',
    reason: 'where id = $7 is session.companyId',
  },
  {
    file: 'src/app/app/(shell)/quotes/new/actions.ts',
    match: "settings->>'tax_rate'",
    reason: 'where id = $1 is session.companyId',
  },

  // --- child rows reached through a parent already verified ----------------
  {
    file: 'src/app/app/(shell)/customers/[id]/page.tsx',
    match: 'from customer_addresses',
    reason: 'customer fetched with company_id above; notFound() when missing',
  },
  {
    file: 'src/app/app/(shell)/customers/page.tsx',
    match: 'from customer_addresses',
    reason: 'customer ids come from a company-scoped query',
  },
  {
    file: 'src/app/app/(shell)/pipeline/[id]/actions.ts',
    match: 'from quote_items',
    reason: 'work item verified against company_id earlier in the action',
  },
  {
    file: 'src/app/app/(shell)/pipeline/[id]/page.tsx',
    match: 'from quote_items',
    reason: 'work item loaded with w.company_id = $1, then if (!row) notFound()',
  },
  {
    file: 'src/app/app/(shell)/pipeline/[id]/page.tsx',
    match: 'from invoices',
    reason: 'keyed on the already-verified work item id',
  },
  {
    file: 'src/app/app/(shell)/pipeline/[id]/page.tsx',
    match: 'from payments',
    reason: 'keyed on the invoice belonging to the verified work item',
  },
  {
    file: 'src/app/app/(shell)/quotes/new/actions.ts',
    match: 'delete from quote_items',
    reason: 'preceded by an ownership check on work_items',
  },
  {
    file: 'src/app/app/(shell)/quotes/new/actions.ts',
    match: 'insert into quote_items',
    reason: 'preceded by an ownership check on work_items',
  },
  {
    file: 'src/app/app/(shell)/quotes/new/actions.ts',
    match: 'update work_items',
    reason: 'preceded by an ownership check on work_items',
  },
  {
    file: 'src/features/invoices/actions.ts',
    match: 'update work_items set invoice_number',
    reason: 'work item loaded with id = $1 and company_id = $2',
  },
  {
    file: 'src/features/invoices/actions.ts',
    match: 'insert into payments',
    reason: 'invoice verified with id = $1 and company_id = $2',
  },
  {
    file: 'src/features/invoices/actions.ts',
    match: 'update invoices set',
    reason: 'invoice verified with id = $1 and company_id = $2',
  },
]

/** RPCs that enforce tenancy inside the function body. */
const TENANT_SAFE_RPCS = [
  'create_work_item_with_customer',
  'bootstrap_company',
  'accept_invitation',
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(entry) ? [full] : []
  })
}

type Stmt = { file: string; line: number; sql: string }

function extractStatements(): Stmt[] {
  const out: Stmt[] = []
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file)
    if (rel.endsWith('src/lib/db/index.ts')) continue // the helpers themselves
    const text = readFileSync(file, 'utf8')
    // `await query(...)` / `await q(...)`, capturing the SQL template literal
    const re = /await\s+(?:query|q)\s*(?:<[^>]*>)?\s*\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')/g
    for (const m of text.matchAll(re)) {
      out.push({
        file: rel,
        line: text.slice(0, m.index).split('\n').length,
        sql: m[1].slice(1, -1).replace(/\s+/g, ' ').trim().toLowerCase(),
      })
    }
  }
  return out
}

function isAccountedFor(s: Stmt): boolean {
  if (s.sql.includes('company_id')) return true
  if (TENANT_SAFE_RPCS.some((fn) => s.sql.includes(fn))) return true
  // A user reading their own row: `from users where id = $1`
  if (/from\s+users\s+where\s+id\s*=/.test(s.sql)) return true
  return EXEMPT.some((e) => s.file === e.file && s.sql.includes(e.match))
}

describe('tenancy', () => {
  it('finds SQL to check', () => {
    // Guards against the extractor silently matching nothing after a refactor,
    // which would make every assertion below vacuously true.
    expect(extractStatements().length).toBeGreaterThan(30)
  })

  it('every statement is company-scoped or explicitly exempt', () => {
    const unaccounted = extractStatements().filter((s) => !isAccountedFor(s))
    const report = unaccounted
      .map((s) => `\n  ${s.file}:${s.line}\n    ${s.sql.slice(0, 120)}`)
      .join('')
    expect(
      unaccounted,
      `${unaccounted.length} SQL statement(s) touch company data without a ` +
        `company_id predicate and are not exempt.${report}\n\n` +
        `The pg pool bypasses RLS — an unscoped statement is a cross-tenant leak. ` +
        `Either add "where company_id = $n", or add an entry to EXEMPT in this ` +
        `file stating why it cannot leak.\n`,
    ).toHaveLength(0)
  })

  it('exemptions all still match a real statement', () => {
    // Stops the list rotting into a set of stale rules that quietly permit
    // whatever happens to match them later.
    const stmts = extractStatements()
    const dead = EXEMPT.filter(
      (e) => !stmts.some((s) => s.file === e.file && s.sql.includes(e.match)),
    )
    expect(
      dead,
      `Exemption(s) no longer match any statement — delete them:` +
        dead.map((d) => `\n  ${d.file} :: "${d.match}"`).join(''),
    ).toHaveLength(0)
  })
})
