// @ts-nocheck - Using new normalized schema
'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { FileText, Plus, Archive } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'

export default function QuotesPage() {
  const { quotes: allData, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const supabase = createClient()

  // DISABLED: Refresh on mount (causing RLS errors)
  // useEffect(() => {
  //   refreshQuotes()
  // }, [refreshQuotes])

  // Filter for actual quotes (from quotes table), exclude archived
  const quotes = useMemo(() => {
    return allData.filter(item => 
      item._type === 'quote' && 
      item.status !== 'archived' && 
      !item.archived_at
    )
  }, [allData])

  // Filter for leads (for tab count)
  const leads = useMemo(() => {
    return allData.filter(item => {
      const isFromLeadsTable = item._type === 'lead' || !item._type
      const isLeadStatus = ['new', 'contacted', 'qualified', 'quote_sent'].includes(item.status)
      return isFromLeadsTable && isLeadStatus
    })
  }, [allData])

  // Apply search filter
  const filteredQuotes = useMemo(() => {
    let filtered = quotes

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q => 
        q.customer?.name?.toLowerCase().includes(term) ||
        q.customer?.phone?.toLowerCase().includes(term) ||
        q.job_name?.toLowerCase().includes(term) ||
        q.description?.toLowerCase().includes(term)
      )
    }

    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [quotes, searchTerm])

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      accepted: 'Accepted',
      rejected: 'Rejected',
      expired: 'Expired'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleArchive = async (reason: string) => {
    if (!selectedQuoteId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Update quote status to archived
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason
        })
        .eq('id', selectedQuoteId)

      if (updateError) throw updateError

      // Log to activity_log
      if (user) {
        const quote = quotes.find(q => q.id === selectedQuoteId)
        await supabase.from('activity_log').insert({
          company_id: quote?.company_id,
          user_id: user.id,
          entity_type: 'quote',
          entity_id: selectedQuoteId,
          action: 'archived',
          description: `Quote archived: ${reason}`,
        })
      }

      toast.success('Quote archived')
      refreshQuotes()
    } catch (err) {
      console.error('Archive error:', err)
      toast.error('Failed to archive quote')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Mobile Tabs */}
      <MobileSectionTabs 
        tabs={[
          { label: 'Leads', href: '/leads-and-quotes/leads', count: leads.length },
          { label: 'Quotes', href: '/leads-and-quotes/quotes', count: quotes.length }
        ]}
      />

      {/* Desktop Header */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <QueueHeader
            title="Quotes"
            description="Generated quotes and proposals"
            count={filteredQuotes.length}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-6">
        {/* Search */}
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
                ? "Try adjusting your search" 
                : "Create a lead first, then generate a quote from it."
            }
            icon="file"
            action={
              !searchTerm && (
                <button 
                  onClick={() => router.push('/leads-and-quotes/leads')}
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Go to Leads
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-2 md:space-y-3">
            {filteredQuotes.map(quote => (
              <div key={quote.id}>
                {/* Mobile: Compact Card with archive action */}
                <div className="md:hidden">
                  <CompactQueueCard
                    data={{
                      id: quote.id,
                      customer_name: quote.customer?.name || 'Unknown',
                      customer_phone: quote.customer?.phone,
                      job_name: quote.job_name || quote.description,
                      total: quote.total || 0,
                      created_at: quote.created_at,
                    }}
                    badge={
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(quote.status)}`}>
                        {getStatusLabel(quote.status)}
                      </span>
                    }
                    showPhone={true}
                    onClick={() => {
                      sessionStorage.setItem('showAICard', 'true')
                      router.push(`/quotes/new?id=${quote.id}`)
                    }}
                  />
                  {/* Mobile Archive Button */}
                  <div className="flex justify-end -mt-2 mb-2 px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedQuoteId(quote.id)
                        setArchiveDialogOpen(true)
                      }}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 py-1"
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </button>
                  </div>
                </div>

                {/* Desktop: Full Card */}
                <QueueCard
                  className="hidden md:block"
                  data={{
                    id: quote.id,
                    customer_name: quote.customer?.name || 'Unknown',
                    customer_address: '',
                    job_name: quote.job_name || quote.description,
                    total: quote.total || 0,
                    created_at: quote.created_at,
                    status: quote.status
                  }}
                  badge={
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                  }
                  actions={
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedQuoteId(quote.id)
                          setArchiveDialogOpen(true)
                        }}
                      >
                        <Archive className="w-5 h-5" />
                        Archive
                      </Button>
                      <Button
                        size="lg"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          sessionStorage.setItem('showAICard', 'true')
                          router.push(`/quotes/new?id=${quote.id}`)
                        }}
                      >
                        <FileText className="w-5 h-5" />
                        View Quote
                      </Button>
                    </div>
                  }
                  onClick={() => {
                    sessionStorage.setItem('showAICard', 'true')
                    router.push(`/quotes/new?id=${quote.id}`)
                  }}
                  showAmount={true}
                  showDate={true}
                  dateLabel="Created"
                />
              </div>
            ))}
          </div>
        )}
      </div>

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

