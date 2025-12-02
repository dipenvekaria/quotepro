// @ts-nocheck - New lead_status column pending database migration
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LeadsAndQuotes } from '@/components/leads-and-quotes'
import { Loader2 } from 'lucide-react'

export default function QuotesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [leads, setLeads] = useState([])
  const [quotes, setQuotes] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get user's company via users table
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // NEW SCHEMA: Get company via users table
      const { data: userRecord } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single() as { data: { company_id: string } | null }

      if (!userRecord?.company_id) {
        router.push('/login')
        return
      }

      setCompanyId(userRecord.company_id)

      // Load all quotes (includes leads and quotes)
      const { data: allQuotes, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Split into leads and quotes based on lead_status
      const leadsData = (allQuotes || []).filter(q => 
        ['new', 'contacted', 'quote_visit_scheduled'].includes(q.lead_status)
      )
      
      const quotesData = (allQuotes || []).filter(q => 
        ['quoted', 'sent', 'accepted', 'signed'].includes(q.lead_status || q.status)
      )

      setLeads(leadsData)
      setQuotes(quotesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Start on Quotes tab */}
        <LeadsAndQuotes leads={leads} quotes={quotes} companyId={companyId} />
      </div>
    </div>
  )
}
