// @ts-nocheck - New lead_status column pending database migration
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
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Plus, Phone } from 'lucide-react'
import { MobileSectionTabs } from '@/components/navigation/mobile-section-tabs'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'

export default function LeadsQueuePage() {
  const { quotes: allLeads, refreshQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [leadToArchive, setLeadToArchive] = useState<string | null>(null)

  // DISABLED: Refresh on mount (causing RLS errors)
  // useEffect(() => {
  //   refreshQuotes()
  // }, [refreshQuotes])

  // Filter leads: items from leads table OR quotes with 0 items (not yet a quote)
  // Exclude archived
  const leads = useMemo(() => {
    return allLeads.filter(l => {
      // Skip archived items
      if (l.status === 'archived' || l.archived_at) return false
      
      // From leads table - only pre-quote statuses (not 'quoted')
      if (l._type === 'lead' || !l._type) {
        return ['new', 'contacted', 'qualified'].includes(l.status)
      }
      
      // From quotes table - only show if 0 items (still a lead, not a quote yet)
      if (l._type === 'quote') {
        const itemCount = l.quote_items?.length || 0
        return itemCount === 0
      }
      
      return false
    })
  }, [allLeads])

  // Calculate quotes count: quotes with 1+ items, exclude archived
  const quotes = useMemo(() => {
    return allLeads.filter(l => {
      if (l.status === 'archived' || l.archived_at) return false
      if (l._type !== 'quote') return false
      const itemCount = l.quote_items?.length || 0
      return itemCount > 0
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

  const handleCreateQuote = async (leadId: string) => {
    try {
      const supabase = createClient()
      
      // First, check if a quote already exists for this lead
      const { data: existingQuote } = await supabase
        .from('quotes')
        .select('id')
        .eq('lead_id', leadId)
        .maybeSingle()
      
      if (existingQuote) {
        // Quote already exists, navigate to edit it
        toast.success('Opening existing quote...')
        sessionStorage.setItem('showAICard', 'true')
        router.push(`/quotes/new?id=${existingQuote.id}`)
        return
      }
      
      // No quote exists, create a new one
      const { data: lead } = await supabase
        .from('leads')
        .select('*, customers(*)')
        .eq('id', leadId)
        .single()
      
      if (!lead) {
        toast.error('Lead not found')
        return
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in')
        return
      }
      
      // Generate quote number (simple timestamp-based for now)
      const quoteNumber = `Q-${Date.now()}`
      
      // Create a new quote from the lead
      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          company_id: lead.company_id,
          customer_id: lead.customer_id,
          lead_id: leadId,
          quote_number: quoteNumber,
          job_name: lead.metadata?.job_type || 'New Quote',
          description: lead.description,
          status: 'draft',
          created_by: user.id,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
        })
        .select()
        .single()
      
      if (quoteError) {
        console.error('Error creating quote:', quoteError)
        toast.error('Failed to create quote')
        return
      }
      
      // Update lead status to 'quoted'
      await supabase
        .from('leads')
        .update({ status: 'quoted' })
        .eq('id', leadId)
      
      // Log activity
      await supabase.from('activity_log').insert({
        company_id: lead.company_id,
        user_id: user.id,
        entity_type: 'quote',
        entity_id: newQuote.id,
        action: 'created',
        description: `Quote created from lead: ${lead.customers?.name || 'Unknown'}`,
      })
      
      // Refresh dashboard counts
      await refreshQuotes()
      
      toast.success('Quote created! Redirecting...')
      
      // Set flag to show AI quote generation card
      sessionStorage.setItem('showAICard', 'true')
      
      // Navigate to quote editor
      router.push(`/quotes/new?id=${newQuote.id}`)
    } catch (error) {
      console.error('Error creating quote:', error)
      toast.error('Failed to create quote')
    }
  }

  const handleScheduleVisit = () => {
    // Navigate to calendar view to see team availability
    router.push('/work/calendar')
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
          archived_at: new Date().toISOString(),
          archived_reason: reason 
        })
        .eq('id', leadId)
      
      if (updateError) throw updateError

      // Also archive any linked quotes
      await supabase
        .from('quotes')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason 
        })
        .eq('lead_id', leadId)
      
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
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Mobile Tabs */}
      <MobileSectionTabs 
        tabs={[
          { label: 'Leads', href: '/leads-and-quotes/leads', count: leads.length },
          { label: 'Quotes', href: '/leads-and-quotes/quotes', count: quotes.length }
        ]}
      />

      {/* Desktop Header Only */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <QueueHeader
            title="Leads"
            description="New customer calls and inquiries"
            count={filteredLeads.length}
            action={
              <button 
                onClick={() => router.push('/leads/new')}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Lead
              </button>
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
                <button 
                  onClick={() => router.push('/leads/new')}
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add First Lead
                </button>
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
                          handleScheduleVisit()
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
                  onClick={() => router.push(`/leads/new?id=${lead.id}`)}
                  showAmount={lead.total !== undefined && lead.total > 0}
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
