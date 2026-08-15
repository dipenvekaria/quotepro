import { createAdminClient } from '@/lib/supabase/admin'

/**
 * A time-limited link to a quote photo.
 *
 * The bucket is private, so nothing here is readable without one of these. They
 * are minted server-side on every read — the contractor's detail page and the
 * customer's public quote both render fresh links, so an expiry is invisible in
 * normal use and fatal to a forwarded URL, which is the point.
 *
 * One hour: comfortably longer than anyone spends reading a quote, short enough
 * that a link pasted into a group chat is dead before it travels.
 */
export const PHOTO_URL_TTL_SECONDS = 60 * 60

export const PHOTO_BUCKET = 'quote-photos'

/**
 * Signs many paths in one call.
 *
 * Batched deliberately: a quote can carry twenty photos, and signing them one
 * at a time would be twenty round trips on a page that already waits on the
 * database.
 *
 * A path that fails to sign is returned with an empty URL rather than dropped —
 * the caller still knows the photo exists, and an image that does not load is a
 * better failure than a photo silently missing from a quote.
 */
export async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (paths.length === 0) return out

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, PHOTO_URL_TTL_SECONDS)

  if (error) {
    console.error('signPhotoUrls failed', error)
    for (const p of paths) out.set(p, '')
    return out
  }

  for (const row of data ?? []) {
    if (row.path) out.set(row.path, row.signedUrl ?? '')
  }
  // Anything the API did not return still needs an entry.
  for (const p of paths) if (!out.has(p)) out.set(p, '')

  return out
}

/** One path. Prefer `signPhotoUrls` when there is more than one. */
export async function signPhotoUrl(path: string): Promise<string> {
  return (await signPhotoUrls([path])).get(path) ?? ''
}
