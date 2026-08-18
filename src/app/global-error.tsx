'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Last-resort boundary for a throw in the root layout itself.
 *
 * A route-level error.tsx renders *inside* the layout, so it cannot catch an
 * error the layout threw. global-error replaces the whole document — which is
 * why it has to ship its own <html>/<body> — and is the only thing standing
 * between a root-layout failure and a blank white page.
 *
 * Kept deliberately minimal and dependency-free: no design tokens, no shared
 * components, because the thing that failed may be the very code that provides
 * them. Inline styles so it renders even if the stylesheet never loaded.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error('root layout failed', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff',
          color: '#111',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: '#555' }}>
            The page didn’t load. Reloading usually fixes it.
          </p>
          <a
            href="/app"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              padding: '0.7rem 1.5rem',
              borderRadius: '0.5rem',
              background: '#111',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Go to Rivet
          </a>
        </div>
      </body>
    </html>
  )
}
