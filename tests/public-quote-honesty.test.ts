import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The internal job description never reaches a customer.
 *
 * `work_items.description` is the contractor's prompt — "customer also
 * wants…", shorthand, scope that never became a line item. It rendered
 * verbatim on /q and /i, and fed to the summariser it produced customer copy
 * promising work with no line item ("the work involves sealing your attic
 * ductwork" on a quote with no duct sealing) — which the customer accepted.
 *
 * The line items are the entire customer-facing truth. These checks pin that.
 */

describe('internal description stays internal', () => {
  it('the public quote viewer does not render or receive it', () => {
    const viewer = readFileSync('src/app/q/[id]/quote-viewer.tsx', 'utf8')
    expect(viewer, 'quote-viewer renders quote.description').not.toMatch(/quote\.description/)
    const page = readFileSync('src/app/q/[id]/page.tsx', 'utf8')
    // Line-item and option descriptions are customer copy; the work item's own
    // description must not be selected. Match it as a bare select-list entry.
    expect(page, '/q page selects work_items.description').not.toMatch(/status, description/)
  })

  it('the public invoice viewer does not render it', () => {
    const viewer = readFileSync('src/app/i/[id]/invoice-viewer.tsx', 'utf8')
    expect(viewer).not.toMatch(/workItemDescription/)
  })

  it('the customer summary is generated from line items only', () => {
    const explain = readFileSync('src/lib/ai/explain.ts', 'utf8')
    expect(explain, 'explain.ts feeds the internal description to the model').not.toMatch(
      /jobDescription/i,
    )
    const prompt = readFileSync('prompts/quote-explanation.md', 'utf8')
    expect(prompt, 'the prompt still tells the model to use the job description').not.toMatch(
      /job description provided/i,
    )
  })
})
