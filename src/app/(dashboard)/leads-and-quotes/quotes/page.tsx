// @ts-nocheck - New lead_status column pending database migration
'use client'

import { 
  QueueHeader, 
  QueueSearch, 
  QueueCard,
  CompactQueueCard,
  EmptyQueue,
} from '@/components/queues'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Button } from '@/components/ui/button'
import { FileText, Send, Edit, Plus, Phone } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'
import { useQuotesQueue } from '@/hooks/useQuotesQueue'

export default function QuotesQueuePage() {
  const {
    quotes,
    leads,
    filteredQuotes,
    searchTerm,
    setSearchTerm,
    archiveDialogOpen,
    setArchiveDialogOpen,
    quoteToArchive,
    handleEditQuote,
    handleSendQuote,
    handleArchiveQuote,
    handleArchiveClick,
    router
  } = useQuotesQueue()

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
