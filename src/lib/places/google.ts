import { envServer } from '@/lib/env'

/**
 * Address autocomplete, via the Google Places API (New).
 *
 * SERVER-ONLY. The key never reaches the browser — the drop-in JS widget wants
 * a public key restricted by HTTP referrer, which is a restriction anyone can
 * forge. Proxying keeps the key secret and, more importantly, keeps the session
 * token on our side where it cannot be dropped.
 *
 * **Session tokens are the cost control, not an optimisation.** Google bills a
 * whole run of keystrokes as one session when every request in it carries the
 * same token and the run ends in a Details call. Without one, each keystroke is
 * a separate billable request — the difference between a quote costing a
 * fraction of a cent and costing twenty times that.
 *
 * Like the AI, this degrades rather than fails: no key means `available: false`
 * and the caller falls back to a plain text field. A contractor can always type
 * an address by hand.
 */

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const DETAILS_URL = 'https://places.googleapis.com/v1/places'

export type Suggestion = {
  placeId: string
  /** The bold part — "123 Main St". */
  primary: string
  /** The rest — "Springfield, IL, USA". */
  secondary: string
}

/** An address broken into the columns `customer_addresses` actually has. */
export type StructuredAddress = {
  address: string
  city: string
  state: string
  zip: string
}

export function placesAvailable(): boolean {
  return Boolean(envServer().GOOGLE_MAPS_API_KEY)
}

export async function autocompleteAddress(
  input: string,
  sessionToken: string,
): Promise<{ available: boolean; suggestions: Suggestion[] }> {
  const key = envServer().GOOGLE_MAPS_API_KEY
  if (!key) return { available: false, suggestions: [] }
  if (input.trim().length < 3) return { available: true, suggestions: [] }

  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({
        input,
        sessionToken,
        // Street addresses only. A contractor is quoting work at a building,
        // so restaurants and cities are noise in this list.
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
        includedRegionCodes: ['us', 'ca'],
      }),
    })

    if (!res.ok) {
      console.error('places autocomplete failed', res.status, await res.text().catch(() => ''))
      return { available: false, suggestions: [] }
    }

    const data = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
        }
      }[]
    }

    const suggestions = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .map((p) => ({
        placeId: p.placeId as string,
        primary: p.structuredFormat?.mainText?.text ?? '',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      }))

    return { available: true, suggestions }
  } catch (e) {
    console.error('places autocomplete threw', e)
    return { available: false, suggestions: [] }
  }
}

/**
 * The chosen address, in components.
 *
 * This call is what closes the billing session, so it must carry the same token
 * the autocomplete requests used.
 */
export async function addressDetails(
  placeId: string,
  sessionToken: string,
): Promise<StructuredAddress | null> {
  const key = envServer().GOOGLE_MAPS_API_KEY
  if (!key) return null

  try {
    const res = await fetch(`${DETAILS_URL}/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        // Billed by field set, so ask only for what lands in the columns.
        'X-Goog-FieldMask': 'addressComponents,formattedAddress',
      },
    })

    if (!res.ok) {
      console.error('places details failed', res.status, await res.text().catch(() => ''))
      return null
    }

    const data = (await res.json()) as {
      formattedAddress?: string
      addressComponents?: { longText?: string; shortText?: string; types?: string[] }[]
    }

    return toStructured(data.addressComponents ?? [], data.formattedAddress ?? '')
  } catch (e) {
    console.error('places details threw', e)
    return null
  }
}

/**
 * Google's component list flattened into four fields.
 *
 * Exported for testing: the mapping is the part that quietly goes wrong, and it
 * is pure.
 */
export function toStructured(
  components: { longText?: string; shortText?: string; types?: string[] }[],
  formatted: string,
): StructuredAddress {
  const find = (type: string, short = false) => {
    const c = components.find((x) => x.types?.includes(type))
    return (short ? c?.shortText : c?.longText) ?? ''
  }

  const streetNumber = find('street_number')
  const route = find('route')
  const subpremise = find('subpremise')

  let address = [streetNumber, route].filter(Boolean).join(' ')
  if (subpremise) address = address ? `${address} #${subpremise}` : `#${subpremise}`

  // Some addresses carry no street_number/route at all — rural routes, plus
  // codes. Falling back to the formatted string's first segment beats storing
  // an empty street line.
  if (!address) address = formatted.split(',')[0]?.trim() ?? ''

  return {
    address,
    // `locality` is absent for unincorporated areas, where the postal town
    // lives under one of these instead.
    city:
      find('locality') ||
      find('postal_town') ||
      find('sublocality') ||
      find('administrative_area_level_3'),
    // Short: "IL", not "Illinois". Sales tax tables key on the code.
    state: find('administrative_area_level_1', true),
    zip: find('postal_code'),
  }
}
