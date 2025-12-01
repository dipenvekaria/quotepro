import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'

export function useAnalytics() {
  const { quotes } = useDashboard()

  // Calculate analytics
  const analytics = useMemo(() => {
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()
    
    const quotesThisMonth = quotes.filter(q => {
      const date = new Date(q.created_at)
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear
    })

    const sentQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'signed')
    const signedQuotes = quotes.filter(q => q.status === 'signed')
    const signedThisMonth = quotesThisMonth.filter(q => q.status === 'signed')
    
    const winRate = sentQuotes.length > 0 
      ? Math.round((signedQuotes.length / sentQuotes.length) * 100) 
      : 0

    const averageQuoteValue = quotes.length > 0
      ? Math.round(quotes.reduce((acc, q) => acc + q.total, 0) / quotes.length)
      : 0

    const totalRevenue = signedQuotes.reduce((acc, q) => acc + q.total, 0)

    const revenueThisMonth = signedThisMonth.reduce((acc, q) => acc + q.total, 0)

    // Status breakdown
    const statusCounts = {
      draft: quotes.filter(q => q.status === 'draft').length,
      sent: quotes.filter(q => q.status === 'sent').length,
      signed: quotes.filter(q => q.status === 'signed').length,
      declined: quotes.filter(q => q.status === 'declined').length,
    }

    return {
      quotesThisMonth,
      sentQuotes,
      signedQuotes,
      signedThisMonth,
      winRate,
      averageQuoteValue,
      totalRevenue,
      revenueThisMonth,
      statusCounts
    }
  }, [quotes])

  return {
    quotes,
    ...analytics
  }
}
