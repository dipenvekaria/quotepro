/**
 * The line items of a quote — the ones that actually count.
 *
 * `quote_items` holds every tier of a good/better/best quote at once, tagged
 * with `option_tier`, because each tier includes everything in the tier before
 * it. That is the right storage shape and a trap for every reader: not one of
 * them filtered, so a three-tier quote showed each line three times. The
 * contractor saw it as duplicate entries, and `sendQuote` put the same
 * triplicated list in front of the customer.
 *
 * The rule this encodes: an untiered quote is the rows with no tier; a tiered
 * quote is whichever tier is live — the customer's selection once they have
 * made one, otherwise the most complete option, which is what the totals on the
 * work item already track.
 */

/**
 * A SQL predicate selecting only the live tier's rows, to append to a query
 * already filtered to one work item.
 *
 * `$n` must be the placeholder holding that work item's id, so the caller
 * passes it once and this reuses it rather than taking a second parameter.
 */
export function liveTierPredicate(workItemIdPlaceholder: number, alias = 'qi'): string {
  const id = `$${workItemIdPlaceholder}`
  return `
    and (
      ${alias}.option_tier is null
      or ${alias}.option_tier = coalesce(
        (select tier from quote_options
          where work_item_id = ${id} and is_selected order by sort_order limit 1),
        -- Tiebroken on the tier itself: sort_order is written correctly by the
        -- save path, but a flat or hand-edited value must not silently pick the
        -- cheapest option to send to a customer.
        (select tier from quote_options
          where work_item_id = ${id}
          order by sort_order desc,
                   case tier when 'best' then 3 when 'better' then 2 else 1 end desc
          limit 1)
      )
    )`
}
