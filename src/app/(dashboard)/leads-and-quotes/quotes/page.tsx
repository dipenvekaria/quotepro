// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import { useDashboard, useQuotesQueue } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  QueueHeader, 
  QueueSearch, 
  CompactQueueCard,
  EmptyQueue,
} from '@/components/queues'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/action-button'
import { FileText, Archive, Send } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'
import { formatDistanceToNow } from 'date-fns'

/**
 * QUOTES QUEUE
 * Shows work items with status IN ('draft', 'sent', 'accepted')
 * Actions: Edit, Send, Archive
 */
export default function QuotesQueuePage() {
  const { counts, refreshWorkItems } = useDashboard()
  const quotes = useQuotesQueue()
  const router = useRouter()
  const supabase = createClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  // Filter by search
  const filteredQuotes = useMemo(() => {
    if (!searchTerm) return quotes
    const term = searchTerm.toLowerCase()
    return quotes.filter(q => 
      q.customer?.name?.toLowerCase().includes(term) ||
      q.job_name?.toLowerCase().includes(term) ||
      q.quote_number?.toLowerCase().includes(term)
    )
  }, [quotes, searchTerm])

  // Archive quote
  const handleArchive = async (reason: string) => {
    if (!selectedQuoteId) return
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason
        })
        .eq('id', selectedQuoteId)

      if (error) throw error

      toast.success('Quote archived')
      await refreshWorkItems()
    } catch (error) {
      console.error('Error archiving:', error)
      toast.error('Failed to archive')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
      accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 overflow-x-hidden">
      {/* Mobile Tabs */}
      <MobileSectionTabs 
        activeTab="quotes"
        leadsCount={counts.leads}
        quotesCount={counts.quotes}
      />

      {/* Header */}
      <QueueHeader
        title="Quotes"
        subtitle={`${filteredQuotes.length} quote${filteredQuotes.length !== 1 ? 's' : ''}`}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 pb-24 md:pb-4 overflow-x-hidden">
        {/* Search */}
        <QueueSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search quotes..."
        />

        {/* Empty State or List */}
        {filteredQuotes.length === 0 ? (
          <EmptyQueue
            icon="file"
            title="No quotes"
            description={searchTerm ? "No quotes match your search" : "Create quotes from leads or start fresh"}
          />
        ) : (
          <div className="space-y-3 mt-4">
            {filteredQuotes.map(quote => (
              <CompactQueueCard
                key={quote.id}
                data={{
                  id: quote.id,
                  customer_name: quote.customer?.name || 'Unknown Customer',
                  customer_address: quote.customer?.address,
                  job_name: quote.job_name || quote.description?.slice(0, 50),
                  total: quote.total,
                  created_at: quote.created_at,
                  status: quote.status,
                  quote_number: quote.quote_number,
                }}
                badge={getStatusBadge(quote.status)}
                onClick={() => router.push(`/quotes/new?id=${quote.id}`)}
                showAmount={true}
                actions={
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    icon={Archive}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedQuoteId(quote.id)
                      setArchiveDialogOpen(true)
                    }}
                  />
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* Archive Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchive}
        itemType="quote"
      />
    </div>
  )
}
