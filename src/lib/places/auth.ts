import { GoogleAuth } from 'google-auth-library'

import { envServer } from '@/lib/env'
import { serviceAccountCredentials } from '@/lib/google/credentials'

/**
 * How we authenticate to Google Maps Platform.
 *
 * Two credentials are supported and the service account wins when both are set.
 *
 * A service account is not a value you can paste into an env var. What you hold
 * is a private key, and what the API wants is an access token minted from it
 * that expires in about an hour — so the token has to be produced at runtime
 * and refreshed. `GoogleAuth` handles the refresh and caches internally; the
 * client is built once per process so that cache survives between requests on a
 * warm function.
 *
 * The JSON is stored base64-encoded because the private key inside it contains
 * literal newlines, and env vars carrying raw newlines get mangled by roughly
 * every dashboard and shell that touches them.
 */

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

let _auth: GoogleAuth | null = null
let _authFailed = false

/**
 * The Authorization/API-key header for a Maps request, or null when nothing is
 * configured — in which case the caller degrades to a plain text field.
 */
export async function placesAuthHeaders(): Promise<Record<string, string> | null> {
  const credentials = serviceAccountCredentials()

  if (credentials && !_authFailed) {
    try {
      _auth ??= new GoogleAuth({ credentials, scopes: [SCOPE] })
      const client = await _auth.getClient()
      const token = await client.getAccessToken()
      if (token?.token) return { Authorization: `Bearer ${token.token}` }
      console.error('places: service account returned no access token')
    } catch (e) {
      // Do not retry a bad key on every keystroke — one clear log, then fall
      // through to the API key if there is one.
      _authFailed = true
      console.error('places: could not mint a token from the service account', e)
    }
  }

  const key = envServer().GOOGLE_MAPS_API_KEY
  if (key) return { 'X-Goog-Api-Key': key }

  return null
}

/** Whether any Maps credential is configured at all. */
export function placesConfigured(): boolean {
  return Boolean(envServer().GOOGLE_SERVICE_ACCOUNT_JSON || envServer().GOOGLE_MAPS_API_KEY)
}
