import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useLeadsQueue() {
  const { workItems, refreshWorkItems } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<{ id: string; customerName: string } | null>(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [leadToArchive, setLeadToArchive] = useState<string | null>(null)

  // Filter leads from work_items (status = 'lead')
  const leads = useMemo(() => {
    return workItems.filter(item => item.status === 'lead')
  }, [workItems])

  // Calculate quotes count for tab (draft, sent, accepted)
  const quotes = useMemo(() => {
    return workItems.filter(item => ['draft', 'sent', 'accepted'].includes(item.status))
  }, [workItems])

  // Apply search only (no status filter)
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(l => 
        l.customer?.name?.toLowerCase().includes(term) ||
        l.customer_name?.toLowerCase().includes(term) ||
        l.customer_address?.toLowerCase().includes(term) ||
        l.customer?.phone?.toLowerCase().includes(term) ||
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
      
      // Get lead to get company_id
      const { data: lead } = await supabase
        .from('work_items')
        .select('company_id')
        .eq('id', leadId)
        .eq('status', 'lead')
        .single()
      
      // Update lead status to 'archived'
      const { error: updateError } = await supabase
        .from('work_items')
        .update({ status: 'archived' })
        .eq('id', leadId)
      
      if (updateError) throw updateError
      
      // Log to activity_log
      const { data: { user } } = await supabase.auth.getUser()
      // @ts-ignore
      await supabase.from('activity_log').insert({
        company_id: lead?.company_id,
        user_id: user?.id || null,
        entity_type: 'lead',
        entity_id: leadId,
        action: 'archived',
        description: reason,
      })
      
      toast.success('Lead archived')
      await refreshWorkItems()
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

  return {
    // Data
    leads,
    quotes,
    filteredLeads,
    searchTerm,
    
    // Dialog state
    scheduleDialogOpen,
    setScheduleDialogOpen,
    selectedLead,
    setSelectedLead,
    archiveDialogOpen,
    setArchiveDialogOpen,
    leadToArchive,
    
    // Handlers
    setSearchTerm,
    handleCreateQuote,
    handleScheduleVisit,
    handleArchiveLead,
    handleArchiveClick,
    getStatusLabel,
    refreshWorkItems,
    router
  }
}
