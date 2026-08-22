/**
 * The platform's one line on every quote: who the agreement is with.
 *
 * Rendered as its own block under the contractor's terms — never merged into
 * them (their words stay verbatim) — and stored on the acceptance record so
 * the retained document shows exactly what the customer saw. Wording is
 * deliberately factual; counsel reviews it with the terms before launch.
 */
export function platformNotice(companyName: string): string {
  return `${companyName} is responsible for this quote, the work, and any warranties. Rivet provides the software that delivers it and is not a party to this agreement.`
}
