// @ts-nocheck - Work items migration pending
import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useQuotesQueue() {
  const { workItems, refreshWorkItems } = useDashboard()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [quoteToArchive, setQuoteToArchive] = useState<string | null>(null)

  // Filter quotes from work_items (status IN draft, sent, accepted)
  const quotes = useMemo(() => {
    return workItems.filter(item => ['draft', 'sent', 'accepted'].includes(item.status))
  }, [workItems])

  // Calculate leads count for tab
  const leads = useMemo(() => {
    return workItems.filter(item => item.status === 'lead')
  }, [workItems])

  // Apply search only (no status filter)
  const filteredQuotes = useMemo(() => {
    let filtered = quotes

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q => 
        q.customer?.name?.toLowerCase().includes(term) ||
        q.customer_name?.toLowerCase().includes(term) ||
        q.customer_address?.toLowerCase().includes(term) ||
        q.quote_number?.toLowerCase().includes(term) ||
        q.job_name?.toLowerCase().includes(term)
      )
    }

    // Sort by updated/created date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime()
      const dateB = new Date(b.updated_at || b.created_at).getTime()
      return dateB - dateA
    })
  }, [quotes, searchTerm])

  const handleEditQuote = (quoteId: string) => {
    router.push(`/quotes/new?id=${quoteId}`)
  }

  const handleSendQuote = async (quoteId: string) => {
    // TODO: Implement send quote logic
    console.log('Send quote:', quoteId)
  }

  const handleViewPublicLink = (quoteId: string) => {
    const publicUrl = `${window.location.origin}/q/${quoteId}`
    window.open(publicUrl, '_blank')
  }

  const handleArchiveQuote = async (quoteId: string, reason: string) => {
    try {
      const supabase = createClient()
      
      // Get quote to get company_id
      const { data: quote } = await supabase
        .from('work_items')
        .select('company_id')
        .eq('id', quoteId)
        .single()
      
      // Update status to 'archived'
      const { error: updateError } = await supabase
        .from('work_items')
        .update({ 
          status: 'archived',
          archived_reason: reason,
          archived_at: new Date().toISOString()
        })
        .eq('id', quoteId)
      
      if (updateError) throw updateError
      
      // Log to activity_log
      const { data: { user } } = await supabase.auth.getUser()
      // @ts-ignore
      await supabase.from('activity_log').insert({
        company_id: quote?.company_id,
        user_id: user?.id || null,
        entity_type: 'quote',
        entity_id: quoteId,
        action: 'archived',
        description: reason,
      })
      
      toast.success('Quote archived')
      await refreshWorkItems()
    } catch (error) {
      console.error('Error archiving quote:', error)
      toast.error('Failed to archive quote')
    }
  }

  const handleArchiveClick = (quoteId: string) => {
    setQuoteToArchive(quoteId)
    setArchiveDialogOpen(true)
  }

  return {
    // Data
    quotes,
    leads,
    filteredQuotes,
    searchTerm,
    
    // Dialog state
    archiveDialogOpen,
    setArchiveDialogOpen,
    quoteToArchive,
    
    // Handlers
    setSearchTerm,
    handleEditQuote,
    handleSendQuote,
    handleViewPublicLink,
    handleArchiveQuote,
    handleArchiveClick,
    refreshWorkItems,
    router
  }
}
