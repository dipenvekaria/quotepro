// @ts-nocheck - Supabase type generation pending
'use client'

import { HomeDashboard } from '@/components/home-dashboard'
import { useDashboard } from '@/lib/dashboard-context'

export default function HomePage() {
  const { company, quotes } = useDashboard()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HomeDashboard quotes={quotes} companyId={company.id} />
      </main>
    </div>
  )
}
