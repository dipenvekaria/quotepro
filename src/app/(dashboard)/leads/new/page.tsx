// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Wrench, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { LeadForm } from '@/components/features/leads/LeadForm'
import { QuoteGenerator, ItemsTable, AIAssistant, ActionButtons, type QuoteItem } from '@/components/features/quotes/QuoteEditor'
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

    const { data: company } = await supabase
      .from('companies')
      .select('id, logo_url')
      .eq('user_id', user.id)
      .single()

    if (company) {
      setCompanyId(company.id)
      setCompanyLogo(company.logo_url)
    }
  }

  // Load existing quote
  const loadExistingQuote = async (id: string) => {
    setIsLoadingQuote(true)
    try {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', id)
        .single()

      if (error) throw error

      if (quote) {
        setCustomerName(quote.customer_name || '')
        setCustomerEmail(quote.customer_email || '')
        setCustomerPhone(quote.customer_phone || '')
        setCustomerAddress(quote.customer_address || '')
        setDescription(quote.description || '')
        setJobType(quote.job_type || '')
        
        if (quote.quote_items && quote.quote_items.length > 0) {
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
      const { data, error } = await supabase
        .from('quote_audit_log')
        .select('*')
        .eq('quote_id', id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAuditLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    }
  }

  // Lookup customer by phone
  const lookupCustomerByPhone = async (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 10 || !companyId) return

    try {
      const { data: existingCustomers, error } = await supabase
        .from('quotes')
        .select('customer_name, customer_email, customer_phone, customer_address')
        .eq('company_id', companyId)
        .ilike('customer_phone', `%${digitsOnly.slice(-10)}%`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error looking up customer:', error)
        return
      }

      if (existingCustomers && existingCustomers.length > 0) {
        const customer = existingCustomers[0]
        if (!customerName && customer.customer_name) {
          setCustomerName(customer.customer_name)
        }
        if (!customerEmail && customer.customer_email) {
          setCustomerEmail(customer.customer_email)
        }
        if (!customerAddress && customer.customer_address) {
          setCustomerAddress(customer.customer_address)
        }
        toast.success(`Found existing customer: ${customer.customer_name}`)
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
  const handleGenerateQuote = async (prompt: string) => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name first')
      return
    }

    setIsGenerating(true)
    const loadingToast = toast.loading('Building your quote… this beats Word by a mile ;)')

    try {
      const data = await generateQuoteMutation.mutateAsync({
        company_id: companyId,
        description: prompt,
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
        await supabase.from('quote_audit_log').insert({
          quote_id: quote.id,
          action_type: 'ai_generation',
          description: `Quote generated with ${generatedQuote.line_items.length} items`,
          changes_made: {
            item_count: generatedQuote.line_items.length,
            subtotal,
            total,
            tax_rate: taxRate,
          },
          created_by: user.id,
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
        await supabase.from('quote_audit_log').insert({
          quote_id: currentQuoteId,
          action_type: 'manual_edit',
          description: `Quote manually updated`,
          changes_made: {
            timestamp: new Date().toISOString(),
          },
          created_by: user.id,
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
        await supabase.from('quote_audit_log').insert({
          quote_id: currentQuoteId,
          action_type: 'quote_sent',
          description: `Quote sent to customer`,
          changes_made: {
            followup_status: 'sent',
            sent_at: new Date().toISOString(),
          },
          created_by: user.id,
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
      
      // Generate job type with timeout (max 1 second)
      if (!jobType || !quoteId) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1000)
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

      if (quoteId) {
        // Update existing lead
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            customer_name: customerName,
            customer_email: customerEmail || null,
            customer_phone: customerPhone || null,
            customer_address: customerAddress || null,
            description: description,
            job_type: finalJobType || null,
            lead_status: 'new',
          })
          .eq('id', quoteId)

        if (updateError) throw updateError

        // Log to audit trail
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('quote_audit_log').insert({
            quote_id: quoteId,
            action_type: 'lead_updated',
            description: `Lead information updated`,
            changes_made: {
              customer_name: customerName,
              customer_phone: customerPhone,
              customer_address: customerAddress,
              description: description,
              job_type: finalJobType,
            },
            created_by: user.id,
          })
        }

        toast.success('Lead updated successfully!')
        await loadAuditLogs(quoteId)
        
        // Redirect back to leads page
        refreshQuotes()
        router.push('/leads-and-quotes/leads')
        return
      }

      // Create new lead
      const quoteNumber = `L-${Date.now().toString().slice(-8)}`
      
      const { data: newLead, error: insertError } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          quote_number: quoteNumber,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          description: description,
          job_type: finalJobType || null,
          status: 'draft',
          lead_status: 'new',
          subtotal: 0,
          tax_rate: 0,
          tax_amount: 0,
          total: 0,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Log to audit trail
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('quote_audit_log').insert({
          quote_id: newLead.id,
          action_type: 'lead_created',
          description: `New lead created: ${customerName}`,
          changes_made: {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            description: description,
            job_type: finalJobType,
          },
          created_by: user.id,
        })
      }

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
    if (!generatedQuote) return

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxRate = generatedQuote.tax_rate || 0
    const total = subtotal + (subtotal * (taxRate / 100))

    setGeneratedQuote({
      ...generatedQuote,
      line_items: items,
      subtotal,
      total,
    })
  }

  if (isLoadingQuote) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#2563eb]" />
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-20 min-w-0">
        {/* Header */}
        <header className="bg-gray-50 border-b border-gray-200/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isCreatingQuote ? 'Edit Quote' : quoteId ? 'Edit Lead' : 'New Lead'}
                </h1>
                {jobType && (
                  <p className="text-base text-gray-600 mt-1">
                    {jobType}
                  </p>
                )}
                {!jobType && customerName && (
                  <p className="text-base text-gray-600 mt-1">
                    {customerName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-4 space-y-4">
          {/* AI Quote Generator - FIRST (only when explicitly creating quote from lead) */}
          {isCreatingQuote && (
            <QuoteGenerator onGenerate={handleGenerateQuote} />
          )}

          {/* Customer Information - ALWAYS SHOWN */}
          <LeadForm
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            customerAddress={customerAddress}
            jobName={jobType}
            onCustomerNameChange={setCustomerName}
            onCustomerEmailChange={setCustomerEmail}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerAddressChange={setCustomerAddress}
            quoteId={quoteId}
            origin={origin}
            hasQuote={!!generatedQuote}
            onAddressRecalculate={recalculateQuoteForAddress}
          />

          {/* Job Description - ALWAYS SHOWN */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>Briefly describe what needs to be done</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="description" className="text-sm">
                  What needs to be done?
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the work needed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] text-sm p-4"
                />
              </div>

              {/* Save Lead Button - Show when no quote items exist */}
              {!generatedQuote && (
                <Button
                  onClick={handleSaveLead}
                  disabled={!customerName || !description}
                  className="w-full h-14 text-sm font-bold bg-blue-500 hover:bg-blue-700 text-white"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save Lead
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quote Editor */}
          {generatedQuote && (
            <>
              <ItemsTable
                items={generatedQuote.line_items}
                subtotal={generatedQuote.subtotal}
                taxRate={generatedQuote.tax_rate}
                total={generatedQuote.total}
                onItemsChange={handleItemsChange}
                onSaveItems={savedQuoteId || quoteId ? saveQuoteToDatabase : undefined}
              />

              {generatedQuote.notes && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm font-bold mb-2">📋 Installation Instructions / Job Description</div>
                  <div className="text-sm whitespace-pre-wrap">{generatedQuote.notes}</div>
                </div>
              )}

              <ActionButtons
                quoteId={quoteId}
                savedQuoteId={savedQuoteId}
                hasQuote={!!generatedQuote}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                isGenerating={isGenerating}
                isSending={isSending}
                onSaveQuote={handleSaveQuote}
                onUpdateQuote={handleUpdateQuote}
                onSendQuote={handleSendQuote}
                onRegenerateQuote={() => setGeneratedQuote(null)}
                onArchive={() => setArchiveDialogOpen(true)}
              />
            </>
          )}

          {/* AI Assistant (if quote is saved) */}
          {(savedQuoteId || quoteId) && generatedQuote && (
            <AIAssistant
              quoteId={savedQuoteId || quoteId}
              aiNotes={generatedQuote.notes}
              onUpdateWithAI={handleUpdateWithAI}
            />
          )}

          {/* Audit Trail - ALWAYS SHOW if quote/lead exists */}
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
    </div>
  )
}
