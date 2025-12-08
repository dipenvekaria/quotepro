// @ts-nocheck
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDashboard, useLeadsQueue } from '@/lib/dashboard-context'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { ActionButton } from '@/components/ui/action-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, Phone, Archive, Calendar, X } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'
import { formatDistanceToNow } from 'date-fns'

/**
 * LEADS QUEUE
 * Shows work items with status = 'lead'
 * Actions: Create Quote, Archive
 */
export default function LeadsQueuePage() {
  const { counts, refreshWorkItems } = useDashboard()
  const leads = useLeadsQueue()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    
    const newUrl = params.toString() 
      ? `/leads-and-quotes/leads?${params.toString()}` 
      : '/leads-and-quotes/leads'
    router.replace(newUrl, { scroll: false })
  }, [searchTerm, statusFilter, sortBy, router])

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(l => 
        l.customer?.name?.toLowerCase().includes(term) ||
        l.customer?.phone?.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term) ||
        l.metadata?.job_type?.toLowerCase().includes(term)
      )
    }
    
    // Status filter (if you have sub-statuses within 'lead')
    // Currently all are status='lead', but you could filter by other fields
    // For now, keeping it as a placeholder
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return (a.customer?.name || '').localeCompare(b.customer?.name || '')
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    
    return filtered
  }, [leads, searchTerm, statusFilter, sortBy])

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || sortBy !== 'newest'

  // Create quote from lead (transition to 'draft')
  const handleCreateQuote = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ status: 'draft' })
        .eq('id', leadId)

      if (error) throw error

      toast.success('Creating quote...')
      await refreshWorkItems()
      
      // Navigate to quote editor
      sessionStorage.setItem('showAICard', 'true')
      router.push(`/quotes/new?id=${leadId}`)
    } catch (error) {
      console.error('Error creating quote:', error)
      toast.error('Failed to create quote')
    }
  }

  // Archive lead
  const handleArchive = async (reason: string) => {
    if (!selectedLeadId) return
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason
        })
        .eq('id', selectedLeadId)

      if (error) throw error

      toast.success('Lead archived')
      await refreshWorkItems()
    } catch (error) {
      console.error('Error archiving:', error)
      toast.error('Failed to archive')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 overflow-x-hidden">
      {/* Mobile Tabs */}
      <MobileSectionTabs 
        activeTab="leads"
        leadsCount={counts.leads}
        quotesCount={counts.quotes}
      />

      {/* Header */}
      <QueueHeader
        title="Leads"
        subtitle={`${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''} waiting`}
        action={
          <Button
            onClick={() => router.push('/leads/new')}
            className="hidden md:flex h-11 px-4 text-base bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-5 w-5 mr-1.5" />
            New Lead
          </Button>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 pb-24 md:pb-4 overflow-x-hidden">
        {/* Search with Filters */}
        <QueueSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search leads..."
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
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Customer Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Empty State or List */}
        {filteredLeads.length === 0 ? (
          <EmptyQueue
            icon="users"
            title="No leads"
            description={searchTerm ? "No leads match your search" : "New leads will appear here"}
          />
        ) : (
          <div className="space-y-3 mt-4">
            {filteredLeads.map(lead => (
              <div key={lead.id}>
                {/* Mobile: Compact Card */}
                <CompactQueueCard
                  className="md:hidden"
                  data={{
                    id: lead.id,
                    customer_name: lead.customer?.name || 'Unknown Customer',
                    customer_phone: lead.customer?.phone,
                    job_name: lead.job_name || lead.metadata?.job_type || lead.description?.slice(0, 50),
                    created_at: lead.created_at,
                    status: lead.status,
                  }}
                  badge={
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      Lead
                    </span>
                  }
                  onClick={() => router.push(`/leads/new?id=${lead.id}`)}
                  showPhone={true}
                  showAmount={false}
                  actions={
                    <ActionButton
                      variant="primary"
                      size="sm"
                      icon={FileText}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateQuote(lead.id)
                      }}
                    >
                      <span className="hidden sm:inline">Quote</span>
                    </ActionButton>
                  }
                />

                {/* Desktop: Full Card */}
                <QueueCard
                  className="hidden md:block"
                  data={{
                    id: lead.id,
                    customer_name: lead.customer?.name || 'Unknown Customer',
                    customer_address: lead.customer?.address || '',
                    job_name: lead.job_name || lead.metadata?.job_type || lead.description,
                    total: 0,
                    created_at: lead.created_at,
                    status: lead.status,
                  }}
                  badge={
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      Lead
                    </span>
                  }
                  actions={
                    <div className="flex gap-2">
                      <ActionButton
                        variant="ghost"
                        size="md"
                        icon={Phone}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (lead.customer?.phone) {
                            window.location.href = `tel:${lead.customer.phone}`
                          }
                        }}
                      >
                        Call
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        size="md"
                        icon={Archive}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLeadId(lead.id)
                          setArchiveDialogOpen(true)
                        }}
                      >
                        Archive
                      </ActionButton>
                      <ActionButton
                        variant="primary"
                        size="md"
                        icon={FileText}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateQuote(lead.id)
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        Create Quote
                      </ActionButton>
                    </div>
                  }
                  onClick={() => router.push(`/leads/new?id=${lead.id}`)}
                  showAmount={false}
                  showDate={true}
                  dateLabel="Created"
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Floating Action Button */}
      {/* FAB - New Lead */}
      <button
        onClick={() => router.push('/leads/new')}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 hover:shadow-2xl"
        aria-label="New Lead"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Archive Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchive}
        itemType="lead"
      />
    </div>
  )
}
