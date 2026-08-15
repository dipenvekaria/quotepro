/**
 * How a contractor found Rivet.
 *
 * Self-reported at onboarding rather than derived from UTM parameters, which is
 * a deliberate choice and not a shortcut. The channels most likely to work here
 * — a referral from another contractor, a supply-house counter, a chapter
 * meeting — leave no click trail at all, so link-based attribution would be
 * precise about the small half of the picture and silent about the rest.
 *
 * The one number this exists to produce is churn by source. Cost per acquired
 * customer is easy to get from an invoice; whether those customers *stay* is
 * the variable the business model is most sensitive to, and it cannot be
 * recovered later from data nobody recorded at the time.
 *
 * `detailLabel` marks the sources where the follow-up answer is the useful one.
 * Knowing a customer came from a referral is mildly interesting; knowing which
 * contractor sent them is who to thank, and who to ask again.
 */
export type AcquisitionSource = {
  value: string
  label: string
  detailLabel?: string
}

export const ACQUISITION_SOURCES: readonly AcquisitionSource[] = [
  { value: 'referral', label: 'Another contractor told me', detailLabel: 'Who should we thank?' },
  { value: 'supply_house', label: 'Supply house or distributor', detailLabel: 'Which one?' },
  { value: 'association', label: 'Trade association or trade show', detailLabel: 'Which one?' },
  { value: 'search', label: 'Google or another search engine' },
  { value: 'social', label: 'Social media or online video' },
  { value: 'creator', label: 'A creator I follow', detailLabel: 'Who?' },
  { value: 'review_site', label: 'A software review site' },
  { value: 'bookkeeper', label: 'My bookkeeper or accountant' },
  { value: 'other', label: 'Something else', detailLabel: 'Where did you hear about us?' },
] as const

export const ACQUISITION_VALUES = ACQUISITION_SOURCES.map((s) => s.value)

export function acquisitionSource(value: string | null | undefined): AcquisitionSource | undefined {
  if (!value) return undefined
  return ACQUISITION_SOURCES.find((s) => s.value === value)
}

/** Whether the follow-up box is worth showing for this source. */
export function wantsDetail(value: string | null | undefined): boolean {
  return Boolean(acquisitionSource(value)?.detailLabel)
}
