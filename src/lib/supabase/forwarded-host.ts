const ALLOWED_HOSTS = new Set([
  'getrivet.ai',
  'www.getrivet.ai',
  'thefieldgenie.com',
  'www.thefieldgenie.com',
])

/** The forwarded host if we recognise it, else null (fall back to the real host). */
export function safeForwardedHost(host: string | null): string | null {
  if (!host) return null
  const bare = host.split(':')[0]
  if (ALLOWED_HOSTS.has(host) || ALLOWED_HOSTS.has(bare)) return host
  if (bare === 'localhost' || bare === '127.0.0.1') return host
  if (bare.endsWith('.vercel.app')) return host
  return null
}
