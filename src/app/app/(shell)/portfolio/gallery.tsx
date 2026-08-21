'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ShowcasePhoto } from '../pipeline/[id]/photo-actions'

/**
 * The portfolio the contractor pulls up in front of a prospect. Tag chips (AI-
 * generated on upload) filter a large collection down fast; tapping a photo
 * opens it full-screen. Built for a phone or tablet held up to show someone.
 */
export function PortfolioGallery({ photos }: { photos: ShowcasePhoto[] }) {
  const [active, setActive] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<ShowcasePhoto | null>(null)

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of photos) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [photos])

  const shown = active ? photos.filter((p) => p.tags.includes(active)) : photos

  return (
    <div className="mt-6">
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActive(null)}
            className={cn(
              'h-9 rounded-full border px-3 text-sm transition-colors',
              active === null
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted',
            )}
          >
            All ({photos.length})
          </button>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t === active ? null : t)}
              className={cn(
                'h-9 rounded-full border px-3 text-sm capitalize transition-colors',
                active === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <button
            key={p.id}
            onClick={() => setLightbox(p)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.tags.join(', ') || 'Work photo'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur"
          onClick={() => setLightbox(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-card text-foreground shadow"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.tags.join(', ') || 'Work photo'}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            {lightbox.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {lightbox.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
