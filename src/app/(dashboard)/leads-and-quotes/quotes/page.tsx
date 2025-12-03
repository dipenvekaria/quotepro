// @ts-nocheck - Using new normalized schema
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
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'

export default function QuotesPage() {
  const { quotes: allData, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  // Filter for actual quotes (from quotes table, not leads)
  const quotes = useMemo(() => {
    // This needs to query the quotes table separately
    // For now, filter by status that indicates it's a quote
    return allData.filter(item => 
      ['draft', 'sent', 'viewed', 'accepted', 'rejected'].includes(item.status)
    )
  }, [allData])

  // Filter for leads
  const leads = useMemo(() => {
    return allData.filter(item => 
      ['new', 'contacted', 'qualified', 'quote_sent'].includes(item.status)
    )
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

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Mobile Tabs */}
      <MobileSectionTabs 
        tabs={[
          { label: 'Leads', href: '/leads-and-quotes/leads', count: leads.length },
          { label: 'Quotes', href: '/leads-and-quotes/quotes', count: quotes.length }
        ]}
      />

      {/* Desktop Header */}
      <header className="hidden md:block bg-gray-50 border-b border-gray-200/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80">
        <div className="px-6 py-6">
          <QueueHeader
            title="Quotes"
            description="Generated quotes and proposals"
            count={filteredQuotes.length}
            action={
              <Button 
                onClick={() => router.push('/leads-and-quotes/leads')}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Lead
              </Button>
            }
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
                <Button 
                  onClick={() => router.push('/leads-and-quotes/leads')}
                  className="bg-blue-500 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Go to Leads
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
    </div>
  )
}
