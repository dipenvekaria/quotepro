// @ts-nocheck
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDashboard, useQuotesQueue } from '@/lib/dashboard-context'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Archive, Send, X } from 'lucide-react'
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
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    
    const newUrl = params.toString() 
      ? `/leads-and-quotes/quotes?${params.toString()}` 
      : '/leads-and-quotes/quotes'
    router.replace(newUrl, { scroll: false })
  }, [searchTerm, statusFilter, sortBy, router])

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    let filtered = [...quotes]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q => 
        q.customer?.name?.toLowerCase().includes(term) ||
        q.job_name?.toLowerCase().includes(term) ||
        q.quote_number?.toLowerCase().includes(term)
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter)
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return (a.customer?.name || '').localeCompare(b.customer?.name || '')
        case 'amount-high':
          return (b.total || 0) - (a.total || 0)
        case 'amount-low':
          return (a.total || 0) - (b.total || 0)
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    
    return filtered
  }, [quotes, searchTerm, statusFilter, sortBy])

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || sortBy !== 'newest'

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
        {/* Search with Filters */}
        <QueueSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search quotes..."
          showFilters={true}
          onFilterClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setSortBy('newest')
                  }}
                  className="h-8 text-xs text-blue-600 hover:text-blue-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Customer Name</SelectItem>
                    <SelectItem value="amount-high">Highest Amount</SelectItem>
                    <SelectItem value="amount-low">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

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
