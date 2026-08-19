import type { MetadataRoute } from 'next'

/**
 * Public surface only. /q and /i are customers' quotes and invoices behind
 * unlisted tokens — a crawler that finds one (forwarded email, pasted link)
 * must not index someone's five-figure quote. Belt: disallow here; suspenders:
 * noindex robots meta on those layouts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/privacy', '/terms'],
        disallow: ['/app/', '/q/', '/i/', '/api/', '/auth/', '/join/'],
      },
    ],
    sitemap: 'https://getrivet.ai/sitemap.xml',
  }
}
