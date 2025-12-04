// @ts-nocheck// @ts-nocheck

'use client''use client'



import { useState, useEffect } from 'react'import { useState, useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'import { createClient } from '@/lib/supabase/client'

import { useRouter, useSearchParams } from 'next/navigation'import { useRouter } from 'next/navigation'

import { Loader2, Save, ArrowLeft } from 'lucide-react'import { Loader2, Save, ArrowLeft } from 'lucide-react'

import { toast } from 'sonner'import { toast } from 'sonner'

import { Button } from '@/components/ui/button'import { Button } from '@/components/ui/button'

import { LeadForm } from '@/components/features/leads/LeadForm'import { LeadForm } from '@/components/features/leads/LeadForm'

import { useDashboard } from '@/lib/dashboard-context'import { useDashboard } from '@/lib/dashboard-context'



export default function LeadEditorPage() {export default function NewLeadPage() {

  const router = useRouter()  const router = useRouter()

  const searchParams = useSearchParams()  const supabase = createClient()

  const leadId = searchParams.get('id')  const { refreshQuotes } = useDashboard()

  const supabase = createClient()

  const { refreshQuotes } = useDashboard()  const [customerName, setCustomerName] = useState('')

  const [customerEmail, setCustomerEmail] = useState('')

  // Customer state  const [customerPhone, setCustomerPhone] = useState('')

  const [customerName, setCustomerName] = useState('')  const [customerAddress, setCustomerAddress] = useState('')

  const [customerEmail, setCustomerEmail] = useState('')  const [callNotes, setCallNotes] = useState('')

  const [customerPhone, setCustomerPhone] = useState('')  const [companyId, setCompanyId] = useState<string>('')

  const [customerAddress, setCustomerAddress] = useState('')  const [userId, setUserId] = useState<string>('')

  const [callNotes, setCallNotes] = useState('')  const [isSaving, setIsSaving] = useState(false)

    const [isLoading, setIsLoading] = useState(true)

  // Lead state

  const [customerId, setCustomerId] = useState<string | null>(null)  useEffect(() => {

  const [companyId, setCompanyId] = useState<string>('')    loadUser()

  const [userId, setUserId] = useState<string>('')  }, [])

  

  // UI state  const loadUser = async () => {

  const [isSaving, setIsSaving] = useState(false)    const { data: { user } } = await supabase.auth.getUser()

  const [isLoading, setIsLoading] = useState(true)    if (!user) {

  const [isEditMode, setIsEditMode] = useState(false)      router.push('/login')

      return

  useEffect(() => {    }

    loadUserAndLead()    setUserId(user.id)

  }, [leadId])

    const { data: userRecord } = await supabase

  const loadUserAndLead = async () => {      .from('users')

    const { data: { user } } = await supabase.auth.getUser()      .select('company_id')

    if (!user) {      .eq('id', user.id)

      router.push('/login')      .single()

      return

    }    if (userRecord?.company_id) {

    setUserId(user.id)      setCompanyId(userRecord.company_id)

    }

    const { data: userRecord } = await supabase    setIsLoading(false)

      .from('users')  }

      .select('company_id')

      .eq('id', user.id)  const handleSaveLead = async () => {

      .single()    if (!customerName.trim()) {

      toast.error('Customer name is required')

    if (userRecord?.company_id) {      return

      setCompanyId(userRecord.company_id)    }

    }    if (!callNotes.trim()) {

      toast.error('Call notes are required')

    // If leadId exists, load the existing lead      return

    if (leadId) {    }

      await loadExistingLead(leadId)

    } else {    setIsSaving(true)

      setIsLoading(false)    try {

    }      let customerId: string

  }

      const { data: customer, error: customerError } = await supabase

  const loadExistingLead = async (id: string) => {        .from('customers')

    try {        .upsert({

      const { data: lead, error } = await supabase          company_id: companyId,

        .from('leads')          name: customerName.trim(),

        .select('*')          email: customerEmail.trim() || null,

        .eq('id', id)          phone: customerPhone.trim() || null,

        .single()        }, {

          onConflict: 'company_id,phone',

      if (error || !lead) {          ignoreDuplicates: false

        toast.error('Lead not found')        })

        router.push('/leads-and-quotes/leads')        .select()

        return        .single()

      }

      if (customerError) {

      // Load customer data        const { data: existing } = await supabase

      const { data: customer } = await supabase          .from('customers')

        .from('customers')          .select('id')

        .select('*')          .eq('company_id', companyId)

        .eq('id', lead.customer_id)          .eq('phone', customerPhone.trim())

        .single()          .single()



      const { data: addresses } = await supabase        if (existing) {

        .from('customer_addresses')          customerId = existing.id

        .select('*')        } else {

        .eq('customer_id', lead.customer_id)          throw customerError

        .eq('is_primary', true)        }

        .limit(1)      } else {

        customerId = customer.id

      setCustomerId(lead.customer_id)      }

      setCustomerName(customer?.name || '')

      setCustomerEmail(customer?.email || '')      if (customerAddress.trim()) {

      setCustomerPhone(customer?.phone || '')        await supabase

      setCustomerAddress(addresses?.[0]?.address || '')          .from('customer_addresses')

      setCallNotes(lead.description || '')          .upsert({

      setIsEditMode(true)            customer_id: customerId,

    } catch (error) {            address: customerAddress.trim(),

      console.error('Error loading lead:', error)            is_primary: true,

      toast.error('Failed to load lead')          })

    } finally {      }

      setIsLoading(false)

    }      const { data: newLead, error: leadError } = await supabase

  }        .from('leads')

        .insert({

  const handleSaveLead = async () => {          company_id: companyId,

    if (!customerName.trim()) {          customer_id: customerId,

      toast.error('Customer name is required')          description: callNotes.trim(),

      return          status: 'new',

    }          source: 'direct',

    if (!callNotes.trim()) {          urgency: 'medium',

      toast.error('Call notes are required')          assigned_to: userId,

      return        })

    }        .select()

        .single()

    setIsSaving(true)

    try {      if (leadError) throw leadError

      if (isEditMode && leadId) {

        // UPDATE existing lead      await supabase.from('activity_log').insert({

        // Update customer info        company_id: companyId,

        if (customerId) {        user_id: userId,

          await supabase        entity_type: 'lead',

            .from('customers')        entity_id: newLead.id,

            .update({        action: 'created',

              name: customerName.trim(),        description: 'New lead: ' + customerName,

              email: customerEmail.trim() || null,      })

              phone: customerPhone.trim() || null,

            })      toast.success('Lead created!')

            .eq('id', customerId)      await refreshQuotes()

      router.push('/leads-and-quotes/leads')

          // Update address    } catch (error) {

          if (customerAddress.trim()) {      console.error('Error saving lead:', error)

            await supabase      toast.error('Failed to save lead')

              .from('customer_addresses')    } finally {

              .upsert({      setIsSaving(false)

                customer_id: customerId,    }

                address: customerAddress.trim(),  }

                is_primary: true,

              })  if (isLoading) {

          }    return (

        }      <div className="flex items-center justify-center py-20">

        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />

        // Update lead      </div>

        await supabase    )

          .from('leads')  }

          .update({

            description: callNotes.trim(),  return (

          })    <div className="min-h-[100dvh] bg-gray-50">

          .eq('id', leadId)      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">

        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

        // Log activity          <div className="flex items-center gap-3">

        await supabase.from('activity_log').insert({            <Button

          company_id: companyId,              variant="ghost"

          user_id: userId,              size="icon"

          entity_type: 'lead',              onClick={() => router.back()}

          entity_id: leadId,              className="h-9 w-9"

          action: 'updated',            >

          description: 'Lead updated: ' + customerName,              <ArrowLeft className="h-5 w-5" />

        })            </Button>

            <h1 className="text-xl font-semibold text-gray-900">New Lead</h1>

        toast.success('Lead updated!')          </div>

      } else {          

        // CREATE new lead          <Button

        let newCustomerId: string            onClick={handleSaveLead}

            disabled={!customerName || !callNotes || isSaving}

        const { data: customer, error: customerError } = await supabase            className="h-10 px-5 bg-[#0055FF] hover:bg-blue-600 text-white font-medium rounded-xl"

          .from('customers')          >

          .upsert({            {isSaving ? (

            company_id: companyId,              <Loader2 className="h-4 w-4 animate-spin" />

            name: customerName.trim(),            ) : (

            email: customerEmail.trim() || null,              <>

            phone: customerPhone.trim() || null,                <Save className="h-4 w-4 mr-1.5" />

          }, {                Save

            onConflict: 'company_id,phone',              </>

            ignoreDuplicates: false            )}

          })          </Button>

          .select()        </div>

          .single()      </header>



        if (customerError) {      <main className="max-w-2xl mx-auto px-4 py-6">

          const { data: existing } = await supabase        <LeadForm

            .from('customers')          customerName={customerName}

            .select('id')          customerEmail={customerEmail}

            .eq('company_id', companyId)          customerPhone={customerPhone}

            .eq('phone', customerPhone.trim())          customerAddress={customerAddress}

            .single()          jobDescription={callNotes}

          isDescriptionReadOnly={false}

          if (existing) {          companyId={companyId}

            newCustomerId = existing.id          onCustomerNameChange={setCustomerName}

          } else {          onCustomerEmailChange={setCustomerEmail}

            throw customerError          onCustomerPhoneChange={setCustomerPhone}

          }          onCustomerAddressChange={setCustomerAddress}

        } else {          onJobDescriptionChange={setCallNotes}

          newCustomerId = customer.id        />

        }      </main>

    </div>

        if (customerAddress.trim()) {  )

          await supabase}

            .from('customer_addresses')
            .upsert({
              customer_id: newCustomerId,
              address: customerAddress.trim(),
              is_primary: true,
            })
        }

        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            company_id: companyId,
            customer_id: newCustomerId,
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
      }

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
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Lead' : 'New Lead'}
            </h1>
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
