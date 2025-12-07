// @ts-nocheck
'use client'

import { useEffect } from 'react'
import { TeamCalendar } from '@/components/calendar/TeamCalendar'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/use-user-role'
import { canViewCalendar } from '@/lib/roles'

export default function CalendarPage() {
  const router = useRouter()
  const { role, loading } = useUserRole()

  // Redirect technicians away from calendar - they use Work tab
  useEffect(() => {
    if (!loading && !canViewCalendar(role)) {
      router.replace('/work')
    }
  }, [role, loading, router])

  const handleEventClick = (eventId: string, type: 'quote_visit' | 'scheduled_job') => {
    if (type === 'scheduled_job') {
      router.push(`/quotes/new?id=${eventId}`)
    } else {
      router.push(`/leads/new?id=${eventId}`)
    }
  }

  // Show loading while checking role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // If technician, show nothing (will redirect)
  if (!canViewCalendar(role)) {
    return null
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-20 md:pb-0 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Calendar</h1>
            <p className="text-sm text-gray-600">Schedule jobs and assign to technicians</p>
          </div>
        </div>
      </header>

      {/* Calendar */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <TeamCalendar 
          mode="full"
          defaultView="team"
          onEventClick={handleEventClick}
        />
      </main>
    </div>
  )
}
