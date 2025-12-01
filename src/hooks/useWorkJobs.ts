import { useState } from 'react'
import { useDashboard } from '@/lib/dashboard-context'

export function useWorkJobs() {
  const { quotes, refreshQuotes } = useDashboard()
  const [completingQuoteId, setCompletingQuoteId] = useState<string | null>(null)

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

  return {
    toBeScheduled,
    scheduled,
    handleSchedule,
    handleCompleteJob,
    completingQuoteId
  }
}
