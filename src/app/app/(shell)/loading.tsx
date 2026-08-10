import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shown while any route under the app shell fetches on the server.
 *
 * One file covers every child route: without it the content area goes blank
 * during navigation, which reads as a broken tap — the reason people press a
 * nav item two or three times.
 *
 * Deliberately generic. It mirrors the shape every page shares (breadcrumb,
 * title, a block of content) rather than trying to match each layout, so it
 * cannot drift out of sync with the pages themselves.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div aria-hidden>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />

        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        Loading…
      </span>
    </div>
  )
}
