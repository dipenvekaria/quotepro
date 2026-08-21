'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ShowcasePhoto } from '../pipeline/[id]/photo-actions'

/**
 * The portfolio the contractor pulls up in front of a prospect. Filter by tag
 * chip or free-text search; the contractor's own tags rank ahead of the AI's
 * everywhere — chips list them first, and a search hit on a user tag sorts
 * above a hit on an AI tag. Tapping a photo opens it full-screen.
 */
export function PortfolioGallery({ photos }: { photos: ShowcasePhoto[] }) {
  const [active, setActive] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [lightbox, setLightbox] = useState<ShowcasePhoto | null>(null)

  // Chips: the contractor's tags first (by frequency), then the AI's, deduped.
  const chips = useMemo(() => {
    const rank = (get: (p: ShowcasePhoto) => string[]) => {
      const counts = new Map<string, number>()
      for (const p of photos) for (const t of get(p)) counts.set(t, (counts.get(t) ?? 0) + 1)
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
    }
    const user = rank((p) => p.user_tags)
    const ai = rank((p) => p.tags).filter((t) => !user.includes(t))
    return { user, ai }
  }, [photos])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = photos
    if (active) list = list.filter((p) => p.user_tags.includes(active) || p.tags.includes(active))
    if (term) {
      // Score each photo: a user-tag match outweighs an AI-tag match.
      list = list
        .map((p) => {
          const inUser = p.user_tags.some((t) => t.includes(term))
          const inAi = p.tags.some((t) => t.includes(term))
          return { p, score: (inUser ? 2 : 0) + (inAi ? 1 : 0) }
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p)
    }
    return list
  }, [photos, active, q])

  return (
    <div className="mt-6">
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your work — your tags rank first"
          className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10"
        />
      </div>

      {(chips.user.length > 0 || chips.ai.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip label={`All (${photos.length})`} on={active === null && !q} onClick={() => { setActive(null); setQ('') }} />
          {chips.user.map((t) => (
            <Chip key={`u-${t}`} label={t} mine on={active === t} onClick={() => setActive(t === active ? null : t)} />
          ))}
          {chips.ai.map((t) => (
            <Chip key={`a-${t}`} label={t} on={active === t} onClick={() => setActive(t === active ? null : t)} />
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No photos match that.</p>
      ) : (
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
                alt={[...p.user_tags, ...p.tags].join(', ') || 'Work photo'}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

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
              alt={[...lightbox.user_tags, ...lightbox.tags].join(', ') || 'Work photo'}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            {(lightbox.user_tags.length > 0 || lightbox.tags.length > 0) && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {lightbox.user_tags.map((t) => (
                  <span key={`u-${t}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                    {t}
                  </span>
                ))}
                {lightbox.tags
                  .filter((t) => !lightbox.user_tags.includes(t))
                  .map((t) => (
                    <span key={`a-${t}`} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
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

function Chip({ label, on, mine, onClick }: { label: string; on: boolean; mine?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 rounded-full border px-3 text-sm capitalize transition-colors',
        on
          ? 'border-primary bg-primary text-primary-foreground'
          : mine
            ? 'border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10'
            : 'border-border hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}
