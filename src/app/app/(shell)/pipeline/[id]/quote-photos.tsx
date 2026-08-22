'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Plus, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { deleteQuotePhoto, setPhotoUserTags, togglePhotoShowcase, uploadQuotePhoto, type QuotePhoto } from './photo-actions'

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
  embedded = false,
}: {
  workItemId: string
  photos: QuotePhoto[]
  lineItems: { id: string; name: string }[]
  /** Renders as a field inside the Details card instead of its own card. */
  embedded?: boolean
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

  function saveUserTags(id: string, tags: string[]) {
    startUpload(async () => {
      const res = await setPhotoUserTags({ id, tags })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      router.refresh()
    })
  }

  function toggleShowcase(photo: QuotePhoto) {
    startUpload(async () => {
      const res = await togglePhotoShowcase({ id: photo.id, in_showcase: !photo.in_showcase })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(photo.in_showcase ? 'Removed from portfolio' : 'Added to portfolio')
      router.refresh()
    })
  }

  const labelFor = (photo: QuotePhoto) =>
    photo.quote_item_id ? lineItems.find((l) => l.id === photo.quote_item_id)?.name : null

  return (
    <section className={embedded ? '' : 'rounded-xl border border-border/70 bg-card shadow-sm'}>
      <header
        className={
          embedded
            ? 'flex flex-wrap items-center justify-between gap-2'
            : photos.length === 0
              ? 'flex flex-wrap items-center justify-between gap-2 px-5 py-3.5'
              : 'flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5'
        }
      >
        <div className="flex items-center gap-2">
          {!embedded && <Camera className="h-4 w-4 text-muted-foreground" />}
          <h2 className={embedded ? 'text-xs font-medium text-muted-foreground' : 'text-sm font-semibold'}>
            Photos
          </h2>
          {photos.length === 0 && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              — the customer sees these on the quote
            </span>
          )}
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

      {/* Empty means one slim row, not a card of empty space — this section
          sat between the contractor and the Send button. The pitch line
          rides the header as a title attribute-sized hint instead. */}
      {photos.length === 0 ? null : (
        <div
          className={
            embedded
              ? 'mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4'
              : 'grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4'
          }
        >
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
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  <button
                    onClick={() => toggleShowcase(photo)}
                    disabled={uploading}
                    aria-label={photo.in_showcase ? 'Remove from portfolio' : 'Add to portfolio'}
                    title={photo.in_showcase ? 'In your portfolio' : 'Add to portfolio'}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md bg-background/90 shadow-sm',
                      photo.in_showcase ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500',
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', photo.in_showcase && 'fill-current')} />
                  </button>
                  <button
                    onClick={() => remove(photo.id)}
                    disabled={uploading}
                    aria-label="Remove photo"
                    className="grid h-8 w-8 place-items-center rounded-md bg-background/90 text-muted-foreground shadow-sm hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <figcaption className="space-y-1.5 border-t border-border/70 bg-muted/40 px-2 py-1.5">
                  {line && <div className="truncate text-[11px] text-muted-foreground">{line}</div>}
                  <PhotoTags photo={photo} disabled={uploading} onSave={saveUserTags} />
                </figcaption>
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** User tags (editable, prominent) + AI tags (muted) for one photo. */
function PhotoTags({
  photo,
  disabled,
  onSave,
}: {
  photo: QuotePhoto
  disabled: boolean
  onSave: (id: string, tags: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const aiOnly = photo.tags.filter((t) => !photo.user_tags.includes(t))

  function commit() {
    const t = value.trim().toLowerCase()
    setValue('')
    setAdding(false)
    if (!t || photo.user_tags.includes(t)) return
    onSave(photo.id, [...photo.user_tags, t])
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {photo.user_tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-px text-[10px] capitalize text-primary"
        >
          {t}
          <button
            onClick={() => onSave(photo.id, photo.user_tags.filter((x) => x !== t))}
            disabled={disabled}
            aria-label={`Remove tag ${t}`}
            className="hover:text-destructive"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {aiOnly.slice(0, 4).map((t) => (
        <span key={t} className="rounded bg-background px-1 py-px text-[10px] capitalize text-muted-foreground">
          {t}
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setValue(''); setAdding(false) }
          }}
          placeholder="tag"
          className="h-5 w-16 rounded border border-input bg-background px-1 text-[10px]"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          disabled={disabled}
          className="inline-flex items-center gap-0.5 rounded border border-dashed border-border px-1 py-px text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" /> tag
        </button>
      )}
    </div>
  )
}
