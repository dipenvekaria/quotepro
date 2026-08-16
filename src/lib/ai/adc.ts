import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Make the service account visible to Application Default Credentials.
 *
 * `@google/genai` accepts credentials as an object, so the rest of the AI code
 * passes `GOOGLE_SERVICE_ACCOUNT_JSON` straight through. ADK does not: its
 * `Gemini` class takes model, project and location but no credentials, and
 * falls back to ADC — which looks for a *file path* in
 * `GOOGLE_APPLICATION_CREDENTIALS`. With the key held inline in an env var, ADC
 * finds nothing and Vertex answers `invalid_grant`, which reads like an expired
 * key rather than a missing one and sends you looking in the wrong place.
 *
 * So the JSON is written to a file once per process and the path exported. On
 * Vercel the only writable location is the temp directory, which is per-instance
 * and disappears with it — correct for a credential, and cheap enough that
 * Fluid Compute's warm instances pay it approximately never.
 *
 * Does nothing when `GOOGLE_APPLICATION_CREDENTIALS` is already set, or when
 * running somewhere ADC works natively — a GCP runtime has a metadata server and
 * needs none of this.
 */

let prepared = false

export function ensureAdc(): void {
  if (prepared) return
  prepared = true

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return

  try {
    // The env var holds base64 in this project and plain JSON in some setups.
    // Accept both rather than requiring whoever sets it to know which — the
    // failure mode otherwise is Vertex answering `invalid_grant`, which reads
    // like an expired key and sends you looking in entirely the wrong place.
    const json = raw.trimStart().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8')

    // Parse before writing, so a malformed value fails here — where the message
    // names the env var — rather than inside a Google library.
    JSON.parse(json)
    const dir = mkdtempSync(join(tmpdir(), 'rivet-adc-'))
    const path = join(dir, 'sa.json')
    writeFileSync(path, json, { mode: 0o600 })
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path
  } catch (e) {
    // Never throw. Quoting degrades to the keyword path without credentials;
    // it must not fail to start because of them.
    console.error('could not prepare ADC from GOOGLE_SERVICE_ACCOUNT_JSON', e)
  }
}
