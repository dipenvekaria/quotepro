/**
 * Sentry Configuration
 * Hybrid monitoring approach - critical errors only
 */

// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// Commented out - @sentry/nextjs not installed
/*
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0, // Capture 100% of errors with session replay
  replaysSessionSampleRate: 0.01, // Sample 1% of normal sessions

  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out certain errors
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV !== 'production') {
      return null
    }

    // Filter out non-critical errors
    const error = hint.originalException
    
    // Ignore network errors (handled by our NetworkStatus component)
    if (error && typeof error === 'object' && 'message' in error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNREFUSED')
      ) {
        return null
      }
    }

    return event
  },

  // Add user context
  beforeSendTransaction(event) {
    // Don't send in development
    if (process.env.NODE_ENV !== 'production') {
      return null
    }
    return event
  },
})
*/
