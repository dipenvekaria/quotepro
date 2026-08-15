import { envServer } from '@/lib/env'

/**
 * The Google service-account key, parsed once.
 *
 * Shared by Places and by Gemini-over-Vertex, which is why it lives here rather
 * than inside either of them.
 *
 * Stored base64-encoded because the private key inside contains literal
 * newlines, and env vars carrying raw newlines get mangled by roughly every
 * dashboard and shell that touches them. Raw JSON is accepted too — someone
 * will paste it unencoded eventually, and a silent failure there looks exactly
 * like the feature being broken.
 */
export type ServiceAccountKey = { client_email: string; private_key: string } & Record<
  string,
  unknown
>

let _parsed: ServiceAccountKey | null | undefined

export function serviceAccountCredentials(): ServiceAccountKey | null {
  if (_parsed !== undefined) return _parsed

  const raw = envServer().GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return (_parsed = null)

  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(text) as ServiceAccountKey
    if (!parsed.client_email || !parsed.private_key) {
      console.error('GOOGLE_SERVICE_ACCOUNT_JSON parsed but has no client_email/private_key')
      return (_parsed = null)
    }
    return (_parsed = parsed)
  } catch (e) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON could not be decoded', e)
    return (_parsed = null)
  }
}
