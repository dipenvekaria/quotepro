import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { Landing } from './landing'

export const metadata: Metadata = {
  title: 'Rivet — AI quoting for trade businesses',
  description:
    'Describe the job, get a quote built from your own price book in seconds. Scheduling, invoicing, payments, reviews, and QuickBooks sync — one price, everything included.',
  alternates: { canonical: '/' },
}

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  const code = params.code

  const supabase = await createClient()

  // Handle OAuth code exchange if present.
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app')

  // Signed-out visitors get the marketing page — the only indexable content
  // on the domain, and the thing the SEO plumbing exists to serve.
  return <Landing />
}
