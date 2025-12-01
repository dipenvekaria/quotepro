// @ts-nocheck - Supabase type generation pending
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useJobDetail(id: string) {
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuote()
  }, [id])

  const loadQuote = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setQuote(data)
    } catch (error) {
      console.error('Error loading quote:', error)
      toast.error('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const scheduledDate = quote?.scheduled_at ? new Date(quote.scheduled_at) : null

  return {
    quote,
    loading,
    scheduledDate,
    reload: loadQuote
  }
}
