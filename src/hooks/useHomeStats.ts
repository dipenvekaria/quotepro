// @ts-nocheck - Supabase type generation pending
import { useMemo } from 'react'
import { isToday, parseISO } from 'date-fns'
import { useDashboard } from '@/lib/dashboard-context'

export function useHomeStats() {
  const { workItems } = useDashboard()

  const stats = useMemo(() => {
    if (!workItems || workItems.length === 0) {
      return {
        leads: 0,
        quotes: 0,
        scheduledToday: 0,
        totalRevenue: 0,
        pendingRevenue: 0
      }
    }

    const scheduledToday = workItems.filter(w => {
      if (!w.scheduled_at) return false
      try {
        return isToday(parseISO(w.scheduled_at))
      } catch {
        return false
      }
    })

    return {
      leads: workItems.filter(w => w.status === 'lead').length,
      quotes: workItems.filter(w => ['draft', 'sent', 'accepted'].includes(w.status)).length,
      scheduledToday: scheduledToday.length,
      totalRevenue: workItems
        .filter(w => w.paid_at)
        .reduce((sum, w) => sum + (w.total || 0), 0),
      pendingRevenue: workItems
        .filter(w => w.completed_at && !w.paid_at)
        .reduce((sum, w) => sum + (w.total || 0), 0)
    }
  }, [workItems])

  return stats
}
