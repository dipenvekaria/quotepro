// @ts-nocheck - Supabase type generation pending
import { useMemo } from 'react'
import { isToday, parseISO } from 'date-fns'
import { useDashboard } from '@/lib/dashboard-context'

export function useHomeStats() {
  const { quotes } = useDashboard()

  const stats = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return {
        leads: 0,
        quotes: 0,
        scheduledToday: 0,
        totalRevenue: 0,
        pendingRevenue: 0
      }
    }

    const scheduledToday = quotes.filter(q => {
      if (!q.scheduled_at) return false
      try {
        return isToday(parseISO(q.scheduled_at))
      } catch {
        return false
      }
    })

    return {
      leads: quotes.filter(q => 
        ['new', 'contacted', 'quote_visit_scheduled'].includes(q.lead_status) && 
        (!q.total || q.total === 0)
      ).length,
      quotes: quotes.filter(q => 
        (['quoted', 'lost'].includes(q.lead_status) || (q.total && q.total > 0)) &&
        !q.accepted_at && !q.signed_at
      ).length,
      scheduledToday: scheduledToday.length,
      totalRevenue: quotes
        .filter(q => q.paid_at)
        .reduce((sum, q) => sum + (q.total || 0), 0),
      pendingRevenue: quotes
        .filter(q => q.completed_at && !q.paid_at)
        .reduce((sum, q) => sum + (q.total || 0), 0)
    }
  }, [quotes])

  return stats
}
