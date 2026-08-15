import * as Sentry from '@sentry/nextjs'

import { env } from '@/lib/env'

/**
 * Server-side error reporting.
 *
 * Degrades like everything else here: with no DSN this initialises nothing and
 * the app runs exactly as before. That matters because the alternative — an
 * observability layer that throws when unconfigured — is a new way to take
 * production down.
 *
 * This exists because production was invisible. `removeConsole` was stripping
 * `console.error`, so there were no diagnostics at all; the middleware matcher
 * was redirecting every `/api/*` route to `/login`, so Stripe webhooks had
 * never once been delivered; and Gemini credits ran out so every quote silently
 * became keyword matching. All three were found by a person going to look.
 */

export async function register() {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return

  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Money and customer data pass through this app; sampling traces is fine,
    // but nothing that could carry a quote body should leave by default.
    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
  })
}

/**
 * Every server error Next catches, including ones React swallowed during a
 * Server Component render.
 */
export const onRequestError = Sentry.captureRequestError
