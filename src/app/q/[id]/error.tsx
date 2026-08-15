'use client'

import { useEffect } from 'react'

/**
 * When a quote fails to load for the customer.
 *
 * The app-wide boundary offers "Go to Dashboard", which is meaningless to a
 * homeowner: they have no account, no dashboard, and no idea what one is. They
 * have a quote for thousands of dollars and a page that just broke, and the only
 * recovery that actually exists for them is to ring the contractor.
 *
 * The contractor's details live on the quote we failed to load, so we cannot
 * show them. What we can do is not pretend this is their fault, not use words
 * like "error" and "dashboard", and tell them the quote is safe.
 */
export default function QuoteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('public quote view failed', error)
  }, [error])

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This quote didn’t load
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Something went wrong at our end, not yours. Your quote is safe and the link still
          works — trying again usually does it.
        </p>

        <button
          onClick={reset}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 sm:w-auto"
        >
          Try again
        </button>

        <p className="mt-8 text-sm text-muted-foreground">
          Still not working? Contact the company that sent you this quote — they can resend it or
          go through the details with you over the phone.
        </p>
      </div>
    </main>
  )
}
