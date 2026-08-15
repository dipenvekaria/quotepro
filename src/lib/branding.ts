/**
 * Whose name the customer sees.
 *
 * The public quote and invoice already carry the contractor's logo and company
 * name — the badge is the last thing that says this was built by someone else.
 * Removing it is the most-asked-for part of white labelling and the cheapest to
 * give, so it is what a paid plan buys.
 *
 * The rule lives here rather than at four call sites because the two viewers
 * and the two PDFs must agree; a badge that disappears from the web page and
 * survives on the PDF the customer keeps is worse than not offering it.
 */
export function showsRivetBadge(plan: string | null | undefined): boolean {
  // Empty counts as free. `?? 'free'` does not catch '' — nullish coalescing
  // passes an empty string straight through — so a blank plan column would have
  // handed the paid feature away silently. Show the badge unless the plan is
  // positively something else.
  const p = (plan ?? '').trim().toLowerCase()
  return p === '' || p === 'free'
}
