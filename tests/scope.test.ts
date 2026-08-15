import { describe, expect, it } from 'vitest'

import {
  canAssignWork,
  canSeeAnalytics,
  canSeeCatalog,
  canSeeCatalogPrices,
  customerScope,
  workItemScope,
  type Scope,
} from '@/lib/auth/scope'
import type { UserRole } from '@/lib/permissions'

/**
 * The fragment these build is the only thing between a technician and the whole
 * company's book of business, so the cases that matter are the ones that would
 * widen it.
 */

const scope = (role: UserRole): Scope => ({ companyId: 'co', userId: 'me', role })

describe('workItemScope', () => {
  it('does not restrict an owner', () => {
    expect(workItemScope(scope('owner'), 1).sql).toBe('')
  })

  it('does not restrict office', () => {
    expect(workItemScope(scope('office'), 1).sql).toBe('')
  })

  it('restricts a technician to assigned work', () => {
    const r = workItemScope(scope('technician'), 1)
    expect(r.sql).toContain('assigned_to')
    expect(r.sql).not.toContain('created_by')
    expect(r.params).toEqual(['me'])
  })

  it('gives sales what they created or were assigned', () => {
    const r = workItemScope(scope('sales'), 1)
    expect(r.sql).toContain('created_by')
    expect(r.sql).toContain('assigned_to')
  })

  it('fails closed on an unrecognised role', () => {
    // A stale session must not widen access.
    const r = workItemScope(scope('nonsense' as UserRole), 1)
    expect(r.sql).toBe(' and false')
  })

  it('numbers placeholders after the parameters already in the query', () => {
    expect(workItemScope(scope('technician'), 2).sql).toContain('$3')
    expect(workItemScope(scope('technician'), 5).sql).toContain('$6')
  })

  it('honours the table alias so it can be dropped into a join', () => {
    expect(workItemScope(scope('technician'), 1, 'wi').sql).toContain('wi.assigned_to')
  })
})

describe('customerScope', () => {
  it('does not restrict an owner', () => {
    expect(customerScope(scope('owner'), 1).sql).toBe('')
  })

  it('limits a technician to customers on their assigned work', () => {
    const r = customerScope(scope('technician'), 1)
    expect(r.sql).toContain('exists')
    expect(r.sql).toContain('w.assigned_to')
    // Company scoping stays inside the subquery, or it would reach across tenants.
    expect(r.sql).toContain('w.company_id = c.company_id')
  })

  it('fails closed on an unrecognised role', () => {
    expect(customerScope(scope('nonsense' as UserRole), 1).sql).toBe(' and false')
  })
})

describe('what each role may see', () => {
  it('lets everyone look an item up', () => {
    // A technician explaining a part in a customer's utility room needs the
    // name, the description and the picture. Hiding the whole catalog to
    // protect the prices hid the one thing that helps them sell.
    expect(canSeeCatalog('owner')).toBe(true)
    expect(canSeeCatalog('office')).toBe(true)
    expect(canSeeCatalog('sales')).toBe(true)
    expect(canSeeCatalog('technician')).toBe(true)
  })

  it('keeps the prices from technicians and sales', () => {
    // The price book is the business — someone who can export it can hand a
    // competitor the contractor's margins.
    expect(canSeeCatalogPrices('owner')).toBe(true)
    expect(canSeeCatalogPrices('office')).toBe(true)
    expect(canSeeCatalogPrices('sales')).toBe(false)
    expect(canSeeCatalogPrices('technician')).toBe(false)
  })

  it('fails closed on an unrecognised role', () => {
    expect(canSeeCatalogPrices('nonsense' as UserRole)).toBe(false)
  })

  it('keeps revenue figures from technicians and sales', () => {
    expect(canSeeAnalytics('owner')).toBe(true)
    expect(canSeeAnalytics('technician')).toBe(false)
    expect(canSeeAnalytics('sales')).toBe(false)
  })

  it('lets only owner and office hand out work', () => {
    expect(canAssignWork('owner')).toBe(true)
    expect(canAssignWork('office')).toBe(true)
    expect(canAssignWork('sales')).toBe(false)
    expect(canAssignWork('technician')).toBe(false)
  })
})
