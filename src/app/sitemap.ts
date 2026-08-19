import type { MetadataRoute } from 'next'

/** The indexable pages. Grows when the marketing site does. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://getrivet.ai/', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://getrivet.ai/login', changeFrequency: 'monthly', priority: 0.3 },
    { url: 'https://getrivet.ai/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { url: 'https://getrivet.ai/terms', changeFrequency: 'yearly', priority: 0.2 },
  ]
}
