import * as Sentry from '@sentry/nextjs'

import { env } from '@/lib/env'

/**
 * Browser-side error reporting. No DSN, no client — see src/instrumentation.ts.
 */
if (env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // The public quote viewer is a stranger's first impression of the
    // contractor. Session replay there would record a customer reading their
    // own prices, so it stays off until there is a reason and a policy.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
