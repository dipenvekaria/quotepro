// @ts-nocheck - New lead_status column pending database migration
'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  QueueHeader, 
  QueueSearch, 
  QueueCard,
  CompactQueueCard,
  EmptyQueue,
} from '@/components/queues'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Button } from '@/components/ui/button'
import { FileText, Send, Edit, ExternalLink, Plus, Phone } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'

export default function QuotesQueuePage() {
  const { quotes: allQuotes, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [quoteToArchive, setQuoteToArchive] = useState<string | null>(null)

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

  // Calculate leads count for tab
  const leads = useMemo(() => {
    return allQuotes.filter(q => {
      const hasLeadStatus = ['new', 'contacted', 'quote_visit_scheduled'].includes(q.lead_status)
      const hasNoQuote = !q.total || q.total === 0
      return hasLeadStatus && hasNoQuote
    })
  }, [allQuotes])

  // Apply search only (no status filter)
  const filteredQuotes = useMemo(() => {
    let filtered = quotes

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q => 
        q.customer_name?.toLowerCase().includes(term) ||
        q.customer_address?.toLowerCase().includes(term) ||
        q.quote_number?.toLowerCase().includes(term) ||
        q.job_name?.toLowerCase().includes(term)
      )
    }

    // Sort by updated/created date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime()
      const dateB = new Date(b.updated_at || b.created_at).getTime()
      return dateB - dateA
    })
  }, [quotes, searchTerm])

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

  const handleArchiveQuote = async (quoteId: string, reason: string) => {
    try {
      const supabase = createClient()
      
      // Update lead_status to 'archived'
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ lead_status: 'archived' })
        .eq('id', quoteId)
      
      if (updateError) throw updateError
      
      // Log to audit trail
      const { error: auditError } = await supabase
        .from('audit_trail')
        .insert({
          quote_id: quoteId,
          action: 'quote_archived',
          details: reason,
          user_id: (await supabase.auth.getUser()).data.user?.id || 'system'
        })
      
      if (auditError) console.error('Audit trail error:', auditError)
      
      toast.success('Quote archived')
      await refreshQuotes()
    } catch (error) {
      console.error('Error archiving quote:', error)
      toast.error('Failed to archive quote')
    }
  }

  const handleArchiveClick = (quoteId: string) => {
    setQuoteToArchive(quoteId)
    setArchiveDialogOpen(true)
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Mobile Tabs */}
      <MobileSectionTabs 
        tabs={[
          { label: 'Leads', href: '/leads-and-quotes/leads', count: leads.length },
          { label: 'Quotes', href: '/leads-and-quotes/quotes', count: quotes.length }
        ]}
      />

      {/* Desktop Header Only */}
      <header className="hidden md:block bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
        <div className="px-6 py-6">
          <QueueHeader
            title="Quotes"
            description="Draft and send quotes to customers"
            count={filteredQuotes.length}
            action={
              <Button 
                onClick={() => router.push('/quotes/new')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Quote
              </Button>
            }
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-6">
        {/* Search Only - No Filters */}
        <div className="mb-3 md:mb-6">
          <QueueSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search quotes..."
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
                <Button 
                  onClick={() => router.push('/quotes/new')}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create First Quote
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-2 md:space-y-3">
            {filteredQuotes.map(quote => (
              <div key={quote.id}>
                {/* Mobile: Compact Card */}
                <CompactQueueCard
                  className="md:hidden"
                  data={{
                    id: quote.id,
                    customer_name: quote.customer_name,
                    quote_number: quote.quote_number,
                    job_name: quote.job_name,
                    total: quote.total,
                    created_at: quote.created_at,
                  }}
                  badge={<QuoteStatusBadge status={quote.status} size="sm" />}
                  showAmount={true}
                  hideAddress={true}
                  onClick={() => handleEditQuote(quote.id)}
                  onArchiveClick={handleArchiveClick}
                />

                {/* Desktop: Full Card */}
                <QueueCard
                  className="hidden md:block"
                  data={{
                    id: quote.id,
                    customer_name: quote.customer_name,
                    customer_address: quote.customer_address,
                    job_name: quote.job_name,
                    total: quote.total,
                    created_at: quote.created_at,
                    status: quote.status
                  }}
                  badge={<QuoteStatusBadge status={quote.status} size="sm" />}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      {/* Phone Button */}
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (quote.customer_phone) {
                            window.location.href = `tel:${quote.customer_phone}`
                          }
                        }}
                      >
                        <Phone className="w-5 h-5" />
                        Call
                      </Button>

                      {/* Edit Button */}
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditQuote(quote.id)
                        }}
                      >
                        <Edit className="w-5 h-5" />
                        Edit
                      </Button>

                      {/* Send Button */}
                      <Button
                        size="lg"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSendQuote(quote.id)
                        }}
                      >
                        <Send className="w-5 h-5" />
                        Send
                      </Button>
                    </div>
                  }
                  onClick={() => handleEditQuote(quote.id)}
                  showAmount={true}
                  showDate={true}
                  dateLabel={quote.updated_at ? "Updated" : "Created"}
                />
              </div>
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

      {/* Archive Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={async (reason) => {
          if (quoteToArchive) {
            await handleArchiveQuote(quoteToArchive, reason)
            setQuoteToArchive(null)
          }
        }}
        itemType="quote"
      />
    </div>
  )
}
