'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { deleteQuotePhoto, uploadQuotePhoto, type QuotePhoto } from './photo-actions'

/**
 * Photos on a quote.
 *
 * For a homeowner deciding on a five-figure job, a picture of *their* failing
 * unit is worth more than any amount of copy. Ours attach to a line item where
 * one is chosen, so "this is the compressor we're replacing" sits beside the
 * compressor line rather than in a gallery at the bottom.
 *
 * `capture="environment"` matters more than it looks: the contractor is
 * standing in front of the thing, and this opens the camera rather than a file
 * browser.
 */
export function QuotePhotos({
  workItemId,
  photos,
  lineItems,
}: {
  workItemId: string
  photos: QuotePhoto[]
  lineItems: { id: string; name: string }[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, startUpload] = useTransition()
  const [attachTo, setAttachTo] = useState<string>('')

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length === 0) return

    startUpload(async () => {
      let added = 0
      for (const file of files) {
        const fd = new FormData()
        fd.append('work_item_id', workItemId)
        fd.append('file', file)
        if (attachTo) fd.append('quote_item_id', attachTo)
        const res = await uploadQuotePhoto(fd)
        if (res.ok) added++
        // Report the first failure and stop — a wall of identical toasts for a
        // whole selection tells the contractor nothing extra.
        else {
          toast.error(res.error)
          break
        }
      }
      if (added > 0) {
        toast.success(`${added} photo${added === 1 ? '' : 's'} added`)
        router.refresh()
      }
    })
  }

  function remove(id: string) {
    startUpload(async () => {
      const res = await deleteQuotePhoto({ id })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      router.refresh()
    })
  }

  const labelFor = (photo: QuotePhoto) =>
    photo.quote_item_id ? lineItems.find((l) => l.id === photo.quote_item_id)?.name : null

  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Photos</h2>
          {photos.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
              {photos.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lineItems.length > 0 && (
            <select
              value={attachTo}
              onChange={(e) => setAttachTo(e.target.value)}
              disabled={uploading}
              aria-label="Attach the next photo to a line item"
              className="h-11 max-w-[13rem] rounded-md border border-input bg-background px-2 text-xs lg:h-9"
            >
              <option value="">Whole quote</option>
              {lineItems.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted lg:min-h-0 lg:py-1"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
            {uploading ? 'Adding…' : 'Add photos'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={onFiles}
            aria-label="Add photos to this quote"
          />
        </div>
      </header>

      {photos.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          A photo of the actual problem does more than any description. The customer sees these on
          their quote.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const line = labelFor(photo)
            return (
              <figure key={photo.id} className="group relative overflow-hidden rounded-lg border border-border/70">
                {/* Not next/image: these are user uploads on a public bucket,
                    and the optimiser would need the host allow-listed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? line ?? 'Quote photo'}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <button
                  onClick={() => remove(photo.id)}
                  disabled={uploading}
                  aria-label="Remove photo"
                  className={cn(
                    'absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-md bg-background/90 text-muted-foreground shadow-sm',
                    'hover:text-destructive',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {line && (
                  <figcaption className="truncate border-t border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    {line}
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}
