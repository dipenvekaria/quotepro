// @ts-nocheck - Supabase type generation pending
'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DashboardContextType {
  company: any
  quotes: any[]
  refreshQuotes: () => Promise<void>
  isRefreshing: boolean
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({
  children,
  company,
  quotes: initialQuotes,
}: {
  children: ReactNode
  company: any
  quotes: any[]
}) {
  const router = useRouter()
  const [quotes, setQuotes] = useState(initialQuotes)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = createClient()

  // Update quotes when initialQuotes changes
  useEffect(() => {
    setQuotes(initialQuotes)
  }, [initialQuotes])

  const refreshQuotes = async () => {
    setIsRefreshing(true)
    try {
      // Fetch fresh data from both tables
      const { data: leads } = await supabase
        .from('leads')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      const { data: quotesData } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(*),
          lead:leads(id),
          quote_items(id)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      // Combine and update state
      const allData = [
        ...(leads || []).map(lead => ({ ...lead, _type: 'lead' })),
        ...(quotesData || []).map(quote => ({ ...quote, _type: 'quote' }))
      ]
      
      setQuotes(allData)
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <DashboardContext.Provider value={{ company, quotes, refreshQuotes, isRefreshing }}>
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
