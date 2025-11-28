// @ts-nocheck - New lead_status column pending database migration
'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { 
  QueueHeader, 
  QueueSearch, 
  QueueFilters, 
  QueueCard, 
  EmptyQueue,
  type FilterOption 
} from '@/components/queues'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Plus } from 'lucide-react'

type LeadStatus = 'new' | 'contacted' | 'quote_visit_scheduled' | 'all'

export default function LeadsQueuePage() {
  const { quotes: allQuotes } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus>('all')

  // Filter leads from all quotes
  const leads = useMemo(() => {
    return allQuotes.filter(q => 
      ['new', 'contacted', 'quote_visit_scheduled'].includes(q.lead_status)
    )
  }, [allQuotes])

  // Calculate counts for filters
  const statusCounts = useMemo(() => {
    return {
      all: leads.length,
      new: leads.filter(l => l.lead_status === 'new').length,
      contacted: leads.filter(l => l.lead_status === 'contacted').length,
      quote_visit_scheduled: leads.filter(l => l.lead_status === 'quote_visit_scheduled').length
    }
  }, [leads])

  // Filter options
  const filterOptions: FilterOption[] = [
    { label: 'All Leads', value: 'all', count: statusCounts.all },
    { label: 'New', value: 'new', count: statusCounts.new },
    { label: 'Contacted', value: 'contacted', count: statusCounts.contacted },
    { label: 'Visit Scheduled', value: 'quote_visit_scheduled', count: statusCounts.quote_visit_scheduled }
  ]

  // Apply filters and search
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.lead_status === statusFilter)
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(l => 
        l.customer_name?.toLowerCase().includes(term) ||
        l.customer_address?.toLowerCase().includes(term) ||
        l.customer_phone?.toLowerCase().includes(term)
      )
    }

    // Sort by created date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [leads, statusFilter, searchTerm])

  const handleCreateQuote = (leadId: string) => {
    router.push(`/leads/new?id=${leadId}`)
  }

  const handleScheduleVisit = (leadId: string) => {
    // TODO: Open schedule modal
    console.log('Schedule visit for lead:', leadId)
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
        <div className="px-6 py-6">
          <QueueHeader
            title="Leads"
            description="New customer calls and inquiries"
            count={filteredLeads.length}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <QueueSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by customer name, address, or phone..."
            className="flex-1"
          />
          <QueueFilters
            label="Status"
            options={filterOptions}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as LeadStatus)}
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
                <Button onClick={() => router.push('/leads/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Lead
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredLeads.map(lead => (
              <QueueCard
                key={lead.id}
                data={{
                  id: lead.id,
                  customer_name: lead.customer_name,
                  customer_address: lead.customer_address,
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
                  <div className="flex gap-2">
                    {lead.lead_status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleScheduleVisit(lead.id)
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-1.5" />
                        Schedule Visit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateQuote(lead.id)
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Create Quote
                    </Button>
                  </div>
                }
                onClick={() => handleCreateQuote(lead.id)}
                showAmount={lead.total !== undefined && lead.total > 0}
                showDate={true}
                dateLabel="Created"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
