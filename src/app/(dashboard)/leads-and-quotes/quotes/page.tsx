// @ts-nocheck - New lead_status column pending database migration
'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { 
  QueueHeader, 
  QueueSearch, 
  QueueFilters, 
  QueueCard, 
  EmptyQueue,
  type FilterOption 
} from '@/components/queues'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Button } from '@/components/ui/button'
import { FileText, Send, Eye, Trash2, Edit, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

type QuoteStatus = 'all' | 'draft' | 'sent'

export default function QuotesQueuePage() {
  const { quotes: allQuotes, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus>('all')

  // Filter quotes (drafted or sent, not yet accepted/signed)
  const quotes = useMemo(() => {
    return allQuotes.filter(q => {
      // Quote must have 'quoted' or 'lost' status OR have a total > 0 (has line items)
      const isQuoteLead = ['quoted', 'lost'].includes(q.lead_status) || (q.total && q.total > 0)
      // Not yet accepted or signed (still in quote phase)
      const notInWorkQueue = !q.accepted_at && !q.signed_at
      return isQuoteLead && notInWorkQueue
    })
  }, [allQuotes])

  // Calculate counts for filters
  const statusCounts = useMemo(() => {
    return {
      all: quotes.length,
      draft: quotes.filter(q => q.status === 'draft').length,
      sent: quotes.filter(q => q.status === 'sent' || q.status === 'viewed').length
    }
  }, [quotes])

  // Filter options
  const filterOptions: FilterOption[] = [
    { label: 'All Quotes', value: 'all', count: statusCounts.all },
    { label: 'Draft', value: 'draft', count: statusCounts.draft },
    { label: 'Sent', value: 'sent', count: statusCounts.sent }
  ]

  // Apply filters and search
  const filteredQuotes = useMemo(() => {
    let filtered = quotes

    // Apply status filter
    if (statusFilter === 'draft') {
      filtered = filtered.filter(q => q.status === 'draft')
    } else if (statusFilter === 'sent') {
      filtered = filtered.filter(q => q.status === 'sent' || q.status === 'viewed')
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q => 
        q.customer_name?.toLowerCase().includes(term) ||
        q.customer_address?.toLowerCase().includes(term) ||
        q.quote_number?.toLowerCase().includes(term)
      )
    }

    // Sort by updated/created date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime()
      const dateB = new Date(b.updated_at || b.created_at).getTime()
      return dateB - dateA
    })
  }, [quotes, statusFilter, searchTerm])

  const handleEditQuote = (quoteId: string) => {
    router.push(`/quotes/new?id=${quoteId}`)
  }

  const handleSendQuote = async (quoteId: string) => {
    // TODO: Implement send quote logic
    console.log('Send quote:', quoteId)
  }

  const handleViewPublicLink = (quoteId: string) => {
    const publicUrl = `${window.location.origin}/q/${quoteId}`
    window.open(publicUrl, '_blank')
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete quote')
      
      await refreshQuotes()
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Failed to delete quote. Please try again.')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
        <div className="px-6 py-6">
          <QueueHeader
            title="Quotes"
            description="Draft and send quotes to customers"
            count={filteredQuotes.length}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <QueueSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by customer name, address, or quote number..."
            className="flex-1"
          />
          <QueueFilters
            label="Status"
            options={filterOptions}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as QuoteStatus)}
          />
        </div>

        {/* Queue Items */}
        {filteredQuotes.length === 0 ? (
          <EmptyQueue
            title={searchTerm ? "No quotes found" : "No quotes yet"}
            description={
              searchTerm 
                ? "Try adjusting your search or filters" 
                : "Create your first quote using AI generation or convert a lead to a quote."
            }
            icon="file"
            action={
              !searchTerm && (
                <Button onClick={() => router.push('/quotes/new')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create First Quote
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map(quote => (
              <QueueCard
                key={quote.id}
                data={{
                  id: quote.id,
                  customer_name: quote.customer_name,
                  customer_address: quote.customer_address,
                  total: quote.total,
                  created_at: quote.created_at,
                  status: quote.status
                }}
                badge={<QuoteStatusBadge status={quote.status} size="sm" />}
                actions={
                  <div className="flex flex-wrap gap-2">
                    {/* Edit Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditQuote(quote.id)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    {/* Send Button (for drafts) */}
                    {quote.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSendQuote(quote.id)
                        }}
                      >
                        <Send className="w-4 h-4 mr-1.5" />
                        Send
                      </Button>
                    )}

                    {/* View Public Link (for sent quotes) */}
                    {(quote.status === 'sent' || quote.status === 'viewed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewPublicLink(quote.id)
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        View Link
                      </Button>
                    )}

                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteQuote(quote.id)
                      }}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                }
                onClick={() => handleEditQuote(quote.id)}
                showAmount={true}
                showDate={true}
                dateLabel={quote.updated_at ? "Updated" : "Created"}
              />
            ))}
          </div>
        )}

        {/* Info Footer */}
        {filteredQuotes.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Quotes automatically move to the "Work → To be Scheduled" queue when a customer accepts or signs them.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
