'use server'

import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { workItemScope } from '@/lib/auth/scope'
import type { UserRole } from '@/lib/permissions'
import { query } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { signPhotoUrl, signPhotoUrls } from '@/lib/storage/signed-url'
import { tagJobPhoto } from '@/lib/ai/photo-tags'

/**
 * Photos on quotes.
 *
 * Housecall Pro sells "estimates with photos to improve conversion." Ours
 * attach to a line item rather than the quote as a whole — a picture of the
 * failing compressor belongs beside the compressor line, where it answers the
 * question the price raises.
 */

const BUCKET = 'quote-photos'
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_PER_QUOTE = 20

export type QuotePhoto = {
  id: string
  url: string
  caption: string | null
  quote_item_id: string | null
  sort_order: number
  tags: string[]
  in_showcase: boolean
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export async function uploadQuotePhoto(formData: FormData): Promise<Result<QuotePhoto>> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  const { companyId } = session

  const workItemId = String(formData.get('work_item_id') ?? '')
  const rawItemId = formData.get('quote_item_id')
  const quoteItemId = rawItemId ? String(rawItemId) : null

  if (!z.string().uuid().safeParse(workItemId).success) {
    return { ok: false, error: 'Invalid quote' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose a photo.' }
  }
  if (!ACCEPTED.includes(file.type)) {
    return { ok: false, error: 'That file type is not supported. Use a JPG, PNG or HEIC.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `That photo is over ${MAX_BYTES / 1024 / 1024}MB.` }
  }

  // The work item must belong to the caller — pg bypasses RLS, so this is the
  // check that matters, not the storage policy.
  const owns = await query<{ id: string }>(
    'select id from work_items where id = $1 and company_id = $2 limit 1',
    [workItemId, companyId],
  )
  if (!owns[0]) return { ok: false, error: 'Quote not found' }

  // A line item, if given, has to belong to the same quote — otherwise a photo
  // could be attached across quotes by passing an id from another one.
  if (quoteItemId) {
    const line = await query<{ id: string }>(
      'select id from quote_items where id = $1 and work_item_id = $2 limit 1',
      [quoteItemId, workItemId],
    )
    if (!line[0]) return { ok: false, error: 'Line item not found on this quote' }
  }

  const [{ count }] = await query<{ count: number }>(
    'select count(*)::int as count from quote_photos where work_item_id = $1 and company_id = $2',
    [workItemId, companyId],
  )
  if (count >= MAX_PER_QUOTE) {
    return { ok: false, error: `A quote can carry ${MAX_PER_QUOTE} photos.` }
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'jpg'
  // Tenant first, so the storage policy can authorise on the path alone.
  const path = `${companyId}/${workItemId}/${randomUUID()}.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    })
  if (uploadError) {
    console.error('uploadQuotePhoto storage failed', uploadError)
    return { ok: false, error: 'Could not upload that photo. Try again.' }
  }

  let row: { id: string; sort_order: number } | undefined
  try {
    const rows = await query<{ id: string; sort_order: number }>(
      `insert into quote_photos
         (company_id, work_item_id, quote_item_id, storage_path, sort_order, created_by)
       values ($1, $2, $3, $4, $5, $6)
       returning id, sort_order`,
      [companyId, workItemId, quoteItemId, path, count, session.userId],
    )
    row = rows[0]
  } catch (e) {
    // Don't leave the object orphaned in the bucket if the row failed.
    await admin.storage.from(BUCKET).remove([path])
    console.error('uploadQuotePhoto insert failed', e)
    return { ok: false, error: 'Could not save that photo. Try again.' }
  }
  if (!row) return { ok: false, error: 'Could not save that photo.' }

  // Describe the photo after the response — a vision call per upload should not
  // make the contractor wait. Tags populate on the next render; a failure just
  // leaves the photo untagged, never blocks the upload.
  const photoId = row.id
  const bytes = Buffer.from(await file.arrayBuffer())
  const mime = file.type
  after(async () => {
    try {
      const tags = await tagJobPhoto({ data: bytes, mimeType: mime })
      await query(
        `update quote_photos set tags = $1, tagged_at = now() where id = $2 and company_id = $3`,
        [tags, photoId, companyId],
      )
    } catch (e) {
      console.error('photo tagging failed', e)
    }
  })

  revalidatePath(`/app/pipeline/${workItemId}`)

  const signed = await signPhotoUrl(path)
  return {
    ok: true,
    data: {
      id: row.id,
      url: signed,
      caption: null,
      quote_item_id: quoteItemId,
      sort_order: row.sort_order,
      tags: [],
      in_showcase: false,
    },
  }
}

/** Add or remove a photo from the company's showcase portfolio. */
export async function togglePhotoShowcase(input: unknown): Promise<Result<{ in_showcase: boolean }>> {
  const parsed = z.object({ id: z.string().uuid(), in_showcase: z.boolean() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input' }
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const rows = await query<{ work_item_id: string }>(
    `update quote_photos set in_showcase = $1
      where id = $2 and company_id = $3
      returning work_item_id`,
    [parsed.data.in_showcase, parsed.data.id, session.companyId],
  )
  if (!rows[0]) return { ok: false, error: 'Photo not found' }
  revalidatePath(`/app/pipeline/${rows[0].work_item_id}`)
  revalidatePath('/app/portfolio')
  return { ok: true, data: { in_showcase: parsed.data.in_showcase } }
}

export async function deleteQuotePhoto(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid photo' }

  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const rows = await query<{ id: string; storage_path: string; work_item_id: string }>(
    `delete from quote_photos
      where id = $1 and company_id = $2
      returning id, storage_path, work_item_id`,
    [parsed.data.id, session.companyId],
  )
  const photo = rows[0]
  if (!photo) return { ok: false, error: 'Photo not found' }

  // The row is the record; a leftover object costs storage but cannot show a
  // customer anything, so a failure here is logged rather than surfaced.
  const { error } = await createAdminClient().storage.from(BUCKET).remove([photo.storage_path])
  if (error) console.error('deleteQuotePhoto storage remove failed', error)

  revalidatePath(`/app/pipeline/${photo.work_item_id}`)
  return { ok: true, data: { id: photo.id } }
}

/**
 * Photos for a quote, with signed URLs resolved.
 *
 * The company is taken from the session, never from a caller argument. This is
 * an exported `'use server'` function, so it is reachable by a direct POST from
 * any signed-in user regardless of which route imports it — passing the tenant
 * in was a cross-tenant read: a user in company B, holding company A's work_item
 * id and company id (both are handed to anyone who opens a /q/{token} link),
 * could retrieve signed URLs to photographs of the inside of company A's
 * customers' homes. Scope it exactly as the detail page does — company, then
 * role — so it can only ever return photos the caller is already allowed to see.
 */
export async function listQuotePhotos(workItemId: string): Promise<QuotePhoto[]> {
  const session = await getSession()
  if (!session) return []
  const { companyId, userId, role } = session

  // The work item must be visible to this caller under their role — the same
  // gate the detail page applies before it renders. A technician cannot read
  // photos on a job they were never assigned to, in their own company or any
  // other.
  const scope = workItemScope({ companyId, userId, role: role as UserRole }, 2)
  const [owns] = await query<{ id: string }>(
    `select id from work_items
      where id = $1 and company_id = $2${scope.sql}
      limit 1`,
    [workItemId, companyId, ...scope.params],
  )
  if (!owns) return []

  const rows = await query<{
    id: string
    storage_path: string
    caption: string | null
    quote_item_id: string | null
    sort_order: number
    tags: string[]
    in_showcase: boolean
  }>(
    `select id, storage_path, caption, quote_item_id, sort_order, tags, in_showcase
       from quote_photos
      where work_item_id = $1 and company_id = $2
      order by sort_order, created_at`,
    [workItemId, companyId],
  )

  // One batched signing call rather than one per photo — a quote can carry
  // twenty, and this page already waits on the database.
  const signedUrls = await signPhotoUrls(rows.map((r) => r.storage_path))

  return rows.map((r) => ({
    id: r.id,
    url: signedUrls.get(r.storage_path) ?? '',
    caption: r.caption,
    quote_item_id: r.quote_item_id,
    sort_order: r.sort_order,
    tags: r.tags ?? [],
    in_showcase: r.in_showcase ?? false,
  }))
}

export type ShowcasePhoto = { id: string; url: string; tags: string[]; created_at: string }

/**
 * Every photo the company has opted into its showcase, newest first. Session-
 * scoped to the caller's company; shown on the internal portfolio the
 * contractor pulls up in front of a prospect.
 */
export async function listShowcasePhotos(): Promise<ShowcasePhoto[]> {
  const session = await getSession()
  if (!session) return []
  const rows = await query<{ id: string; storage_path: string; tags: string[]; created_at: string }>(
    `select id, storage_path, tags, created_at
       from quote_photos
      where company_id = $1 and in_showcase
      order by created_at desc
      limit 300`,
    [session.companyId],
  )
  const signed = await signPhotoUrls(rows.map((r) => r.storage_path))
  return rows.map((r) => ({
    id: r.id,
    url: signed.get(r.storage_path) ?? '',
    tags: r.tags ?? [],
    created_at: r.created_at,
  }))
}
