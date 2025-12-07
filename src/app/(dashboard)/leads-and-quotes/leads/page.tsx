// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import { useDashboard, useLeadsQueue } from '@/lib/dashboard-context'
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
import { ActionButton } from '@/components/ui/action-button'
import { FileText, Plus, Phone, Archive, Calendar } from 'lucide-react'
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
  const supabase = createClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Filter by search
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads
    const term = searchTerm.toLowerCase()
    return leads.filter(l => 
      l.customer?.name?.toLowerCase().includes(term) ||
      l.customer?.phone?.toLowerCase().includes(term) ||
      l.description?.toLowerCase().includes(term) ||
      l.metadata?.job_type?.toLowerCase().includes(term)
    )
  }, [leads, searchTerm])

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
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 pb-24 md:pb-4 overflow-x-hidden">
        {/* Search */}
        <QueueSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search leads..."
        />

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
                        className="shadow-md shadow-blue-500/20"
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
      <button
        onClick={() => router.push('/leads/new')}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-[#0055FF] hover:bg-[#0046DD] text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 hover:shadow-2xl"
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
