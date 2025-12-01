// @ts-nocheck - Supabase type generation pending
import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { format, isSameDay } from 'date-fns'

export function useCalendarSchedule() {
  const { quotes } = useDashboard()

  // Filter scheduled jobs only
  const scheduledJobs = useMemo(() => {
    return quotes
      .filter(q => q.scheduled_at)
      .map(q => ({
        id: q.id,
        date: new Date(q.scheduled_at),
        time: format(new Date(q.scheduled_at), 'h:mm a'),
        customer: q.customer_name || 'Unnamed Customer',
        address: q.customer_address,
        total: q.total,
        status: q.status,
        quote: q,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [quotes])

  // Get jobs for a specific day
  const getJobsForDay = (day: Date) => {
    return scheduledJobs.filter(job => isSameDay(job.date, day))
  }

  return {
    scheduledJobs,
    getJobsForDay
  }
}
