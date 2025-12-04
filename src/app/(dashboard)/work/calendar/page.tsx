// @ts-nocheck
'use client'

import { TeamCalendar } from '@/components/calendar/TeamCalendar'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function CalendarPage() {
  const router = useRouter()

  const handleEventClick = (eventId: string, type: 'quote_visit' | 'scheduled_job') => {
    if (type === 'scheduled_job') {
      router.push(`/quotes/new?id=${eventId}`)
    } else {
      router.push(`/leads/new?id=${eventId}`)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Team Calendar</h1>
              <p className="text-sm text-gray-600">Schedule jobs and quote visits</p>
            </div>
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
