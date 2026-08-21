import { unstable_cache } from 'next/cache'

/**
 * Snapshots from the outside services, for /admin. Each fetch is cached for
 * five minutes and runs only when an admin loads the page — no polling, no
 * background load. Unconfigured or failing providers report exactly that.
 */

const TTL = 300

export type ProviderCard =
  | { state: 'unconfigured'; hint: string }
  | { state: 'error'; error: string }
  | { state: 'ok'; lines: { label: string; value: string }[] }

// --- Vercel -----------------------------------------------------------------

export const vercelSnapshot = unstable_cache(
  async (): Promise<ProviderCard> => {
    const token = process.env.VERCEL_API_TOKEN?.trim()
    if (!token) return { state: 'unconfigured', hint: 'Set VERCEL_API_TOKEN' }
    try {
      const res = await fetch(
        'https://api.vercel.com/v6/deployments?slug=getrivet&app=rivet&target=production&limit=5',
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return { state: 'error', error: `Vercel API ${res.status}` }
      const data = (await res.json()) as {
        deployments: { state: string; created: number; meta?: { githubCommitMessage?: string } }[]
      }
      const d = data.deployments ?? []
      const latest = d[0]
      const failing = d.filter((x) => x.state === 'ERROR').length
      return {
        state: 'ok',
        lines: [
          { label: 'Latest deploy', value: latest ? `${latest.state.toLowerCase()} · ${ago(latest.created)}` : '—' },
          { label: 'Commit', value: latest?.meta?.githubCommitMessage?.slice(0, 60) ?? '—' },
          { label: 'Failed of last 5', value: String(failing) },
        ],
      }
    } catch (e) {
      return { state: 'error', error: e instanceof Error ? e.message : 'fetch failed' }
    }
  },
  ['admin-vercel'],
  { revalidate: TTL },
)

// --- Sentry -----------------------------------------------------------------

export const sentrySnapshot = unstable_cache(
  async (): Promise<ProviderCard> => {
    const token = process.env.SENTRY_API_TOKEN?.trim()
    if (!token) return { state: 'unconfigured', hint: 'Set SENTRY_API_TOKEN' }
    try {
      const res = await fetch(
        'https://sentry.io/api/0/projects/rivet-technologies/javascript-nextjs/issues/?statsPeriod=24h&query=is%3Aunresolved&limit=5',
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return { state: 'error', error: `Sentry API ${res.status}` }
      const issues = (await res.json()) as { title: string; count: string; lastSeen: string }[]
      if (!issues.length) return { state: 'ok', lines: [{ label: 'Unresolved · 24h', value: '0 — quiet' }] }
      return {
        state: 'ok',
        lines: [
          { label: 'Unresolved · 24h', value: String(issues.length) + (issues.length === 5 ? '+' : '') },
          ...issues.slice(0, 3).map((i) => ({
            label: `×${i.count}`,
            value: i.title.slice(0, 70),
          })),
        ],
      }
    } catch (e) {
      return { state: 'error', error: e instanceof Error ? e.message : 'fetch failed' }
    }
  },
  ['admin-sentry'],
  { revalidate: TTL },
)

// --- PostHog ----------------------------------------------------------------

export const posthogSnapshot = unstable_cache(
  async (): Promise<ProviderCard> => {
    const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim()
    const project = process.env.POSTHOG_PROJECT_ID?.trim()
    if (!key || !project)
      return { state: 'unconfigured', hint: 'Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID' }
    try {
      const res = await fetch(`https://us.posthog.com/api/projects/${project}/query/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: {
            kind: 'HogQLQuery',
            query:
              "select count(), count(distinct person_id) from events where event = '$pageview' and timestamp > now() - interval 1 day",
          },
        }),
      })
      if (!res.ok) return { state: 'error', error: `PostHog API ${res.status}` }
      const data = (await res.json()) as { results?: [number, number][] }
      const [views, people] = data.results?.[0] ?? [0, 0]
      return {
        state: 'ok',
        lines: [
          { label: 'Pageviews · 24h', value: String(views) },
          { label: 'Unique visitors · 24h', value: String(people) },
        ],
      }
    } catch (e) {
      return { state: 'error', error: e instanceof Error ? e.message : 'fetch failed' }
    }
  },
  ['admin-posthog'],
  { revalidate: TTL },
)

function ago(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}
