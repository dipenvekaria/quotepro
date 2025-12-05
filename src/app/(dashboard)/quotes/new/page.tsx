// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LeadForm } from '@/components/features/leads/LeadForm'
import { ItemsTable, AIAssistant, type QuoteItem } from '@/components/features/quotes/QuoteEditor'
import { AuditTrail } from '@/components/audit-trail'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'
import { useGenerateQuote, useUpdateQuoteWithAI } from '@/lib/hooks/useQuotes'
import { useDashboard } from '@/lib/dashboard-context'

interface GeneratedQuote {
  line_items: QuoteItem[]
  options?: { tier: string; items: QuoteItem[] }[]
  subtotal: number
  tax_rate: number
  tax_amount?: number
  total: number
  notes?: string
  upsell_suggestions?: string[]
}

export default function NewQuotePage() {
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('id')
  const router = useRouter()
  const supabase = createClient()
  const { refreshQuotes } = useDashboard()

  // Check if creating quote from lead (showAICard flag set)
  const [isCreatingQuote, setIsCreatingQuote] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('showAICard') === 'true'
  })

  // Customer state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Lead state (job description, job type, photos)
  const [description, setDescription] = useState('')
  const [jobType, setJobType] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  // Quote state
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null)
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string>('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  
  // UI state
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // TanStack Query hooks
  const generateQuoteMutation = useGenerateQuote()
  const updateQuoteMutation = useUpdateQuoteWithAI()

  // Initialize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
      // Check if creating quote from lead
      setIsCreatingQuote(sessionStorage.getItem('showAICard') === 'true')
    }
    loadCompany()
    if (quoteId) {
      loadExistingQuote(quoteId)
      loadAuditLogs(quoteId)
    }
  }, [quoteId])

  // Auto-lookup customer by phone
  useEffect(() => {
    if (!customerPhone || quoteId) return
    const timeoutId = setTimeout(() => {
      lookupCustomerByPhone(customerPhone)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [customerPhone, companyId])

  // Load company data
  const loadCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // NEW SCHEMA: Get company via users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id, companies(id, logo_url)')
      .eq('id', user.id)
      .single() as { data: { company_id: string; companies: { id: string; logo_url: string } } | null }

    const company = userRecord?.companies
    if (company) {
      setCompanyId(company.id)
      setCompanyLogo(company.logo_url)
    }
  }

  // Load existing quote OR lead
  const loadExistingQuote = async (id: string) => {
    setIsLoadingQuote(true)
    try {
      // NEW SCHEMA: First try loading as a lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      console.log('Lead query result:', { lead, leadError })

      if (lead && !leadError) {
        // It's a lead - fetch customer separately
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', lead.customer_id)
          .single()

        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', lead.customer_id)
          .eq('is_primary', true)
          .limit(1)

        setCustomerName(customer?.name || '')
        setCustomerEmail(customer?.email || '')
        setCustomerPhone(customer?.phone || '')
        setCustomerAddress(addresses?.[0]?.address || '')
        setDescription(lead.description || '')
        setJobType(lead.metadata?.job_type || '')
        
        // Clear quote mode flag when loading a lead
        setIsCreatingQuote(false)
        sessionStorage.removeItem('showAICard')
        
        setIsLoadingQuote(false)
        return
      }

      // If not a lead, try loading as a quote
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', id)
        .single()

      console.log('Quote query result:', { quote, error })

      if (error) throw error

      if (quote) {
        // Fetch customer for quote
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', quote.customer_id)
          .single()

        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', quote.customer_id)
          .eq('is_primary', true)
          .limit(1)

        setCustomerName(customer?.name || '')
        setCustomerEmail(customer?.email || '')
        setCustomerPhone(customer?.phone || '')
        setCustomerAddress(addresses?.[0]?.address || '')
        setDescription(quote.description || '')
        setJobType(quote.job_name || '')
        setSavedQuoteId(quote.id)
        
        // Only set "creating quote" mode if quote has no items yet
        const hasItems = quote.quote_items && quote.quote_items.length > 0
        if (!hasItems) {
          setIsCreatingQuote(true)
          sessionStorage.setItem('showAICard', 'true')
        } else {
          setIsCreatingQuote(false)
          sessionStorage.removeItem('showAICard')
        }
        
        if (hasItems) {
          setGeneratedQuote({
            line_items: quote.quote_items.map((item: any) => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
              option_tier: item.option_tier,
              is_upsell: item.is_upsell,
              is_discount: item.is_discount
            })),
            options: [],
            subtotal: quote.subtotal || 0,
            tax_rate: quote.tax_rate || 0,
            tax_amount: quote.tax_amount || 0,
            total: quote.total || 0,
            notes: ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading quote:', error)
      toast.error('Failed to load quote')
    } finally {
      setIsLoadingQuote(false)
    }
  }

  // Load audit logs
  const loadAuditLogs = async (id: string) => {
    try {
      // First, check if this is a quote with a linked lead
      let entityIds = [id]
      
      if (isCreatingQuote || sessionStorage.getItem('showAICard') === 'true') {
        // Loading a quote - also get the lead's history if it exists
        const { data: quote } = await supabase
          .from('quotes')
          .select('lead_id')
          .eq('id', id)
          .maybeSingle()
        
        if (quote?.lead_id) {
          entityIds.push(quote.lead_id)
        }
      }
      
      // Load all activity logs for both quote and lead
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .in('entity_id', entityIds)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Activity log error:', error)
      }
      setAuditLogs(data || [])
    } catch (error) {
      console.error('Error loading activity logs:', error)
    }
  }

  // Lookup customer by phone
  const lookupCustomerByPhone = async (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 10 || !companyId) return

    try {
      // NEW SCHEMA: Lookup from customers table
      const { data: existingCustomers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .ilike('phone', `%${digitsOnly.slice(-10)}%`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error looking up customer:', error)
        return
      }

      if (existingCustomers && existingCustomers.length > 0) {
        const customer = existingCustomers[0]
        if (!customerName && customer.name) {
          setCustomerName(customer.name)
        }
        if (!customerEmail && customer.email) {
          setCustomerEmail(customer.email)
        }
        
        // Load customer's primary address
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('is_primary', true)
          .limit(1)
        
        if (addresses && addresses.length > 0 && !customerAddress) {
          setCustomerAddress(addresses[0].address)
        }
        
        toast.success(`Found existing customer: ${customer.name}`)
      }
    } catch (error) {
      console.error('Error in customer lookup:', error)
    }
  }

  // Recalculate tax when address changes
  const recalculateQuoteForAddress = async (newAddress: string) => {
    if (!generatedQuote || !companyId || !newAddress) return

    try {
      const response = await fetch('http://localhost:8001/api/calculate-tax-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          customer_address: newAddress,
        }),
      })

      if (!response.ok) {
        console.error('Failed to fetch new tax rate')
        return
      }

      const { tax_rate } = await response.json()
      const subtotal = generatedQuote.line_items.reduce((sum, item) => sum + item.total, 0)
      const total = subtotal + (subtotal * (tax_rate / 100))
      
      setGeneratedQuote({
        ...generatedQuote,
        tax_rate,
        subtotal,
        total,
      })

      if (savedQuoteId || quoteId) {
        await supabase
          .from('quotes')
          .update({
            customer_address: newAddress,
            tax_rate,
            total,
          })
          .eq('id', savedQuoteId || quoteId)

        toast.success(`Tax rate updated to ${tax_rate.toFixed(2)}%`)
      }
    } catch (error) {
      console.error('Error recalculating quote:', error)
    }
  }

  // Generate quote with AI
  const handleGenerateQuote = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name first')
      return
    }

    setIsGenerating(true)
    const loadingToast = toast.loading('Building your quote… this beats Word by a mile ;)')

    try {
      const data = await generateQuoteMutation.mutateAsync({
        company_id: companyId,
        description: description || 'General quote request',
        customer_address: customerAddress || undefined,
        existing_items: generatedQuote?.line_items,
      })

      setGeneratedQuote(data)
      toast.success('Quote generated!', { id: loadingToast })

      // Auto-save if editing existing quote
      if (savedQuoteId || quoteId) {
        await saveQuoteToDatabase(data)
      }
    } catch (error) {
      toast.error('Failed to generate quote', { id: loadingToast })
    } finally {
      setIsGenerating(false)
    }
  }

  // Update quote with AI
  const handleUpdateWithAI = async (prompt: string) => {
    const currentQuoteId = savedQuoteId || quoteId
    if (!currentQuoteId) {
      toast.error('Please save the quote first')
      return
    }

    try {
      const data = await updateQuoteMutation.mutateAsync({
        quote_id: currentQuoteId,
        company_id: companyId,
        user_prompt: prompt,
      })

      const updatedQuote = {
        ...generatedQuote,
        line_items: data.line_items,
        subtotal: data.subtotal,
        tax_rate: data.tax_rate || generatedQuote?.tax_rate || 0,
        total: data.total,
        notes: data.notes || generatedQuote?.notes,
      }

      setGeneratedQuote(updatedQuote)
      await saveQuoteToDatabase(updatedQuote)
      await loadAuditLogs(currentQuoteId)
    } catch (error) {
      console.error('AI update error:', error)
    }
  }

  // Save quote to database
  const saveQuoteToDatabase = async (quote: GeneratedQuote = generatedQuote!) => {
    if (!quote) return

    const subtotal = quote.line_items.reduce((sum, item) => sum + item.total, 0)
    const taxRate = quote.tax_rate || 0
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const currentQuoteId = savedQuoteId || quoteId

    if (currentQuoteId) {
      // Update existing
      await supabase
        .from('quotes')
        .update({
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          lead_status: 'quoted',
        })
        .eq('id', currentQuoteId)

      // Delete and re-insert items
      await supabase.from('quote_items').delete().eq('quote_id', currentQuoteId)

      const items = quote.line_items.map((item, index) => ({
        quote_id: currentQuoteId,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        option_tier: item.option_tier || null,
        is_upsell: item.is_upsell || false,
        is_discount: item.is_discount || false,
        sort_order: index,
      }))

      await supabase.from('quote_items').insert(items)
    }
  }

  // Handle save quote (new quote)
  const handleSaveQuote = async () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required')
      return
    }

    if (!generatedQuote || generatedQuote.line_items.length === 0) {
      toast.error('Please generate a quote first')
      return
    }

    setIsGenerating(true)
    try {
      const subtotal = generatedQuote.line_items.reduce((sum, item) => sum + item.total, 0)
      const taxRate = generatedQuote.tax_rate || 0
      const taxAmount = subtotal * (taxRate / 100)
      const total = subtotal + taxAmount

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          lead_status: 'quoted',
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      setSavedQuoteId(quote.id)

      // Insert quote items
      const items = generatedQuote.line_items.map((item, index) => ({
        quote_id: quote.id,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        option_tier: item.option_tier || null,
        is_upsell: item.is_upsell || false,
        is_discount: item.is_discount || false,
        sort_order: index,
      }))

      await supabase.from('quote_items').insert(items)

      // Log to audit trail
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          company_id: companyId,
          user_id: user.id,
          entity_type: 'quote',
          entity_id: quote.id,
          action: 'ai_generation',
          description: `Quote generated with ${generatedQuote.line_items.length} items`,
        })
      }

      // Reload audit logs
      await loadAuditLogs(quote.id)

      toast.success('Quote saved successfully!')
      router.push(`/dashboard/leads/new?id=${quote.id}`)
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save quote')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle update quote
  const handleUpdateQuote = async () => {
    await saveQuoteToDatabase()
    
    // Log to audit trail
    const currentQuoteId = savedQuoteId || quoteId
    if (currentQuoteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          company_id: companyId,
          user_id: user.id,
          entity_type: 'quote',
          entity_id: currentQuoteId,
          action: 'updated',
          description: 'Quote manually updated',
        })
      }
      await loadAuditLogs(currentQuoteId)
    }
    
    toast.success('Quote updated')
  }

  // Handle send quote
  const handleSendQuote = async () => {
    const currentQuoteId = savedQuoteId || quoteId
    if (!currentQuoteId) {
      toast.error('Please save the quote first')
      return
    }

    if (!customerEmail && !customerPhone) {
      toast.error('Please add customer email or phone number to send quote')
      return
    }

    setIsSending(true)
    try {
      // Update quote status to sent and set sent_at timestamp
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          followup_status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', currentQuoteId)

      if (updateError) throw updateError

      // Log to audit trail
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          company_id: companyId,
          user_id: user.id,
          entity_type: 'quote',
          entity_id: currentQuoteId,
          action: 'sent',
          description: 'Quote sent to customer',
        })
      }

      // Copy public link to clipboard
      const publicLink = `${origin}/q/${currentQuoteId}`
      await navigator.clipboard.writeText(publicLink)

      // Send email if email provided (optional, existing functionality)
      if (customerEmail) {
        const response = await fetch('/api/send-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: currentQuoteId,
            recipient_email: customerEmail,
            company_logo: companyLogo,
          }),
        })

        if (!response.ok) {
          console.error('Email send failed, but quote marked as sent')
        }
      }

      // Reload audit logs
      await loadAuditLogs(currentQuoteId)

      toast.success('Quote sent! Link copied to clipboard.')
    } catch (err: any) {
      console.error('Send error:', err)
      toast.error(err.message || 'Failed to send quote')
    } finally {
      setIsSending(false)
    }
  }

  // Handle save lead (without quote)
  const handleSaveLead = async () => {
    if (!customerName || !description) {
      toast.error('Please fill in customer name and job description')
      return
    }

    try {
      // Use existing job type or generate in background (non-blocking)
      let finalJobType = jobType
      
      // Generate job type with timeout (max 5 seconds) if not already set
      if (!jobType && description) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
        
        const fetchPromise = fetch('/api/generate-job-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            customer_name: customerName,
            company_id: companyId,
          }),
        })
        
        try {
          const jobTypeResponse = await Promise.race([fetchPromise, timeoutPromise])
          if (jobTypeResponse.ok) {
            const data = await jobTypeResponse.json()
            finalJobType = data.job_name
            setJobType(data.job_name)
          }
        } catch (error) {
          // Timeout or error - continue without job type
          console.log('Job type generation skipped (timeout or error)')
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in')
        return
      }

      if (quoteId) {
        // Update existing lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            description: description,
            metadata: { job_type: finalJobType },
          })
          .eq('id', quoteId)

        if (updateError) throw updateError

        // Update customer info
        const { data: existingLead } = await supabase
          .from('leads')
          .select('customer_id')
          .eq('id', quoteId)
          .single()

        if (existingLead?.customer_id) {
          await supabase
            .from('customers')
            .update({
              name: customerName,
              email: customerEmail || null,
              phone: customerPhone || null,
            })
            .eq('id', existingLead.customer_id)
        }

        // Log to activity trail
        await supabase.from('activity_log').insert({
          company_id: companyId,
          user_id: user.id,
          entity_type: 'lead',
          entity_id: quoteId,
          action: 'updated',
          description: `Lead information updated`,
          changes: {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            description: description,
            job_type: finalJobType,
          },
        })

        toast.success('Lead updated successfully!')
        
        // Redirect back to leads page
        refreshQuotes()
        router.push('/leads-and-quotes/leads')
        return
      }

      // Create new lead - First, create or find customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          company_id: companyId,
          name: customerName,
          email: customerEmail || null,
          phone: customerPhone || null,
        }, {
          onConflict: 'company_id,phone',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (customerError) {
        // If upsert fails due to conflict, try to fetch existing
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select()
          .eq('company_id', companyId)
          .eq('phone', customerPhone)
          .single()

        if (!existingCustomer) throw customerError
        
        // Use existing customer
        var customerId = existingCustomer.id
      } else {
        var customerId = customer.id
      }

      // Create customer address if provided
      if (customerAddress && customerId) {
        await supabase
          .from('customer_addresses')
          .upsert({
            customer_id: customerId,
            address: customerAddress,
            is_primary: true,
          })
      }

      // Create lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          company_id: companyId,
          customer_id: customerId,
          description: description,
          status: 'new',
          source: 'direct',
          urgency: 'medium',
          assigned_to: user.id,
          metadata: { job_type: finalJobType },
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Log to activity trail
      await supabase.from('activity_log').insert({
        company_id: companyId,
        user_id: user.id,
        entity_type: 'lead',
        entity_id: newLead.id,
        action: 'created',
        description: `New lead created: ${customerName}`,
        changes: {
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          description: description,
          job_type: finalJobType,
        },
      })

      toast.success('Lead saved successfully!')
      
      // Redirect back to leads page
      refreshQuotes()
      router.push('/leads-and-quotes/leads')
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Failed to save lead')
    }
  }

  // Handle archive
  const handleArchive = async (reason: string) => {
    const currentQuoteId = savedQuoteId || quoteId
    if (!currentQuoteId) return

    try {
      await supabase
        .from('quotes')
        .update({
          lead_status: 'archived',
          archived_reason: reason,
          archived_at: new Date().toISOString(),
        })
        .eq('id', currentQuoteId)

      toast.success('Lead archived')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to archive lead')
    }
  }

  // Handle items change
  const handleItemsChange = (items: QuoteItem[]) => {
    setHasUnsavedChanges(true)
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxRate = generatedQuote?.tax_rate || 0
    const total = subtotal + (subtotal * (taxRate / 100))

    setGeneratedQuote({
      line_items: items,
      options: generatedQuote?.options || [],
      subtotal,
      tax_rate: taxRate,
      tax_amount: subtotal * (taxRate / 100),
      total,
      notes: generatedQuote?.notes,
    })
  }

  if (isLoadingQuote) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-[#0055FF]" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Clean header with Save/Send buttons */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {generatedQuote ? 'Quote' : isCreatingQuote ? 'Create Quote' : 'Edit Quote'}
            </h1>
            {customerName && (
              <p className="text-sm text-gray-500 truncate">{customerName}</p>
            )}
          </div>
          
          {/* Action buttons in header */}
          <div className="flex items-center gap-2">
            {/* Save Quote button */}
            {generatedQuote && (savedQuoteId || quoteId) && (
              <Button
                onClick={handleUpdateQuote}
                disabled={!hasUnsavedChanges}
                className={hasUnsavedChanges 
                  ? "h-10 px-5 bg-[#0055FF] hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25" 
                  : "h-10 px-5 bg-gray-100 text-gray-400 font-medium rounded-xl border border-gray-200"
                }
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save
              </Button>
            )}
            
            {/* Send button */}
            {generatedQuote && (savedQuoteId || quoteId) && (
              <Button
                onClick={handleSendQuote}
                disabled={isSending}
                className="h-10 px-5 bg-gray-900 hover:bg-black text-white font-medium rounded-xl"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Send</>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-6 space-y-4">
        {/* 1. QUOTE ITEMS - Always show (empty state has Add Item button) */}
        <ItemsTable
          items={generatedQuote?.line_items || []}
          subtotal={generatedQuote?.subtotal || 0}
          taxRate={generatedQuote?.tax_rate || 0}
          total={generatedQuote?.total || 0}
          onItemsChange={handleItemsChange}
          onSaveItems={savedQuoteId || quoteId ? saveQuoteToDatabase : undefined}
          companyId={companyId}
        />

        {/* 2. AI GENERATE - Show generate button when no items, update button when has items */}
        <AIAssistant
          quoteId={savedQuoteId || quoteId}
          aiNotes={generatedQuote?.notes}
          hasQuote={!!generatedQuote && generatedQuote.line_items.length > 0}
          isGenerating={isGenerating}
          onGenerateQuote={handleGenerateQuote}
          onUpdateWithAI={handleUpdateWithAI}
          disabled={!customerName}
        />

        {/* 3. CUSTOMER INFO */}
        <LeadForm
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          jobDescription={description}
          isDescriptionReadOnly={true}
          companyId={companyId}
          onCustomerNameChange={setCustomerName}
          onCustomerEmailChange={setCustomerEmail}
          onCustomerPhoneChange={setCustomerPhone}
          onCustomerAddressChange={setCustomerAddress}
          onJobDescriptionChange={setDescription}
          quoteId={savedQuoteId || quoteId}
          origin={origin}
          hasQuote={!!generatedQuote}
          onAddressRecalculate={recalculateQuoteForAddress}
        />

        {/* Save Quote button - only when quote not saved yet */}
        {generatedQuote && !savedQuoteId && !quoteId && (
          <Button
            onClick={handleSaveQuote}
            disabled={isGenerating}
            className="w-full h-10 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save Quote
          </Button>
        )}

        {/* Missing contact info hint */}
        {generatedQuote && (savedQuoteId || quoteId) && !customerEmail && !customerPhone && (
          <p className="text-xs text-slate-500 text-center">
            Add email or phone to send quote
          </p>
        )}

        {/* 4. AUDIT TRAIL - Always show when quote exists */}
        {(savedQuoteId || quoteId) && (
          <AuditTrail quoteId={savedQuoteId || quoteId!} entries={auditLogs} />
        )}
      </main>

      {/* Archive Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onArchive={handleArchive}
      />
    </div>
  )
}
