// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LeadForm } from '@/components/features/leads/LeadForm'
import { useDashboard } from '@/lib/dashboard-context'

export default function NewLeadPage() {
  const router = useRouter()
  const supabase = createClient()
  const { refreshQuotes } = useDashboard()

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
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
    setIsLoading(false)
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
      let customerId: string

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          company_id: companyId,
          name: customerName.trim(),
          email: customerEmail.trim() || null,
          phone: customerPhone.trim() || null,
        }, {
          onConflict: 'company_id,phone',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (customerError) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .eq('phone', customerPhone.trim())
          .single()

        if (existing) {
          customerId = existing.id
        } else {
          throw customerError
        }
      } else {
        customerId = customer.id
      }

      if (customerAddress.trim()) {
        await supabase
          .from('customer_addresses')
          .upsert({
            customer_id: customerId,
            address: customerAddress.trim(),
            is_primary: true,
          })
      }

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          company_id: companyId,
          customer_id: customerId,
          description: callNotes.trim(),
          status: 'new',
          source: 'direct',
          urgency: 'medium',
          assigned_to: userId,
        })
        .select()
        .single()

      if (leadError) throw leadError

      await supabase.from('activity_log').insert({
        company_id: companyId,
        user_id: userId,
        entity_type: 'lead',
        entity_id: newLead.id,
        action: 'created',
        description: 'New lead: ' + customerName,
      })

      toast.success('Lead created!')
      await refreshQuotes()
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
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">New Lead</h1>
          </div>
          
          <Button
            onClick={handleSaveLead}
            disabled={!customerName || !callNotes || isSaving}
            className="h-10 px-5 bg-[#0055FF] hover:bg-blue-600 text-white font-medium rounded-xl"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
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
      </main>
    </div>
  )
}
