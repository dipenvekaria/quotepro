// @ts-nocheck - New lead_status column pending database migration
'use client'

import { LeadsAndQuotes } from '@/components/leads-and-quotes'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

export default function LeadsPage() {
  const { company, quotes: allRecords } = useDashboard()

  // Split into leads and quotes based on lead_status
  const leads = allRecords.filter(r => 
    ['new', 'contacted', 'quote_visit_scheduled'].includes(r.lead_status)
  )
  
  // Quotes section: Only show quotes that haven't been accepted/signed yet
  // Once accepted/signed, they move to Work section
  const quotes = allRecords.filter(r => {
    // Must have quote status of 'quoted' or 'lost'
    const isQuoteLead = ['quoted', 'lost'].includes(r.lead_status)
    
    // Exclude if already accepted or signed (they're in Work section now)
    const notInWorkQueue = !r.accepted_at && !r.signed_at
    
    return isQuoteLead && notInWorkQueue
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leads & Quotes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your sales pipeline from first contact to signed quote
              </p>
            </div>
            <Link href="/calendar">
              <Button className="gap-2 bg-[#FF6200] hover:bg-[#E55800]">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeadsAndQuotes 
          leads={leads} 
          quotes={quotes} 
          companyId={company.id}
        />
      </main>
    </div>
  )
}
