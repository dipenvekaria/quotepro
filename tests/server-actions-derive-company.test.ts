import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

/**
 * A Server Action must derive the tenant from the session, never take it as an
 * argument.
 *
 * Every `export`ed function in a `'use server'` file is a public endpoint:
 * Next.js registers it with an action id and it is reachable by a direct POST
 * from any signed-in user, regardless of which route imports it. The client
 * that calls it controls every argument. So an action that accepted a
 * `companyId` parameter was a cross-tenant read waiting to happen — and one
 * was: `listQuotePhotos(workItemId, companyId)` returned any company's private
 * quote photos to any authenticated user who passed another tenant's ids, both
 * of which are handed to anyone who opens a /q/{token} link.
 *
 * The rule is mechanical and worth enforcing mechanically: a Server Action
 * takes ids of things (a work item, an invoice) and looks up the company from
 * `getSession()`. It never takes the company from the caller. This scans the
 * signatures rather than trusting review to catch the next one.
 */

const actionFiles = execSync(
  "grep -rl \"'use server'\" src --include='*.ts' --include='*.tsx' || true",
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)

/** Exported action signatures, flattened to one line each. */
function exportedSignatures(src: string): string[] {
  const out: string[] = []
  const re = /export\s+(?:async\s+)?function\s+\w+\s*\(([\s\S]*?)\)\s*(?::|\{)/g
  for (const m of src.matchAll(re)) {
    out.push(m[1].replace(/\s+/g, ' ').trim())
  }
  return out
}

describe('server actions derive the tenant from the session', () => {
  it('finds action files to check', () => {
    // Guards against the grep silently matching nothing, which would make the
    // assertion below vacuously true.
    expect(actionFiles.length).toBeGreaterThan(5)
  })

  it('no exported action takes a companyId parameter', () => {
    const offenders: string[] = []
    for (const f of actionFiles) {
      for (const sig of exportedSignatures(readFileSync(f, 'utf8'))) {
        // A parameter literally named companyId / company_id, i.e. the tenant
        // arriving from the caller. `session.companyId` inside a body is fine —
        // this only looks at the parameter list.
        if (/\bcompany_?[iI]d\b\s*[:,)]/.test(sig)) {
          offenders.push(`${f}  (${sig})`)
        }
      }
    }
    expect(
      offenders,
      'a Server Action must read the company from getSession(), not accept it as ' +
        'an argument the caller controls:\n  ' + offenders.join('\n  '),
    ).toEqual([])
  })
})
