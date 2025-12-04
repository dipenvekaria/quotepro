// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkJobCard } from '@/components/features/work/WorkJobCard'
import { useWorkJobs } from '@/hooks/useWorkJobs'
import { Calendar, Clock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function WorkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'to-schedule')
  
  const { 
    toBeScheduled, 
    scheduled, 
    handleCompleteJob,
    completingQuoteId 
  } = useWorkJobs()

  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // Navigate to calendar view for scheduling
  const handleScheduleClick = () => {
    router.push('/work/calendar')
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Work</h1>
              <p className="text-sm text-gray-600">Track scheduled jobs and completed work</p>
            </div>
            <button
              onClick={() => router.push('/work/calendar')}
              className="hidden md:flex h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 items-center gap-2 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Calendar View
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          router.push(`/work${value === 'scheduled' ? '?tab=scheduled' : ''}`)
        }} className="w-full">
          <TabsList className="md:hidden grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="to-schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">To be Scheduled</span>
              <span className="sm:hidden">To Schedule</span>
              <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {toBeScheduled.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
              <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {scheduled.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* To be Scheduled Tab */}
          <TabsContent value="to-schedule" className="space-y-4">
            {toBeScheduled.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm mb-2">No Jobs to Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Accepted or signed quotes will appear here when they need scheduling.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    📅 <strong>{toBeScheduled.length} job{toBeScheduled.length !== 1 ? 's' : ''}</strong> ready to schedule. 
                    Open the calendar to see team availability and drag jobs to schedule.
                  </p>
                </div>
                {toBeScheduled.map(quote => (
                  <WorkJobCard
                    key={quote.id}
                    quote={quote}
                    variant="to-schedule"
                    onSchedule={handleScheduleClick}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled" className="space-y-4">
            {scheduled.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm mb-2">No Scheduled Jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    Jobs with confirmed dates and times will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    🗓️ <strong>{scheduled.length} job{scheduled.length !== 1 ? 's' : ''}</strong> scheduled. 
                    Click Complete when the job is finished.
                  </p>
                </div>
                {scheduled.map(quote => (
                  <WorkJobCard
                    key={quote.id}
                    quote={quote}
                    variant="scheduled"
                    onComplete={handleCompleteJob}
                    isCompleting={completingQuoteId === quote.id}
                  />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
