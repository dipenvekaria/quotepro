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
  const { quotes: allLeads, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<{ id: string; customerName: string } | null>(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [leadToArchive, setLeadToArchive] = useState<string | null>(null)

  // Filter leads (status: new, contacted, qualified)
  const leads = useMemo(() => {
    return allLeads.filter(l => {
      const isLead = ['new', 'contacted', 'qualified', 'quote_sent'].includes(l.status)
      return isLead
    })
  }, [allLeads])

  // Calculate quotes count (status: quoted, won, lost)
  const quotes = useMemo(() => {
    return allLeads.filter(l => {
      const isQuote = ['quoted', 'won'].includes(l.status)
      return isQuote
    })
  }, [allLeads])

  // Apply search only (no status filter)
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(l => 
        l.customer?.name?.toLowerCase().includes(term) ||
        l.customer?.phone?.toLowerCase().includes(term) ||
        l.customer?.email?.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term) ||
        l.metadata?.job_type?.toLowerCase().includes(term)
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
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Update lead status to 'archived'
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          status: 'archived',
          archived_reason: reason 
        })
        .eq('id', leadId)
      
      if (updateError) throw updateError
      
      // Log to activity log
      if (user) {
        await supabase.from('activity_log').insert({
          entity_type: 'lead',
          entity_id: leadId,
          action: 'archived',
          description: `Lead archived: ${reason}`,
          user_id: user.id,
        })
      }
      
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
      qualified: 'Qualified',
      quote_sent: 'Quote Sent',
      quoted: 'Quoted',
      won: 'Won',
      lost: 'Lost',
      archived: 'Archived'
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
      <header className="hidden md:block bg-gray-50 border-b border-gray-200/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80">
        <div className="px-6 py-6">
          <QueueHeader
            title="Leads"
            description="New customer calls and inquiries"
            count={filteredLeads.length}
            action={
              <Button 
                onClick={() => router.push('/leads/new')}
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
                  className="bg-blue-500 hover:bg-blue-700 text-white"
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
                    customer_name: lead.customer?.name || 'Unknown',
                    customer_phone: lead.customer?.phone,
                    job_name: lead.metadata?.job_type || lead.description,
                    job_type: lead.metadata?.job_type,
                    total: 0,
                    created_at: lead.created_at,
                  }}
                  badge={
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                      {getStatusLabel(lead.status)}
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
                    customer_name: lead.customer?.name || 'Unknown',
                    customer_address: '', // TODO: fetch from customer_addresses
                    job_name: lead.metadata?.job_type || lead.description,
                    total: 0,
                    created_at: lead.created_at,
                    status: lead.status
                  }}
                  badge={
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                      {getStatusLabel(lead.status)}
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
