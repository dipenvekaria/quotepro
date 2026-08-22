/**
 * Content-Security-Policy for every HTML response. Nonce-based: framework and
 * our own inline scripts carry a per-request nonce, so no 'unsafe-inline' on
 * scripts. 'strict-dynamic' lets a nonce'd script load its own chunks.
 *
 * Directives sized to what the app actually loads: Supabase (auth + storage),
 * Stripe (redirect + api), Sentry and PostHog (telemetry), data/blob images
 * (logos, quote photos). Styles keep 'unsafe-inline' — style nonces are
 * disproportionate and styles are not a script-execution sink.
 */
// The Supabase origin comes from config, not a hardcoded wildcard: the
// wildcard list covers hosted projects, but local dev talks to
// http://127.0.0.1:54321 and a hardcoded https-only list silently blocked
// every local sign-in after CSP enforcement landed.
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return null
  }
})()

export function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : '',
  ].filter(Boolean)

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      ...(SUPABASE_ORIGIN ? [SUPABASE_ORIGIN] : []),
      'https://*.supabase.co',
      'https://*.supabase.in',
      'https://api.stripe.com',
      'https://*.ingest.sentry.io',
      'https://*.ingest.us.sentry.io',
      'https://us.i.posthog.com',
      'https://us-assets.i.posthog.com',
      ...(isDev ? ['ws:', 'wss:'] : []),
    ],
    'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com', 'https://checkout.stripe.com'],
    'worker-src': ["'self'", 'blob:'],
    'base-uri': ["'self'"],
    'form-action': ["'self'", 'https://checkout.stripe.com'],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
  }
  if (!isDev) directives['upgrade-insecure-requests'] = []

  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ')
}
