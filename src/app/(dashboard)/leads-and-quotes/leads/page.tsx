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
import { Calendar, FileText, Plus, Phone } from 'lucide-react'
import { ScheduleVisitDialog } from '@/components/schedule-visit-dialog'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'

export default function LeadsQueuePage() {
  const { quotes: allQuotes, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<{ id: string; customerName: string } | null>(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [leadToArchive, setLeadToArchive] = useState<string | null>(null)

  // Filter leads from all quotes
  const leads = useMemo(() => {
    return allQuotes.filter(q => {
      // Must have lead status (not quoted yet)
      const hasLeadStatus = ['new', 'contacted', 'quote_visit_scheduled'].includes(q.lead_status)
      // Must not have a quote total (no line items added yet)
      const hasNoQuote = !q.total || q.total === 0
      return hasLeadStatus && hasNoQuote
    })
  }, [allQuotes])

  // Calculate quotes count for tab
  const quotes = useMemo(() => {
    return allQuotes.filter(q => {
      const isQuoteLead = ['quoted', 'lost'].includes(q.lead_status) || (q.total && q.total > 0)
      const notInWorkQueue = !q.accepted_at && !q.signed_at
      return isQuoteLead && notInWorkQueue
    })
  }, [allQuotes])

  // Apply search only (no status filter)
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(l => 
        l.customer_name?.toLowerCase().includes(term) ||
        l.customer_address?.toLowerCase().includes(term) ||
        l.customer_phone?.toLowerCase().includes(term) ||
        l.job_name?.toLowerCase().includes(term)
      )
    }

    // Sort by created date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [leads, searchTerm])

  const handleCreateQuote = (leadId: string) => {
    // Navigate to quote generation page with the lead data
    router.push(`/leads/new?id=${leadId}&mode=quote`)
  }

  const handleScheduleVisit = (leadId: string, customerName: string) => {
    setSelectedLead({ id: leadId, customerName })
    setScheduleDialogOpen(true)
  }

  const handleArchiveLead = async (leadId: string, reason: string) => {
    try {
      const supabase = createClient()
      
      // Update lead_status to 'archived'
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ lead_status: 'archived' })
        .eq('id', leadId)
      
      if (updateError) throw updateError
      
      // Log to audit trail
      const { error: auditError } = await supabase
        .from('audit_trail')
        .insert({
          quote_id: leadId,
          action: 'lead_archived',
          details: reason,
          user_id: (await supabase.auth.getUser()).data.user?.id || 'system'
        })
      
      if (auditError) console.error('Audit trail error:', auditError)
      
      toast.success('Lead archived')
      await refreshQuotes()
    } catch (error) {
      console.error('Error archiving lead:', error)
      toast.error('Failed to archive lead')
    }
  }

  const handleArchiveClick = (leadId: string) => {
    setLeadToArchive(leadId)
    setArchiveDialogOpen(true)
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'New',
      contacted: 'Contacted',
      quote_visit_scheduled: 'Visit Scheduled'
    }
    return labels[status] || status
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
            title="Leads"
            description="New customer calls and inquiries"
            count={filteredLeads.length}
            action={
              <Button 
                onClick={() => router.push('/leads/new')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
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
        {/* Search Only - No Filters */}
        <div className="mb-3 md:mb-6">
          <QueueSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search leads..."
          />
        </div>

        {/* Queue Items */}
        {filteredLeads.length === 0 ? (
          <EmptyQueue
            title={searchTerm ? "No leads found" : "No leads yet"}
            description={
              searchTerm 
                ? "Try adjusting your search or filters" 
                : "New customer calls will appear here. Use the + button to add your first lead."
            }
            icon="users"
            action={
              !searchTerm && (
                <Button 
                  onClick={() => router.push('/leads/new')}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Lead
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-2 md:space-y-3">
            {filteredLeads.map(lead => (
              <div key={lead.id}>
                {/* Mobile: Compact Card */}
                <CompactQueueCard
                  className="md:hidden"
                  data={{
                    id: lead.id,
                    customer_name: lead.customer_name,
                    customer_phone: lead.customer_phone,
                    job_name: lead.job_name,
                    total: lead.total,
                    created_at: lead.created_at,
                  }}
                  badge={
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {getStatusLabel(lead.lead_status)}
                    </span>
                  }
                  showPhone={true}
                  hideAddress={true}
                  onClick={() => router.push(`/leads/new?id=${lead.id}`)}
                  onArchiveClick={handleArchiveClick}
                />

                {/* Desktop: Full Card */}
                <QueueCard
                  className="hidden md:block"
                  data={{
                    id: lead.id,
                    customer_name: lead.customer_name,
                    customer_address: lead.customer_address,
                    job_name: lead.job_name,
                    total: lead.total,
                    created_at: lead.created_at,
                    status: lead.lead_status
                  }}
                  badge={
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {getStatusLabel(lead.lead_status)}
                    </span>
                  }
                  actions={
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (lead.customer_phone) {
                            window.location.href = `tel:${lead.customer_phone}`
                          }
                        }}
                      >
                        <Phone className="w-5 h-5" />
                        Call
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleScheduleVisit(lead.id, lead.customer_name)
                        }}
                      >
                        <Calendar className="w-5 h-5" />
                        Schedule Visit
                      </Button>
                      <Button
                        size="lg"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateQuote(lead.id)
                        }}
                      >
                        <FileText className="w-5 h-5" />
                        Create Quote
                      </Button>
                    </div>
                  }
                  onClick={() => handleCreateQuote(lead.id)}
                  showAmount={lead.total !== undefined && lead.total > 0}
                  showDate={true}
                  dateLabel="Created"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Visit Dialog */}
      {selectedLead && (
        <ScheduleVisitDialog
          leadId={selectedLead.id}
          customerName={selectedLead.customerName}
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          onScheduled={() => {
            refreshQuotes()
            setSelectedLead(null)
          }}
        />
      )}

      {/* Archive Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={async (reason) => {
          if (leadToArchive) {
            await handleArchiveLead(leadToArchive, reason)
            setLeadToArchive(null)
          }
        }}
        itemType="lead"
      />
    </div>
  )
}
