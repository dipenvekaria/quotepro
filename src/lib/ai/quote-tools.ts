import { query } from '@/lib/db'

import { searchCatalog } from './catalog-index'
import { estimateFromCatalog } from './estimate'

/**
 * What the quoting agent is allowed to do.
 *
 * The important property is what is *missing*: there is no tool that takes a
 * free-text name and a price. Every line item must name a `catalog_item_id`
 * that exists for this company, so the model cannot invent one. A hallucinated
 * price the customer accepts is a contract the contractor has to honour, and
 * removing the mechanism is stronger than instructing against it in a prompt.
 *
 * The second property is that these **mutate the quote in place**. The old
 * generator returned a whole list of line items and the editor replaced
 * everything it had, so asking for 10% off after hand-adjusting a price threw
 * the adjustment away. There is no generate step here to throw anything away —
 * the quote is rows in `quote_items`, and the agent edits them.
 *
 * Every function takes `companyId` and `workItemId` from the session rather
 * than from the model. The model chooses *what* to do; it never chooses whose
 * data to do it to.
 */

export type ToolContext = { companyId: string; workItemId: string }

/** Verifies the quote belongs to the caller before any write touches it. */
async function assertOwned({ companyId, workItemId }: ToolContext): Promise<void> {
  const [row] = await query<{ id: string }>(
    'select id from work_items where id = $1 and company_id = $2 limit 1',
    [workItemId, companyId],
  )
  if (!row) throw new Error('quote not found')
}

export type QuoteLine = {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  unit: string | null
  line_total: number
  is_discount: boolean
  is_estimate?: boolean
  estimate_basis?: string | null
}

export async function readQuote(ctx: ToolContext) {
  await assertOwned(ctx)
  const items = await query<QuoteLine>(
    `select qi.id, qi.name, qi.description, qi.quantity, qi.unit_price, qi.unit,
            qi.total as line_total,
            coalesce(qi.is_discount, false) as is_discount,
            coalesce(qi.is_estimate, false) as is_estimate,
            qi.estimate_basis
       from quote_items qi
       join work_items w on w.id = qi.work_item_id
      where qi.work_item_id = $1 and w.company_id = $2
      order by qi.created_at asc`,
    [ctx.workItemId, ctx.companyId],
  )
  const subtotal = items.reduce((s, i) => s + Number(i.line_total), 0)
  return { items, subtotal, line_count: items.length }
}

/** Search the contractor's own price book. Hybrid vector + keyword. */
export async function findCatalogItems(ctx: ToolContext, q: string, limit = 8) {
  const hits = await searchCatalog(ctx.companyId, q, limit)
  return hits.map((h) => ({
    catalog_item_id: h.id,
    name: h.name,
    description: h.description,
    category: h.category,
    unit: h.unit,
    price: Number(h.base_price),
    labor_hours: h.labor_hours,
  }))
}

/**
 * Add a catalog item to the quote.
 *
 * Price comes from the catalog row, not from the model. The model may not
 * propose a number, so a wrong price has to be a wrong *item*, which a
 * contractor reading the quote will notice — unlike a plausible price attached
 * to the right name.
 */
export async function addLineItem(ctx: ToolContext, catalogItemId: string, quantity = 1) {
  await assertOwned(ctx)
  const [item] = await query<{
    name: string
    description: string | null
    base_price: number
    unit: string | null
    labor_hours: number | null
  }>(
    `select name, description, base_price, unit, labor_hours
       from catalog_items where id = $1 and company_id = $2 and is_active`,
    [catalogItemId, ctx.companyId],
  )
  if (!item) throw new Error('that item is not in your catalog')

  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  // labor_hours is copied across because it is what lets an accepted quote know
  // its own duration — the thing calendar capacity and the materials list both
  // depend on, and the one field competitors cannot copy without rebuilding
  // their price book.
  const [row] = await query<{ id: string }>(
    `insert into quote_items
       (work_item_id, catalog_item_id, name, description, quantity, unit_price, labor_hours, unit)
     values ($1, $2, $3, $4, $5::numeric, $6::numeric, $7, $8)
     returning id`,
    [
      ctx.workItemId,
      catalogItemId,
      item.name,
      item.description,
      qty,
      item.base_price,
      item.labor_hours,
      item.unit,
    ],
  )
  return { id: row.id, name: item.name, quantity: qty, unit_price: Number(item.base_price) }
}

export async function updateLineItem(
  ctx: ToolContext,
  lineId: string,
  changes: { quantity?: number; unit_price?: number; name?: string; description?: string },
) {
  await assertOwned(ctx)
  // `name` is here because a contractor renames lines — "rename the discount
  // to Manager Special" — and without it the model called this tool six times
  // with a name field the schema silently stripped, every call a successful
  // no-op. A label is the contractor's own words on their own quote; renaming
  // never touches the price, which still only comes from the catalog or an
  // explicit price change.
  const name = changes.name?.trim()
  const [row] = await query<{ id: string; name: string; quantity: number; unit_price: number }>(
    `update quote_items qi
        set quantity    = coalesce($3::numeric, qi.quantity),
            unit_price  = coalesce($4::numeric, qi.unit_price),
            name        = coalesce($6, qi.name),
            description = coalesce($7, qi.description)
      from work_items w
     where qi.id = $1 and qi.work_item_id = $2
       and w.id = qi.work_item_id and w.company_id = $5
     returning qi.id, qi.name, qi.quantity, qi.unit_price`,
    [
      lineId,
      ctx.workItemId,
      changes.quantity ?? null,
      changes.unit_price ?? null,
      ctx.companyId,
      name && name.length > 0 ? name.slice(0, 300) : null,
      changes.description !== undefined ? changes.description.slice(0, 1000) : null,
    ],
  )
  if (!row) throw new Error('that line is not on this quote')
  return row
}

export async function removeLineItem(ctx: ToolContext, lineId: string) {
  await assertOwned(ctx)
  const [row] = await query<{ id: string; name: string }>(
    `delete from quote_items qi
      using work_items w
      where qi.id = $1 and qi.work_item_id = $2
        and w.id = qi.work_item_id and w.company_id = $3
      returning qi.id, qi.name`,
    [lineId, ctx.workItemId, ctx.companyId],
  )
  if (!row) throw new Error('that line is not on this quote')
  return { removed: row.name }
}

/**
 * Discount as a line, never as a silent edit to prices.
 *
 * "10% off" could be applied by rewriting every unit price, and that would be
 * the wrong thing: the customer would see a quote whose prices do not match the
 * contractor's price book, with no record of why. A negative line says what
 * happened and survives someone asking about it in three months.
 */
export async function applyDiscount(
  ctx: ToolContext,
  input: { percent?: number; amount?: number; label?: string },
) {
  const { items, subtotal } = await readQuote(ctx)
  const priced = items.filter((i) => !i.is_discount)
  if (priced.length === 0) throw new Error('there is nothing to discount yet')

  const base = priced.reduce((s, i) => s + Number(i.line_total), 0)
  const value =
    typeof input.percent === 'number'
      ? Math.round(base * (input.percent / 100) * 100) / 100
      : Number(input.amount ?? 0)
  if (!Number.isFinite(value) || value <= 0) throw new Error('that discount is not a number')
  if (value > base) throw new Error('that discount is larger than the quote')

  const label =
    input.label ??
    (typeof input.percent === 'number' ? `${input.percent}% discount` : 'Discount')

  const [row] = await query<{ id: string }>(
    `insert into quote_items
       (work_item_id, name, quantity, unit_price, is_discount)
     values ($1, $2, 1, $3::numeric, true)
     returning id`,
    [ctx.workItemId, label, -Math.abs(value)],
  )
  return { id: row.id, label, amount: -Math.abs(value), was: subtotal, now: subtotal - value }
}

/**
 * A line for something the price book does not carry.
 *
 * This is the one tool that puts a price on the quote without a catalog row
 * behind it, and it is fenced accordingly.
 *
 * The model does **not** choose the number. It says what was asked for; the
 * price comes from `estimateFromCatalog`, which reads the contractor's nearest
 * comparable item and their own rates. So the failure mode is "estimated from
 * the wrong comparable", which a contractor can see and correct, rather than
 * "invented a plausible figure", which they cannot distinguish from a real one.
 *
 * The line is flagged `is_estimate` and that flag is **internal**. The customer
 * sees a normal line at whatever price the salesperson settles on — telling a
 * homeowner part of their quote is guesswork invites them to negotiate it, and
 * it stops being true the moment someone reviews it.
 *
 * Refuses rather than guessing when the catalog has nothing close. A
 * salesperson can type a price themselves, and is better off knowing the
 * software declined than trusting a number with no basis.
 */
export async function proposeEstimatedItem(
  ctx: ToolContext,
  input: { name: string; quantity?: number },
) {
  await assertOwned(ctx)

  const est = await estimateFromCatalog(ctx.companyId, input.name)
  if (!est) {
    throw new Error(
      `There is nothing close to "${input.name}" in the price book to estimate from. Add the line by hand, or add the item to the catalog first.`,
    )
  }

  const qty = Number.isFinite(input.quantity) && (input.quantity ?? 0) > 0 ? input.quantity! : 1
  // The basis goes in `estimate_basis` and NOWHERE else. It is internal — it
  // names the comparable and states the markup — and `description` renders on
  // /q and the PDF. Writing the basis into `description` (as this once did) put
  // "Estimated from …, 50% markup" straight onto the customer's quote, which is
  // exactly what the is_estimate flag exists to prevent.
  const [row] = await query<{ id: string }>(
    `insert into quote_items
       (work_item_id, name, description, quantity, unit_price, is_estimate, estimate_basis)
     values ($1, $2, null, $3::numeric, $4::numeric, true, $5)
     returning id`,
    [ctx.workItemId, input.name, qty, est.price, est.basis],
  )

  return {
    id: row.id,
    name: input.name,
    quantity: qty,
    unit_price: est.price,
    is_estimate: true,
    basis: est.basis,
    tell_the_contractor:
      'This is an estimate, not a catalog price. Say so, and say what it was based on.',
  }
}
