// @ts-nocheck - Supabase type generation pending
'use client'

import { createContext, useContext, ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DashboardContextType {
  company: any
  quotes: any[]
  refreshQuotes: () => void
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

  const refreshQuotes = () => {
    // Trigger a router refresh to reload server data
    router.refresh()
  }

  return (
    <DashboardContext.Provider value={{ company, quotes, refreshQuotes }}>
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
