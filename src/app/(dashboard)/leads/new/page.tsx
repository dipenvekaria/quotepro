// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Save, ArrowLeft, Archive, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/action-button'
import { LeadForm } from '@/components/features/leads/LeadForm'
import { useDashboard } from '@/lib/dashboard-context'
import { ArchiveDialog } from '@/components/dialogs/archive-dialog'

export default function LeadEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workItemId = searchParams.get('id')
  const supabase = createClient()
  const { refreshWorkItems } = useDashboard()

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  useEffect(() => {
    loadUserAndLead()
  }, [workItemId])

  const loadUserAndLead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userRecord?.company_id) {
      setCompanyId(userRecord.company_id)
    }

    if (workItemId) {
      await loadExistingLead(workItemId)
    } else {
      setIsLoading(false)
    }
  }

  const loadExistingLead = async (id: string) => {
    try {
      const { data: lead, error } = await supabase
        .from('work_items')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !lead) {
        toast.error('Lead not found')
        router.push('/leads-and-quotes/leads')
        return
      }

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

      setCustomerId(lead.customer_id)
      setCustomerName(customer?.name || '')
      setCustomerEmail(customer?.email || '')
      setCustomerPhone(customer?.phone || '')
      setCustomerAddress(addresses?.[0]?.address || '')
      setCallNotes(lead.description || '')
      setIsEditMode(true)
    } catch (error) {
      console.error('Error loading lead:', error)
      toast.error('Failed to load lead')
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async (reason: string) => {
    if (!workItemId) return
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason
        })
        .eq('id', workItemId)

      if (error) throw error

      await supabase.from('activity_log').insert({
        company_id: companyId,
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        action: 'archived',
        description: `Lead archived: ${customerName} - ${reason}`,
      })

      toast.success('Lead archived')
      await refreshWorkItems()
      router.push('/leads-and-quotes/leads')
    } catch (error) {
      console.error('Error archiving lead:', error)
      toast.error('Failed to archive lead')
    }
  }

  const handleCreateQuote = async () => {
    if (!workItemId) return
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ status: 'draft' })
        .eq('id', workItemId)

      if (error) throw error

      toast.success('Creating quote...')
      await refreshWorkItems()
      
      // Navigate to quote editor
      sessionStorage.setItem('showAICard', 'true')
      router.push(`/quotes/new?id=${workItemId}`)
    } catch (error) {
      console.error('Error creating quote:', error)
      toast.error('Failed to create quote')
    }
  }

  const handleSaveLead = async () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!callNotes.trim()) {
      toast.error('Call notes are required')
      return
    }

    setIsSaving(true)
    try {
      if (isEditMode && workItemId) {
        if (customerId) {
          await supabase
            .from('customers')
            .update({
              name: customerName.trim(),
              email: customerEmail.trim() || null,
              phone: customerPhone.trim() || null,
            })
            .eq('id', customerId)

          if (customerAddress.trim()) {
            await supabase
              .from('customer_addresses')
              .upsert({
                customer_id: customerId,
                address: customerAddress.trim(),
                is_primary: true,
              })
          }
        }

        await supabase
          .from('work_items')
          .update({ description: callNotes.trim() })
          .eq('id', workItemId)

        await supabase.from('activity_log').insert({
          company_id: companyId,
          user_id: userId,
          entity_type: 'lead',
          entity_id: workItemId,
          action: 'updated',
          description: 'Lead updated: ' + customerName,
        })

        toast.success('Lead updated!')
      } else {
        let newCustomerId: string

        // First check if customer exists by phone or email
        let existingCustomer = null
        
        if (customerPhone.trim()) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', companyId)
            .eq('phone', customerPhone.trim())
            .maybeSingle()
          existingCustomer = data
        }
        
        if (!existingCustomer && customerEmail.trim()) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', companyId)
            .eq('email', customerEmail.trim())
            .maybeSingle()
          existingCustomer = data
        }

        if (existingCustomer) {
          // Update existing customer
          newCustomerId = existingCustomer.id
          await supabase
            .from('customers')
            .update({
              name: customerName.trim(),
              email: customerEmail.trim() || null,
              phone: customerPhone.trim() || null,
            })
            .eq('id', newCustomerId)
        } else {
          // Create new customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_id: companyId,
              name: customerName.trim(),
              email: customerEmail.trim() || null,
              phone: customerPhone.trim() || null,
            })
            .select()
            .single()

          if (customerError) throw customerError
          newCustomerId = customer.id
        }

        if (customerAddress.trim()) {
          await supabase
            .from('customer_addresses')
            .upsert({
              customer_id: newCustomerId,
              address: customerAddress.trim(),
              is_primary: true,
            })
        }

        // Use AI to classify job type from call notes (uses catalog job types)
        let jobType = ''
        try {
          const fetchPromise = fetch('/api/generate-job-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              description: callNotes.trim(),
              company_id: companyId,
              customer_name: customerName.trim(),
            }),
          })
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
          const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
          if (response.ok) {
            const data = await response.json()
            jobType = data.job_name || ''
          }
        } catch (error) {
          console.log('Job classification skipped:', error)
        }

        const { data: newWorkItem, error: workItemError } = await supabase
          .from('work_items')
          .insert({
            company_id: companyId,
            customer_id: newCustomerId,
            description: callNotes.trim(),
            status: 'lead',
            assigned_to: userId,
            created_by: userId,
            metadata: jobType ? { job_type: jobType } : {},
          })
          .select()
          .single()

        if (workItemError) throw workItemError

        await supabase.from('activity_log').insert({
          company_id: companyId,
          user_id: userId,
          entity_type: 'work_item',
          entity_id: newWorkItem.id,
          action: 'created',
          description: 'New lead: ' + customerName,
        })

        toast.success('Lead created!')
      }

      await refreshWorkItems()
      router.push('/leads-and-quotes/leads')
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Failed to save lead')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-safe overflow-x-hidden">
      {/* Header - Desktop only */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Lead' : 'New Lead'}
            </h1>
          </div>
          
          {/* Header Actions - Only show when editing */}
          {isEditMode && (
            <div className="flex items-center gap-2">
              <ActionButton
                variant="secondary"
                size="md"
                icon={FileText}
                onClick={() => {
                  // Convert lead to quote
                  handleCreateQuote()
                }}
              >
                Create Quote
              </ActionButton>
              <ActionButton
                variant="primary"
                size="md"
                icon={Save}
                loading={isSaving}
                disabled={!customerName || !callNotes}
                onClick={handleSaveLead}
              >
                Save
              </ActionButton>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Header - Simple */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Lead' : 'New Lead'}
          </h1>
        </div>
      </header>

      {/* Main Content - with bottom padding for mobile sticky button + bottom nav */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 pb-32 md:pb-6">
        <LeadForm
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          jobDescription={callNotes}
          isDescriptionReadOnly={false}
          companyId={companyId}
          onCustomerNameChange={setCustomerName}
          onCustomerEmailChange={setCustomerEmail}
          onCustomerPhoneChange={setCustomerPhone}
          onCustomerAddressChange={setCustomerAddress}
          onJobDescriptionChange={setCallNotes}
        />

        {/* Desktop Action Buttons - Only for New Leads */}
        {!isEditMode && (
          <div className="hidden md:block space-y-3">
            {/* Save Button - Primary CTA */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <ActionButton
                variant="primary"
                size="xl"
                icon={Save}
                loading={isSaving}
                disabled={!customerName || !callNotes}
                onClick={handleSaveLead}
                fullWidth
                className="shadow-lg shadow-blue-500/20"
              >
                Save Lead
              </ActionButton>
            </div>
          </div>
        )}

        {/* Archive Button - Desktop only, edit mode only */}
        {isEditMode && workItemId && (
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 p-4">
            <ActionButton
              variant="destructive"
              size="lg"
              icon={Archive}
              onClick={() => setArchiveDialogOpen(true)}
              fullWidth
            >
              Archive Lead
            </ActionButton>
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Button - Above bottom nav */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-50">
        <div className="bg-white border-t border-gray-200 p-3 shadow-2xl">
          <ActionButton
            variant="primary"
            size="xl"
            icon={Save}
            loading={isSaving}
            disabled={!customerName || !callNotes}
            onClick={handleSaveLead}
            fullWidth
            className="shadow-lg shadow-blue-500/30"
          >
            {isEditMode ? 'Save Changes' : 'Save Lead'}
          </ActionButton>
        </div>
      </div>

      {/* Archive Dialog */}
      <ArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchive}
        itemType="lead"
      />
    </div>
  )
}
