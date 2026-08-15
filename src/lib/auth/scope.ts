/**
 * Role-based row scoping.
 *
 * `src/lib/permissions.ts` has always said a technician sees only assigned jobs
 * and sales only their own leads. Nothing enforced it: every page read
 * company-wide, so anyone on the team could see every job, customer and price.
 *
 * The rule lives here as one SQL fragment rather than in each page, because a
 * rule repeated across a dozen queries is a rule that will be forgotten in the
 * thirteenth.
 */

import type { UserRole } from '@/lib/permissions'

export type Scope = {
  companyId: string
  userId: string
  role: UserRole
}

/**
 * A `where` fragment restricting work items to what this person may see,
 * with the parameters it needs.
 *
 * `startIndex` is the number of parameters already in the query, so the
 * placeholders continue from where the caller left off.
 */
export function workItemScope(
  scope: Scope,
  startIndex: number,
  alias = 'w',
): { sql: string; params: unknown[] } {
  const { role, userId } = scope

  // Owners and office run the business; they see all of it.
  if (role === 'owner' || role === 'office') {
    return { sql: '', params: [] }
  }

  if (role === 'technician') {
    // Only what they have been sent to do. Not the pipeline, not the quotes
    // they were never part of.
    return { sql: ` and ${alias}.assigned_to = $${startIndex + 1}`, params: [userId] }
  }

  if (role === 'sales') {
    // Their own work, whether they created it or were later assigned it.
    return {
      sql: ` and (${alias}.created_by = $${startIndex + 1} or ${alias}.assigned_to = $${startIndex + 1})`,
      params: [userId],
    }
  }

  // An unrecognised role sees nothing. Failing closed is the only safe default
  // for a value that reaches us from a session.
  return { sql: ' and false', params: [] }
}

/**
 * Customers visible to this person.
 *
 * A technician has no customer list of their own — they see the people attached
 * to work they were assigned, which is what they need to do the job and no
 * more. Written as an EXISTS so it composes with an ordinary customer query.
 */
export function customerScope(
  scope: Scope,
  startIndex: number,
  alias = 'c',
): { sql: string; params: unknown[] } {
  const { role, userId } = scope

  if (role === 'owner' || role === 'office') {
    return { sql: '', params: [] }
  }

  if (role === 'technician' || role === 'sales') {
    const mine =
      role === 'technician'
        ? `w.assigned_to = $${startIndex + 1}`
        : `(w.created_by = $${startIndex + 1} or w.assigned_to = $${startIndex + 1})`
    return {
      sql: ` and exists (
        select 1 from work_items w
         where w.customer_id = ${alias}.id
           and w.company_id = ${alias}.company_id
           and ${mine}
      )`,
      params: [userId],
    }
  }

  return { sql: ' and false', params: [] }
}

/** Whether this role may see the price book at all. */
export function canSeeCatalog(role: UserRole): boolean {
  // Everyone on the job can look an item up. A technician explaining a part to
  // a customer in their utility room needs the name, the description and the
  // picture; withholding the whole catalog to protect the prices withheld the
  // one thing that helps them sell.
  return role === 'owner' || role === 'office' || role === 'technician' || role === 'sales'
}

/**
 * Whether this role may see what things cost.
 *
 * The price book is the business. A technician who can export it can hand a
 * competitor the contractor's margins, so prices are withheld from them and
 * from sales — and withheld in the *query*, not in the markup. Rendering a
 * price behind a conditional still ships it to the browser, where anyone can
 * read it in devtools, which is exactly the leak this is meant to prevent.
 */
export function canSeeCatalogPrices(role: UserRole): boolean {
  return role === 'owner' || role === 'office'
}

/** Whether this role may see revenue and pipeline figures. */
export function canSeeAnalytics(role: UserRole): boolean {
  return role === 'owner' || role === 'office'
}

/** Whether this role may hand work to someone. */
export function canAssignWork(role: UserRole): boolean {
  return role === 'owner' || role === 'office'
}
