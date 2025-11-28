// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Wrench, Edit2, Trash2, Plus, Save, X, Bot } from 'lucide-react'
import Link from 'next/link'
import { AuditTrail } from '@/components/audit-trail'

interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  option_tier?: string | null
  is_upsell?: boolean
  is_discount?: boolean
}

interface GeneratedQuote {
  line_items: QuoteItem[]
  options: { tier: string; items: QuoteItem[] }[]
  subtotal: number
  tax_rate: number
  total: number
  notes?: string
  upsell_suggestions?: string[]
}

export default function NewQuotePage() {
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('id')
  
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null)
  const [companyId, setCompanyId] = useState<string>('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editedItem, setEditedItem] = useState<QuoteItem | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItem, setNewItem] = useState<QuoteItem>({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0,
  })
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [aiUpdatePrompt, setAiUpdatePrompt] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isUpdatingWithAI, setIsUpdatingWithAI] = useState(false)
  const [quoteNotes, setQuoteNotes] = useState('')
  const [originalNotes, setOriginalNotes] = useState('')
  const [origin, setOrigin] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    // Set origin on client side only
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
    
    loadCompany()
    if (quoteId) {
      loadExistingQuote(quoteId)
      loadAuditLogs(quoteId)
    }
  }, [quoteId])

  // Auto-lookup customer by phone number
  useEffect(() => {
    if (!customerPhone || quoteId) return // Don't lookup if editing existing quote
    
    const timeoutId = setTimeout(() => {
      lookupCustomerByPhone(customerPhone)
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timeoutId)
  }, [customerPhone, companyId])
  
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
        setPhotos(quote.photos || [])
        setQuoteNotes(quote.notes || '')
        setOriginalNotes(quote.notes || '') // Track original for audit
        
        // Set generated quote data
        if (quote.quote_items && quote.quote_items.length > 0) {
          setGeneratedQuote({
            line_items: quote.quote_items.map((item: any) => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
              option_tier: item.option_tier,
              is_upsell: item.is_upsell
            })),
            options: [],
            subtotal: quote.subtotal || 0,
            tax_rate: quote.tax_rate || 0,
            tax_amount: quote.tax_amount || 0,
            total: quote.total || 0,
            // AI-generated notes are not stored in database, only in state during session
            // When loading existing quote, there are no AI notes to show
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

  const handleUpdateWithAI = async () => {
    if (!aiUpdatePrompt.trim()) {
      toast.error('Please enter a request')
      return
    }

    const currentQuoteId = savedQuoteId || quoteId
    if (!currentQuoteId) {
      toast.error('Please save the quote first')
      return
    }

    setIsUpdatingWithAI(true)
    try {
      const response = await fetch('/api/update-quote-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: currentQuoteId,
          company_id: companyId,
          user_prompt: aiUpdatePrompt,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update quote')
      }

      const data = await response.json()
      
      // Update quote items with new data - preserve tax_rate AND update AI notes
      const updatedQuote = {
        ...generatedQuote,
        line_items: data.line_items,
        subtotal: data.subtotal,
        tax_rate: data.tax_rate || generatedQuote.tax_rate || 0,
        total: data.total,
        notes: data.notes || generatedQuote.notes, // Update AI-generated notes
      }
      
      setGeneratedQuote(updatedQuote)

      // Save updated items to database
      const subtotal = Number(updatedQuote.subtotal) || 0
      const taxRate = Number(updatedQuote.tax_rate) || 0
      const taxAmount = subtotal * (taxRate / 100)
      const total = Number(updatedQuote.total) || (subtotal + taxAmount)
      
      // Update the quote in database
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: total,
          lead_status: 'quoted', // Ensure status is quoted when items exist
          // AI notes are stored in generatedQuote state, not in database notes field
          // Database notes field is for internal company notes only
        })
        .eq('id', currentQuoteId)

      if (quoteError) throw quoteError

      // Delete existing quote items
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', currentQuoteId)

      // Insert updated quote items
      const items = updatedQuote.line_items.map((item, index) => ({
        quote_id: currentQuoteId,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        option_tier: item.option_tier || null,
        is_upsell: item.is_upsell || false,
        sort_order: index,
      }))

      await supabase
        .from('quote_items')
        .insert(items)
      
      // Create audit log entry for AI update
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        const userName = profile?.full_name || profile?.email || user.email || 'User'
        
        // Log the AI update with details about what changed
        await supabase.from('quote_audit_log').insert({
          quote_id: currentQuoteId,
          action_type: 'ai_update',
          description: `Quote updated with AI by ${userName}: "${aiUpdatePrompt}"`,
          changes_made: {
            user_prompt: aiUpdatePrompt,
            items_changed: data.line_items.length,
            ai_instructions: data.notes || '(none)',
            old_total: generatedQuote?.total || 0,
            new_total: total,
          },
          created_by: user.id,
        })
      }
      
      // Reload audit logs
      await loadAuditLogs(currentQuoteId)
      
      setAiUpdatePrompt('')
      toast.success('Quote updated')
    } catch (error) {
      console.error('AI update error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update quote')
    } finally {
      setIsUpdatingWithAI(false)
    }
  }

  // Recalculate quote totals when customer address changes
  const recalculateQuoteForAddress = async (newAddress: string) => {
    if (!generatedQuote || !companyId || !newAddress) return

    try {
      // Call Python backend to get new tax rate
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
      
      // Recalculate totals with new tax rate
      const subtotal = generatedQuote.line_items.reduce((sum, item) => sum + item.total, 0)
      const total = subtotal + (subtotal * (tax_rate / 100))
      
      setGeneratedQuote({
        ...generatedQuote,
        tax_rate,
        subtotal,
        total,
      })

      // If quote is saved, update it in the database
      if (savedQuoteId || quoteId) {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            customer_address: newAddress,
            tax_rate,
            total,
          })
          .eq('id', savedQuoteId || quoteId)

        if (updateError) {
          console.error('Failed to update quote:', updateError)
        } else {
          toast.success(`Tax rate updated to ${tax_rate.toFixed(2)}%`)
        }
      }
    } catch (error) {
      console.error('Error recalculating quote:', error)
    }
  }

  useEffect(() => {
    if (customerAddress.length < 3) {
      setAddressSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(customerAddress)}&format=json&addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'QuoteBuilder Pro'
            }
          }
        )
        const data = await response.json()
        setAddressSuggestions(data)
      } catch (error) {
        console.error('Address lookup failed:', error)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [customerAddress])

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
      // @ts-ignore - Supabase typing issue
      setCompanyId(company.id)
      setCompanyLogo(company.logo_url)
    }
  }

  const lookupCustomerByPhone = async (phone: string) => {
    // Only lookup if phone has at least 10 digits
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 10 || !companyId) return

    try {
      // Search for existing customer with this phone number
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
        
        // Only auto-fill if fields are empty (don't overwrite existing data)
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPhotos: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onloadend = () => {
        newPhotos.push(reader.result as string)
        if (newPhotos.length === files.length) {
          setPhotos([...photos, ...newPhotos])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        // Here you would typically send to a speech-to-text API
        // For now, we'll show a placeholder message
        toast.info('Voice-to-text feature coming soon - please type your description')
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast.info('Recording... Release to stop')
    } catch (error) {
      toast.error('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleGenerate = async () => {
    if (!customerName.trim() || !description.trim()) {
      toast.error('Please enter customer name and job description')
      return
    }

    setIsGenerating(true)
    
    // Show loading toast with contractor-friendly message
    const loadingToast = toast.loading('Building your quote… this beats Word by a mile ;)')

    try {
      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          description,
          customer_name: customerName,
          customer_address: customerAddress || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate quote')

      const data = await response.json()
      setGeneratedQuote(data)
      toast.success('Quote generated!', { id: loadingToast })
    } catch (error) {
      toast.error('Failed to generate quote', { id: loadingToast })
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate quote from saved lead
  const handleGenerateQuote = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what should be included in the quote')
      return
    }

    setIsGenerating(true)
    const loadingToast = toast.loading('Building your quote… this beats Word by a mile ;)')

    try {
      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          description: aiPrompt,
          customer_name: customerName,
          customer_address: customerAddress || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate quote')

      const data = await response.json()
      setGeneratedQuote(data)
      toast.success('Quote generated!', { id: loadingToast })
      setAiPrompt('') // Clear the prompt after generation
    } catch (error) {
      toast.error('Failed to generate quote', { id: loadingToast })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditItem = (index: number) => {
    if (!generatedQuote) return
    setEditingItemIndex(index)
    setEditedItem({ ...generatedQuote.line_items[index] })
  }

  const handleSaveEdit = async () => {
    if (!generatedQuote || editingItemIndex === null || !editedItem) return
    
    const oldItem = generatedQuote.line_items[editingItemIndex]
    const updatedItems = [...generatedQuote.line_items]
    // Recalculate total for the item
    editedItem.total = editedItem.quantity * editedItem.unit_price
    updatedItems[editingItemIndex] = editedItem
    
    // Recalculate quote totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    const total = subtotal + (subtotal * (generatedQuote.tax_rate / 100))
    
    setGeneratedQuote({
      ...generatedQuote,
      line_items: updatedItems,
      subtotal,
      total,
    })
    
    // Log to audit trail
    if (savedQuoteId || quoteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('quote_audit_log').insert({
          quote_id: savedQuoteId || quoteId,
          action_type: 'item_modified',
          description: `Modified "${editedItem.name}"`,
          changes_made: {
            old: oldItem,
            new: editedItem,
          },
          created_by: user.id,
        })
        await loadAuditLogs(savedQuoteId || quoteId)
      }
    }
    
    setEditingItemIndex(null)
    setEditedItem(null)
    toast.success('Item updated')
  }

  const handleCancelEdit = () => {
    setEditingItemIndex(null)
    setEditedItem(null)
  }

  const handleSaveNotes = async () => {
    const currentQuoteId = savedQuoteId || quoteId
    if (!currentQuoteId) {
      toast.error('Please save the quote first')
      return
    }

    // Check if notes actually changed
    if (quoteNotes === originalNotes) {
      toast.info('No changes to save')
      return
    }

    try {
      // Update notes in database
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ notes: quoteNotes || null })
        .eq('id', currentQuoteId)

      if (updateError) {
        console.error('Database update error:', updateError)
        throw updateError
      }

      // Log to audit trail
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        throw userError
      }

      if (user) {
        // Get user profile for name
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        }

        const userName = profile?.full_name || profile?.email || user.email || 'User'
        
        const { error: auditError } = await supabase.from('quote_audit_log').insert({
          quote_id: currentQuoteId,
          action_type: 'notes_updated',
          description: `Internal notes ${originalNotes ? 'updated' : 'added'} by ${userName}`,
          changes_made: {
            old_notes: originalNotes || '(empty)',
            new_notes: quoteNotes || '(empty)',
          },
          created_by: user.id,
        })

        if (auditError) {
          console.error('Audit log error:', auditError)
          // Don't throw - notes were saved successfully
        }

        // Update original notes to current value
        setOriginalNotes(quoteNotes)
        
        // Reload audit logs to show the new entry
        await loadAuditLogs(currentQuoteId)
        
        toast.success(`Notes saved by ${userName}`)
      }
    } catch (error: any) {
      console.error('Error saving notes:', error)
      toast.error(`Failed to save notes: ${error.message || 'Unknown error'}`)
    }
  }

  const handleSaveLead = async () => {
    if (!customerName || !description) {
      toast.error('Please fill in customer name and job description')
      return
    }

    try {
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
            },
            created_by: user.id,
          })
        }

        toast.success('Lead updated successfully!')
        await loadAuditLogs(quoteId)
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
          },
          created_by: user.id,
        })
      }

      toast.success('Lead saved successfully!')
      setSavedQuoteId(newLead.id)
      
      // Update URL with new lead ID
      router.push(`/leads/new?id=${newLead.id}`)
      await loadAuditLogs(newLead.id)
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Failed to save lead')
    }
  }

  const handleDeleteItem = async (index: number) => {
    if (!generatedQuote) return
    
    const deletedItem = generatedQuote.line_items[index]
    const updatedItems = generatedQuote.line_items.filter((_, i) => i !== index)
    
    // Recalculate quote totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    const total = subtotal + (subtotal * (generatedQuote.tax_rate / 100))
    
    setGeneratedQuote({
      ...generatedQuote,
      line_items: updatedItems,
      subtotal,
      total,
    })
    
    // Log to audit trail
    if (savedQuoteId || quoteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('quote_audit_log').insert({
          quote_id: savedQuoteId || quoteId,
          action_type: 'item_deleted',
          description: `Deleted "${deletedItem.name}"`,
          changes_made: {
            removed_items: [deletedItem],
          },
          created_by: user.id,
        })
        await loadAuditLogs(savedQuoteId || quoteId)
      }
    }
    
    toast.success('Item removed')
  }

  const handleAddItem = () => {
    setIsAddingItem(true)
    setNewItem({
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      is_discount: false,
    })
  }

  const handleSaveNewItem = async () => {
    if (!generatedQuote || !newItem.name || newItem.unit_price === 0) {
      toast.error('Please enter item name and price')
      return
    }
    
    // Validate discount logic
    if (newItem.is_discount && newItem.unit_price > 0) {
      toast.error('Discount amounts must be negative (e.g., -100)')
      return
    }
    
    if (!newItem.is_discount && newItem.unit_price < 0) {
      toast.error('Regular items cannot have negative prices. Check "Discount" checkbox for discounts.')
      return
    }
    
    // Calculate total for new item
    newItem.total = newItem.quantity * newItem.unit_price
    
    const updatedItems = [...generatedQuote.line_items, newItem]
    
    // Recalculate quote totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    const total = subtotal + (subtotal * (generatedQuote.tax_rate / 100))
    
    setGeneratedQuote({
      ...generatedQuote,
      line_items: updatedItems,
      subtotal,
      total,
    })
    
    // Log to audit trail
    if (savedQuoteId || quoteId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('quote_audit_log').insert({
          quote_id: savedQuoteId || quoteId,
          action_type: 'item_added',
          description: `Added "${newItem.name}"`,
          changes_made: {
            added_items: [newItem],
          },
          created_by: user.id,
        })
        await loadAuditLogs(savedQuoteId || quoteId)
      }
    }
    
    setIsAddingItem(false)
    toast.success('Item added')
  }

  const handleCancelAddItem = () => {
    setIsAddingItem(false)
    setNewItem({
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      is_discount: false,
    })
  }

  const handleSaveQuote = async () => {
    if (!generatedQuote) return

    setIsGenerating(true)
    try {
      // If editing an existing lead/quote, update it instead of inserting
      if (quoteId) {
        // Update existing quote
        const subtotal = Number(generatedQuote.subtotal) || 0
        const taxRate = Number(generatedQuote.tax_rate) || 0
        const taxAmount = subtotal * (taxRate / 100)
        const total = Number(generatedQuote.total) || (subtotal + taxAmount)

        const { error: quoteError } = await supabase
          .from('quotes')
          .update({
            customer_name: customerName,
            customer_email: customerEmail || null,
            customer_phone: customerPhone || null,
            customer_address: customerAddress || null,
            description,
            subtotal: subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total: total,
            // notes: handled separately via handleSaveNotes
            photos: photos,
            lead_status: 'quoted', // Move from lead to quote status
          })
          .eq('id', quoteId)

        if (quoteError) throw quoteError

        // Delete existing items and insert new ones
        await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteId)

        const items = generatedQuote.line_items.map((item, index) => ({
          quote_id: quoteId,
          name: item.name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          option_tier: item.option_tier || null,
          is_upsell: item.is_upsell || false,
          sort_order: index,
        }))

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(items)

        if (itemsError) throw itemsError

        // Log to audit trail
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('quote_audit_log').insert({
            quote_id: quoteId,
            action_type: 'ai_generation',
            user_prompt: description,
            description: `Quote updated with ${generatedQuote.line_items.length} items`,
            changes_made: {
              updated_items: generatedQuote.line_items,
            },
            created_by: user.id,
          })
        }

        // Generate PDF
        try {
          const pdfResponse = await fetch(`/api/quotes/${quoteId}/generate-pdf`, {
            method: 'POST',
          })
          
          if (pdfResponse.ok) {
            const pdfData = await pdfResponse.json()
            console.log('✅ PDF generated successfully!')
          }
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError)
        }

        toast.success('Quote saved successfully!')
        setSavedQuoteId(quoteId)
        await loadAuditLogs(quoteId)
        return
      }

      // Create new quote
      const quoteNumber = `Q-${Date.now().toString().slice(-8)}`
      
      // Ensure all numeric values are valid
      const subtotal = Number(generatedQuote.subtotal) || 0
      const taxRate = Number(generatedQuote.tax_rate) || 0
      const taxAmount = subtotal * (taxRate / 100)
      const total = Number(generatedQuote.total) || (subtotal + taxAmount)
      
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          quote_number: quoteNumber,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          description,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: total,
          // notes: null initially, can be added later via handleSaveNotes
          photos: photos,
          status: 'draft',
          lead_status: 'quoted', // Move from lead to quote status
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Insert quote items
      const items = generatedQuote.line_items.map((item, index) => ({
        // @ts-ignore
        quote_id: quote.id,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        option_tier: item.option_tier || null,
        is_upsell: item.is_upsell || false,
        sort_order: index,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(items)

      if (itemsError) throw itemsError

      // Log to audit trail
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('quote_audit_log').insert({
          // @ts-ignore
          quote_id: quote.id,
          action_type: 'ai_generation',
          user_prompt: description,
          description: `Quote created with ${generatedQuote.line_items.length} items`,
          changes_made: {
            added_items: generatedQuote.line_items,
          },
          created_by: user.id,
        })
      }

      // Generate PDF
      try {
        // @ts-ignore
        const pdfResponse = await fetch(`/api/quotes/${quote.id}/generate-pdf`, {
          method: 'POST',
        })
        
        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json()
          console.log('✅ PDF generated successfully!')
          console.log('📄 File saved to:', pdfData.pdf_path)
          console.log('📝 Filename:', pdfData.pdf_filename)
          console.log('💡 Open this file on your Mac to view the PDF')
        } else {
          console.error('PDF generation failed, but continuing...')
        }
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        // Don't fail the save if PDF generation fails
      }

      toast.success('Quote saved successfully!')
      // @ts-ignore
      setSavedQuoteId(quote.id)
      // Reload audit logs
      // @ts-ignore
      await loadAuditLogs(quote.id)
      // Don't redirect immediately - allow user to send the quote
    } catch (error: unknown) {
      const err = error as { message: string }
      toast.error(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateQuote = async () => {
    if (!generatedQuote || (!savedQuoteId && !quoteId)) return

    setIsGenerating(true)
    try {
      const currentQuoteId = savedQuoteId || quoteId
      
      // Ensure all numeric values are valid
      const subtotal = Number(generatedQuote.subtotal) || 0
      const taxRate = Number(generatedQuote.tax_rate) || 0
      const taxAmount = subtotal * (taxRate / 100)
      const total = Number(generatedQuote.total) || (subtotal + taxAmount)
      
      // Update the quote
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          description,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: total,
          // notes are updated separately via handleSaveNotes
          photos: photos,
          lead_status: 'quoted', // Ensure lead_status is set when updating
        })
        .eq('id', currentQuoteId)

      if (quoteError) throw quoteError

      // Delete existing quote items
      const { error: deleteError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', currentQuoteId)

      if (deleteError) throw deleteError

      // Insert updated quote items
      const items = generatedQuote.line_items.map((item, index) => ({
        quote_id: currentQuoteId,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        option_tier: item.option_tier || null,
        is_upsell: item.is_upsell || false,
        sort_order: index,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(items)

      if (itemsError) throw itemsError

      // Regenerate PDF after update
      try {
        const pdfResponse = await fetch(`/api/quotes/${currentQuoteId}/generate-pdf`, {
          method: 'POST',
        })
        
        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json()
          console.log('✅ PDF regenerated successfully!')
          console.log('📄 File saved to:', pdfData.pdf_path)
          console.log('📝 Filename:', pdfData.pdf_filename)
          console.log('💡 Open this file on your Mac to view the PDF')
        } else {
          console.error('PDF regeneration failed, but continuing...')
        }
      } catch (pdfError) {
        console.error('PDF regeneration error:', pdfError)
        // Don't fail the update if PDF generation fails
      }

      toast.success('Quote updated successfully!')
    } catch (error: unknown) {
      const err = error as { message: string }
      toast.error(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendQuote = async () => {
    if (!savedQuoteId && !quoteId) {
      toast.error('Please save the quote first')
      return
    }

    if (!customerEmail && !customerPhone) {
      toast.error('Please add customer email or phone number to send quote')
      return
    }

    setIsSending(true)
    try {
      // Determine send method
      let sendVia = 'both'
      if (customerEmail && !customerPhone) sendVia = 'email'
      if (customerPhone && !customerEmail) sendVia = 'sms'

      const response = await fetch('/api/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: savedQuoteId || quoteId,
          send_via: sendVia,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send quote')
      }

      toast.success('Quote sent successfully!')
      router.push('/dashboard')
    } catch (error: unknown) {
      const err = error as { message: string }
      toast.error(err.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="pb-20 min-w-0">
        {/* Header - Updated to match new theme */}
        <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 dark:bg-orange-600 p-2 rounded-lg">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {quoteId ? 'Edit Lead' : 'New Lead'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {customerName || 'Enter customer details to get started'}
                  {quoteId && ` • Lead ID: ${quoteId}`}
                </p>
              </div>
            </div>
          </div>
        </header>

      {isLoadingQuote ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#FF6200]" />
            <p className="text-muted-foreground">Loading quote...</p>
          </div>
        </div>
      ) : (
        <main className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        
        {/* 1. GENERATED QUOTE - Show when quote exists */}
        {generatedQuote && (
          <Card className="border-[#FF6200] border-2">
            <CardHeader className="bg-[#FF6200]/5 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#FF6200]">Generated Quote</CardTitle>
                <Button
                  onClick={handleAddItem}
                  variant="outline"
                  size="sm"
                  className="gap-2 relative z-20"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                {generatedQuote.line_items.map((item, index) => (
                  <div key={index}>
                    {editingItemIndex === index ? (
                      // Edit Mode
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-700 space-y-3">
                        {/* Discount Checkbox in Edit Mode */}
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                          <input
                            type="checkbox"
                            id="edit-is-discount"
                            checked={editedItem?.is_discount || editedItem?.unit_price < 0 || false}
                            onChange={(e) => {
                              if (!editedItem) return
                              const isDiscount = e.target.checked
                              setEditedItem({ 
                                ...editedItem, 
                                is_discount: isDiscount,
                                unit_price: isDiscount && editedItem.unit_price > 0 ? -Math.abs(editedItem.unit_price) : editedItem.unit_price,
                              })
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor="edit-is-discount" className="text-sm font-medium cursor-pointer select-none">
                            This is a discount
                          </label>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Item Name</Label>
                          <Input
                            value={editedItem?.name || ''}
                            onChange={(e) => setEditedItem(editedItem ? { ...editedItem, name: e.target.value } : null)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Description (optional)</Label>
                          <Input
                            value={editedItem?.description || ''}
                            onChange={(e) => setEditedItem(editedItem ? { ...editedItem, description: e.target.value } : null)}
                            className="h-9"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={editedItem?.quantity || 1}
                              onChange={(e) => setEditedItem(editedItem ? { ...editedItem, quantity: parseInt(e.target.value) || 1 } : null)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Unit Price ($)
                              {(editedItem?.is_discount || editedItem?.unit_price < 0) && <span className="text-red-600 font-semibold"> (negative)</span>}
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editedItem?.unit_price || 0}
                              onChange={(e) => setEditedItem(editedItem ? { ...editedItem, unit_price: parseFloat(e.target.value) || 0 } : null)}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm" className="flex-1 gap-1">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                          <Button onClick={handleCancelEdit} variant="outline" size="sm" className="flex-1 gap-1">
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className={`flex justify-between items-start p-3 rounded-lg group ${
                        item.is_discount || item.unit_price < 0 
                          ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' 
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}>
                        <div className="flex-1">
                          <div className={`font-semibold ${
                            item.is_discount || item.unit_price < 0 
                              ? 'text-green-700 dark:text-green-400' 
                              : ''
                          }`}>
                            {item.is_discount || item.unit_price < 0 ? '💰 ' : ''}{item.name}
                          </div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                          <div className="text-sm">
                            Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`font-semibold ${
                            item.is_discount || item.unit_price < 0 
                              ? 'text-green-700 dark:text-green-400' 
                              : ''
                          }`}>
                            ${item.total.toFixed(2)}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => handleEditItem(index)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteItem(index)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Item Form */}
                {isAddingItem && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-300 dark:border-green-700 space-y-3">
                    <div className="font-semibold text-green-700 dark:text-green-300 mb-2">Add New Item</div>
                    
                    {/* Discount Checkbox */}
                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                      <input
                        type="checkbox"
                        id="is-discount"
                        checked={newItem.is_discount || false}
                        onChange={(e) => {
                          const isDiscount = e.target.checked
                          setNewItem({ 
                            ...newItem, 
                            is_discount: isDiscount,
                            // If switching to discount mode, make price negative
                            unit_price: isDiscount && newItem.unit_price > 0 ? -Math.abs(newItem.unit_price) : newItem.unit_price,
                            // Optionally prefix name with "Discount: " when enabling
                            name: isDiscount && newItem.name && !newItem.name.startsWith('Discount: ') ? `Discount: ${newItem.name}` : newItem.name.replace('Discount: ', '')
                          })
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="is-discount" className="text-sm font-medium cursor-pointer select-none">
                        This is a discount
                        <span className="text-xs text-muted-foreground block">
                          {newItem.is_discount ? '✓ Enter negative price (e.g., -100)' : 'Check to add discount/no charge items'}
                        </span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Item Name *</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder={newItem.is_discount ? "e.g., Discount: 10% off labor, No Charge: Materials" : "e.g., Labor, Materials, Trip charge"}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={newItem.description || ''}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Additional details"
                        className="h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Unit Price ($) * {newItem.is_discount && <span className="text-red-600 font-semibold">(negative)</span>}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newItem.unit_price}
                          onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                          className="h-9"
                          placeholder={newItem.is_discount ? "-100.00" : "0.00"}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveNewItem} size="sm" className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                        <Plus className="h-3 w-3" />
                        Add Item
                      </Button>
                      <Button onClick={handleCancelAddItem} variant="outline" size="sm" className="flex-1 gap-1">
                        <X className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${generatedQuote.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({generatedQuote.tax_rate?.toFixed(2) || '0.00'}%):</span>
                  <span>${(generatedQuote.subtotal * ((generatedQuote.tax_rate || 0) / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-[#FF6200]">${generatedQuote.total.toFixed(2)}</span>
                </div>
              </div>

              {generatedQuote.notes && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                    📋 Installation Instructions / Job Description
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{generatedQuote.notes}</div>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                    Generated by AI - This will be included in customer-facing documents
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {/* If not saved yet, show save options */}
                {!savedQuoteId && !quoteId && (
                  <>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setGeneratedQuote(null)}
                        className="flex-1 h-12"
                      >
                        Regenerate
                      </Button>
                      <Button
                        onClick={handleSaveQuote}
                        disabled={isGenerating}
                        className="flex-1 h-12 bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
                      >
                        {isGenerating ? 'Saving...' : 'Save Quote'}
                      </Button>
                    </div>
                    
                    {/* Hint to save first */}
                    <p className="text-sm text-muted-foreground text-center">
                      💡 Save the quote first, then you can send it to the customer
                    </p>
                  </>
                )}
                
                {/* After saving, show update and send buttons */}
                {(savedQuoteId || quoteId) && (
                  <>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleUpdateQuote}
                        disabled={isGenerating}
                        className="flex-1 h-12 bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
                      >
                        {isGenerating ? 'Updating...' : 'Update Quote'}
                      </Button>
                      
                      <Button
                        onClick={handleSendQuote}
                        disabled={isSending || (!customerEmail && !customerPhone)}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send to Customer'
                        )}
                      </Button>
                    </div>
                    
                    {!customerEmail && !customerPhone && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                        ⚠️ Add customer email or phone above to send quote
                      </p>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                      className="w-full h-12"
                    >
                      Back to Dashboard
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. MAKE CHANGES TO QUOTE - Show when quote is saved */}
        {(savedQuoteId || quoteId) && generatedQuote && (
          <Card>
            <CardHeader>
              <CardTitle>Make Changes to Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Describe what you'd like to add, remove, or modify
              </p>
              <Textarea
                id="aiUpdatePrompt"
                placeholder='e.g., "add labor charges for 2 hours", "add HVAC equipment", "remove permit fee", "increase quantity of item X to 5"'
                value={aiUpdatePrompt}
                onChange={(e) => setAiUpdatePrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateWithAI}
                  disabled={isUpdatingWithAI || !aiUpdatePrompt.trim()}
                  className="flex-1 bg-[#FF6200] hover:bg-[#FF6200]/90 text-white h-11"
                >
                  {isUpdatingWithAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. CUSTOMER INFORMATION */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Customer Information</CardTitle>
                {quoteId && generatedQuote && (
                  <div className="flex items-center gap-2">
                    <a
                      href={origin ? `${origin}/q/${quoteId}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs px-3 py-1.5 rounded border text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-300 dark:border-blue-700 transition-colors"
                      title="View customer quote (opens in new tab)"
                    >
                      {quoteId}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (origin) {
                          const link = `${origin}/q/${quoteId}`
                          navigator.clipboard.writeText(link)
                          toast.success('Customer quote link copied!')
                        } else {
                          navigator.clipboard.writeText(quoteId)
                          toast.success('Quote ID copied!')
                        }
                      }}
                      className="h-8 px-2"
                      title="Copy customer quote link"
                    >
                      <span className="sr-only">Copy Quote Link</span>
                      📋
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="customerName" className="text-base">Customer Name *</Label>
              <Input
                id="customerName"
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-14 text-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="customerPhone" className="text-base">Phone</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-14 text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="customerEmail" className="text-base">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
            </div>

            <div className="space-y-3 relative">
              <Label htmlFor="customerAddress" className="text-base">Job Address</Label>
              <Input
                id="customerAddress"
                name="job-address"
                placeholder="Start typing address..."
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={async (e) => {
                  // Small delay to allow click on suggestions
                  setTimeout(async () => {
                    setShowSuggestions(false)
                    // Recalculate if editing existing quote and address changed
                    if (generatedQuote && (savedQuoteId || quoteId) && e.target.value) {
                      await recalculateQuoteForAddress(e.target.value)
                    }
                  }, 200)
                }}
                className="h-14 text-lg"
                autoComplete="new-password"
              />
              
              {/* Address Suggestions Dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-accent/10 border-b border-border last:border-b-0 transition-colors"
                      onClick={async () => {
                        const newAddress = suggestion.display_name
                        setCustomerAddress(newAddress)
                        setShowSuggestions(false)
                        setAddressSuggestions([])
                        
                        // Recalculate quote if we have an existing quote
                        if (generatedQuote && (savedQuoteId || quoteId)) {
                          await recalculateQuoteForAddress(newAddress)
                        }
                      }}
                    >
                      <div className="text-sm font-medium">{suggestion.display_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job Description - Simple lead capture */}
        {!generatedQuote && (
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>Briefly describe what needs to be done</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="description" className="text-base">What needs to be done?</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the work needed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] text-lg p-4"
                />
              </div>

              {/* Save Lead Button - Only show if not saved yet */}
              {!savedQuoteId && !quoteId && (
                <Button
                  onClick={handleSaveLead}
                  disabled={!customerName || !description}
                  className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save Lead
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3.5 GENERATE QUOTE - Show after lead is saved but before quote is generated */}
        {(savedQuoteId || quoteId) && !generatedQuote && (
          <Card className="border-orange-500 border-2">
            <CardHeader className="bg-orange-500/5">
              <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Bot className="h-5 w-5" />
                Generate Quote with AI
              </CardTitle>
              <CardDescription>
                Describe what you want to quote for this job and AI will generate line items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="aiPrompt" className="text-base">What should be included in the quote?</Label>
                <Textarea
                  id="aiPrompt"
                  placeholder='e.g., "Install new HVAC system with 3-ton unit, ductwork, thermostat, and labor" or "Roof repair - replace 200 sq ft of shingles, fix flashing around chimney"'
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-[120px] text-lg p-4"
                />
                <p className="text-sm text-muted-foreground">
                  💡 Be specific about materials, quantities, and labor. The AI will break this into individual line items with prices.
                </p>
              </div>

              <Button
                onClick={handleGenerateQuote}
                disabled={!aiPrompt || isGenerating}
                className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Quote...
                  </>
                ) : (
                  <>
                    <Bot className="h-5 w-5 mr-2" />
                    Generate Quote with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 4. NOTES - Internal company notes (show when quote is saved) */}
        {(savedQuoteId || quoteId) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Internal Notes
                <span className="text-xs font-normal text-muted-foreground bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                  Company Only
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quoteNotes">Notes for Internal Use</Label>
                <Textarea
                  id="quoteNotes"
                  placeholder="Add internal notes for your team (not visible to customer)..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💡 These notes are for internal use only and will not appear on customer-facing documents.
                </p>
              </div>
              
              {/* Save Notes Button */}
              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {quoteNotes !== originalNotes ? (
                    <span className="text-amber-600 dark:text-amber-400">● Unsaved changes</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">✓ All changes saved</span>
                  )}
                </p>
                <Button
                  onClick={handleSaveNotes}
                  disabled={quoteNotes === originalNotes}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. AUDIT TRAIL - Always show if we have a quote/lead ID */}
        {(savedQuoteId || quoteId) && (
          <AuditTrail 
            quoteId={savedQuoteId || quoteId || ''} 
            entries={auditLogs} 
          />
        )}

        </main>
      )}
      </div>
    </div>
  )
}
