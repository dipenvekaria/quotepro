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

/**
 * Product analytics — same contract as Sentry above: no key, no client.
 * Autocapture stays off on purpose: quotes and invoices are money screens,
 * and pageviews plus deliberate events answer everything worth asking.
 */
if (env.NEXT_PUBLIC_POSTHOG_KEY) {
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: 'history_change',
      autocapture: false,
      person_profiles: 'identified_only',
    })
  })
}
