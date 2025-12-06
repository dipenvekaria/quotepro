// @ts-nocheck - Supabase type generation pending
'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * UNIFIED WORK ITEM STATUS FLOW:
 * 
 * lead → draft → sent → accepted → scheduled → in_progress → completed → paid
 *                                                                         ↘ archived
 * 
 * Queues:
 * - Leads Queue: status = 'lead'
 * - Quotes Queue: status IN ('draft', 'sent', 'accepted')
 * - Calendar (To Schedule): status = 'accepted' AND scheduled_at IS NULL
 * - Work Queue: status IN ('scheduled', 'in_progress')
 * - Completed: status IN ('completed', 'paid')
 */

export interface WorkItem {
  id: string
  company_id: string
  customer_id: string | null
  status: 'lead' | 'draft' | 'sent' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'paid' | 'archived'
  quote_number: string | null
  job_name: string | null
  description: string | null
  subtotal: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  paid_at: string | null
  archived_at: string | null
  archived_reason: string | null
  assigned_to: string | null
  created_by: string | null
  pdf_url: string | null
  signed_document_url: string | null
  customer_signature: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Joined data
  customer?: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address?: string
  }
  items?: { id: string }[]
}

interface DashboardContextType {
  company: any
  workItems: WorkItem[]
  refreshWorkItems: () => Promise<void>
  isRefreshing: boolean
  // Computed counts for navigation
  counts: {
    leads: number
    quotes: number
    toSchedule: number
    work: number
  }
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({
  children,
  company,
  workItems: initialWorkItems,
}: {
  children: ReactNode
  company: any
  workItems: WorkItem[]
}) {
  const router = useRouter()
  const [workItems, setWorkItems] = useState<WorkItem[]>(initialWorkItems)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = createClient()

  // Update workItems when initialWorkItems changes
  useEffect(() => {
    setWorkItems(initialWorkItems)
  }, [initialWorkItems])

  // Compute counts from workItems
  const counts = {
    leads: workItems.filter(w => w.status === 'lead').length,
    quotes: workItems.filter(w => ['draft', 'sent', 'accepted'].includes(w.status)).length,
    toSchedule: workItems.filter(w => w.status === 'accepted' && !w.scheduled_at).length,
    work: workItems.filter(w => ['scheduled', 'in_progress'].includes(w.status)).length,
  }

  const refreshWorkItems = async () => {
    setIsRefreshing(true)
    try {
      // Try work_items first, fallback to quotes if not migrated
      const { data, error } = await supabase
        .from('work_items')
        .select('*')
        .eq('company_id', company.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error refreshing work_items, trying quotes:', error)
        
        // Fallback to quotes table
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
        
        if (quotesError) {
          console.error('Error fetching quotes:', quotesError)
          return
        }
        
        // Map quotes to work_items format
        const mapped = (quotesData || []).map(q => ({
          ...q,
          status: q.lead_status === 'new' ? 'lead' : (q.status || 'draft')
        }))
        setWorkItems(mapped)
        return
      }

      setWorkItems(data || [])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <DashboardContext.Provider value={{ 
      company, 
      workItems, 
      refreshWorkItems, 
      isRefreshing,
      counts 
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

// Helper to get items for specific queue
export function useLeadsQueue() {
  const { workItems } = useDashboard()
  return workItems.filter(w => w.status === 'lead')
}

export function useQuotesQueue() {
  const { workItems } = useDashboard()
  return workItems.filter(w => ['draft', 'sent', 'accepted'].includes(w.status))
}

export function useToScheduleQueue() {
  const { workItems } = useDashboard()
  return workItems.filter(w => w.status === 'accepted' && !w.scheduled_at)
}

export function useWorkQueue() {
  const { workItems } = useDashboard()
  return workItems.filter(w => ['scheduled', 'in_progress'].includes(w.status))
}
