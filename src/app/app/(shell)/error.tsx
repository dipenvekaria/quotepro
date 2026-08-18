'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

/**
 * When a signed-in page throws.
 *
 * Without this file, any throw in a Server Component under the app shell — most
 * often a brief database blip, since reads hit `pg` directly — renders Next's
 * default "Application error: a server-side exception has occurred", which reads
 * as the product being broken rather than a page needing a retry.
 *
 * This is the boundary the public quote error page refers to: a contractor has
 * an account and a dashboard, so "Try again" and a way back to safe ground are
 * both meaningful here in a way they are not for a homeowner.
 *
 * Reported to Sentry so a spike of these is visible; degrades to a noop when no
 * DSN is set, like the rest of the observability layer.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('app view failed', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          This page didn’t load. It’s usually a brief hiccup at our end — trying again normally
          clears it. Nothing you were working on is lost.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium text-foreground hover:bg-muted"
          >
            Go to dashboard
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-8 text-xs text-muted-foreground">
            If it keeps happening, quote this reference to support: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  )
}
