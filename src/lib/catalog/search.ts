/**
 * Client-side matching for the catalog list.
 *
 * Deliberately not a database search. The whole price book is already on the
 * page — the list renders every item — so filtering in the browser is instant
 * and works while a technician is standing in a basement with one bar of
 * signal. The customer list does the opposite for the opposite reason: there
 * may be thousands of customers and they are not all loaded.
 *
 * Category and labels are searchable, not just the name. A contractor looking
 * for a thermostat may be thinking of the category it lives in, and labels are
 * how promotions group items, so "autumn" should find what the autumn
 * promotion applies to.
 */
export type SearchableItem = {
  name: string
  description?: string | null
  category?: string | null
  labels?: string[]
}

export function matchesCatalogSearch(item: SearchableItem, term: string): boolean {
  const q = term.trim().toLowerCase()
  if (!q) return true
  return (
    item.name.toLowerCase().includes(q) ||
    (item.description ?? '').toLowerCase().includes(q) ||
    (item.category ?? '').toLowerCase().includes(q) ||
    (item.labels ?? []).some((l) => l.toLowerCase().includes(q))
  )
}
