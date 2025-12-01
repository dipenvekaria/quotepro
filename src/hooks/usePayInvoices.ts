import { useState } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { toast } from 'sonner'

export function usePayInvoices() {
  const { quotes, refreshQuotes } = useDashboard()
  const [payingQuoteId, setPayingQuoteId] = useState<string | null>(null)

  // Filter quotes for each tab
  const invoiceQuotes = quotes.filter(q => 
    q.completed_at && !q.paid_at
  )
  
  const paidQuotes = quotes.filter(q => 
    q.paid_at
  )

  const handleMarkAsPaid = async (quoteId: string) => {
    if (!confirm('Mark this invoice as paid?')) return

    setPayingQuoteId(quoteId)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_at: new Date().toISOString() }),
      })

      if (!response.ok) throw new Error('Failed to mark as paid')

      toast.success('Invoice marked as paid')
      await refreshQuotes()
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error('Failed to mark as paid. Please try again.')
    } finally {
      setPayingQuoteId(null)
    }
  }

  return {
    invoiceQuotes,
    paidQuotes,
    handleMarkAsPaid,
    payingQuoteId,
    refreshQuotes
  }
}
