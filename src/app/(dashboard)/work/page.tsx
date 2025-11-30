// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { ScheduleJobModal } from '@/components/schedule-job-modal'
import { Calendar, MapPin, User, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function WorkPage() {
  const { quotes, refreshQuotes } = useDashboard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'to-schedule')
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<any>(null)
  const [completingQuoteId, setCompletingQuoteId] = useState<string | null>(null)

  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // Filter quotes for each tab
  const toBeScheduled = quotes.filter(q => 
    (q.status === 'accepted' || q.status === 'signed') && !q.scheduled_at
  )
  
  const scheduled = quotes.filter(q => 
    q.scheduled_at && !q.completed_at
  )
  
  const handleSchedule = async (quoteId: string, scheduledDate: Date) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledDate.toISOString() }),
      })

      if (!response.ok) throw new Error('Failed to schedule')

      await refreshQuotes()
    } catch (error) {
      console.error('Error scheduling quote:', error)
      throw error
    }
  }

  const handleCompleteJob = async (quoteId: string) => {
    if (!confirm('Mark this job as completed?')) return

    setCompletingQuoteId(quoteId)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString() }),
      })

      if (!response.ok) throw new Error('Failed to complete job')

      await refreshQuotes()
    } catch (error) {
      console.error('Error completing job:', error)
      alert('Failed to complete job. Please try again.')
    } finally {
      setCompletingQuoteId(null)
    }
  }

  const openScheduleModal = (quote: any) => {
    setSelectedQuote(quote)
    setScheduleModalOpen(true)
  }

  const renderToScheduleCard = (quote: any) => (
    <Card key={quote.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Customer Name & Quote Number */}
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
              <QuoteStatusBadge status={quote.status} size="sm" />
            </div>

            {/* Address */}
            {quote.customer_address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{quote.customer_address}</span>
              </div>
            )}

            {/* Quote Details */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-[#FF6200]">
                  ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-xs">{quote.quote_number}</span>
              </div>

              {quote.accepted_at && (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">
                    Accepted {format(new Date(quote.accepted_at), 'MMM d')}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {quote.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {quote.description}
              </p>
            )}
          </div>

          {/* Schedule Button */}
          <Button
            onClick={() => openScheduleModal(quote)}
            className="bg-[#FF6200] hover:bg-[#E55800] shrink-0"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderScheduledCard = (quote: any) => (
    <Card key={quote.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <Link href={`/quotes/new?id=${quote.id}`} className="flex-1">
            <div className="space-y-2">
              {/* Customer Name & Quote Number */}
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
                <QuoteStatusBadge status={quote.status} size="sm" />
              </div>

              {/* Address */}
              {quote.customer_address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{quote.customer_address}</span>
                </div>
              )}

              {/* Quote Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-[#FF6200]">
                    ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-xs">{quote.quote_number}</span>
                </div>

                {quote.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(quote.scheduled_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {quote.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quote.description}
                </p>
              )}
            </div>
          </Link>

          {/* Complete Button */}
          <Button
            onClick={() => handleCompleteJob(quote.id)}
            disabled={completingQuoteId === quote.id}
            variant="outline"
            className="shrink-0 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {completingQuoteId === quote.id ? 'Completing...' : 'Complete'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderQuoteCard = (quote: any) => (
    <Link key={quote.id} href={`/quotes/new?id=${quote.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Customer Name & Quote Number */}
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
                <QuoteStatusBadge status={quote.status} size="sm" />
              </div>

              {/* Address */}
              {quote.customer_address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{quote.customer_address}</span>
                </div>
              )}

              {/* Quote Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-[#FF6200]">
                    ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-xs">{quote.quote_number}</span>
                </div>

                {quote.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {format(new Date(quote.scheduled_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                )}

                {quote.accepted_at && !quote.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">
                      Accepted {format(new Date(quote.accepted_at), 'MMM d')}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {quote.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quote.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
        <div className="px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track scheduled jobs and completed work</p>
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
              <span className="ml-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                {toBeScheduled.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
              <span className="ml-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-semibold">
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
                  <h3 className="font-semibold text-lg mb-2">No Jobs to Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Accepted or signed quotes will appear here when they need scheduling.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    📅 <strong>{toBeScheduled.length} job{toBeScheduled.length !== 1 ? 's' : ''}</strong> ready to schedule. 
                    Click Schedule to pick a date and time.
                  </p>
                </div>
                {toBeScheduled.map(renderToScheduleCard)}
              </>
            )}
          </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled" className="space-y-4">
            {scheduled.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">No Scheduled Jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    Jobs with confirmed dates and times will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🗓️ <strong>{scheduled.length} job{scheduled.length !== 1 ? 's' : ''}</strong> scheduled. 
                    Click Complete when the job is finished.
                  </p>
                </div>
                {scheduled.map(renderScheduledCard)}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Schedule Modal */}
        {selectedQuote && (
          <ScheduleJobModal
            open={scheduleModalOpen}
            onOpenChange={setScheduleModalOpen}
            quote={selectedQuote}
            onSchedule={handleSchedule}
          />
        )}
      </main>
    </div>
  )
}
