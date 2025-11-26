// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Wrench, Edit2, Trash2, Plus, Save, X } from 'lucide-react'
import Link from 'next/link'
import { DashboardNav } from '@/components/dashboard-nav'

interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  option_tier?: string | null
  is_upsell?: boolean
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
  const router = useRouter()
  const supabase = createClient()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    loadCompany()
    if (quoteId) {
      loadExistingQuote(quoteId)
    }
  }, [quoteId])
  
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
            subtotal: quote.subtotal,
            tax_amount: quote.tax_amount,
            total: quote.total
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

  const handleEditItem = (index: number) => {
    if (!generatedQuote) return
    setEditingItemIndex(index)
    setEditedItem({ ...generatedQuote.line_items[index] })
  }

  const handleSaveEdit = () => {
    if (!generatedQuote || editingItemIndex === null || !editedItem) return
    
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
    
    setEditingItemIndex(null)
    setEditedItem(null)
    toast.success('Item updated')
  }

  const handleCancelEdit = () => {
    setEditingItemIndex(null)
    setEditedItem(null)
  }

  const handleDeleteItem = (index: number) => {
    if (!generatedQuote) return
    
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
    })
  }

  const handleSaveNewItem = () => {
    if (!generatedQuote || !newItem.name || newItem.unit_price <= 0) {
      toast.error('Please enter item name and price')
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
    })
  }

  const handleSaveQuote = async () => {
    if (!generatedQuote) return

    setIsGenerating(true)
    try {
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
          notes: generatedQuote.notes || null,
          photos: photos,
          status: 'draft',
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

      toast.success('Quote saved successfully!')
      // @ts-ignore
      setSavedQuoteId(quote.id)
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
          notes: generatedQuote.notes || null,
          photos: photos,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:flex overflow-x-hidden">
      {/* Sidebar Navigation - Desktop only */}
      <div className="hidden lg:block">
        <DashboardNav />
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-20 min-w-0">
        {/* Mobile-First Header */}
        <header className="bg-[#0F172A] p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <DashboardNav buttonOnly />
            <div className="bg-[#FF6200] p-2 rounded-lg">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-white truncate">
                {quoteId ? 'Edit Quote' : 'New Quote'} – {customerName || 'New Customer'}
              </h1>
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
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="customerAddress">Job Address</Label>
              <Input
                id="customerAddress"
                placeholder="Start typing address..."
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                className="h-12"
                autoComplete="off"
              />
              
              {/* Address Suggestions Dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-accent/10 border-b border-border last:border-b-0 transition-colors"
                      onClick={() => {
                        setCustomerAddress(suggestion.display_name)
                        setShowSuggestions(false)
                        setAddressSuggestions([])
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

        {/* Job Description */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">What needs to be done? *</Label>
              <Textarea
                id="description"
                placeholder={`Examples:
• Replace water heater with 50-gal Bradford White
• Full system tune-up, found bad capacitor
• Sewer line camera found roots at 42ft, need hydrojet + spot repair`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[150px] text-base"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 text-base"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
              >
                {isRecording ? 'Recording...' : 'Hold to talk'}
              </Button>

              <label className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 text-base"
                  asChild
                >
                  <div>
                    Add Photos ({photos.length})
                  </div>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Button */}
        {!generatedQuote && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !customerName || !description}
            className="w-full h-16 text-lg font-semibold bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                Building your quote...
              </>
            ) : (
              "Generate Quote"
            )}
          </Button>
        )}

        {/* Generated Quote Preview */}
        {generatedQuote && (
          <Card className="border-[#FF6200] border-2">
            <CardHeader className="bg-[#FF6200]/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#FF6200]">Generated Quote</CardTitle>
                <Button
                  onClick={handleAddItem}
                  variant="outline"
                  size="sm"
                  className="gap-2"
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
                            <Label className="text-xs">Unit Price ($)</Label>
                            <Input
                              type="number"
                              min="0"
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
                      <div className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                        <div className="flex-1">
                          <div className="font-semibold">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                          <div className="text-sm">
                            Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">${item.total.toFixed(2)}</div>
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
                    <div className="space-y-2">
                      <Label className="text-xs">Item Name *</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="e.g., Labor, Materials, Trip charge"
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
                        <Label className="text-xs">Unit Price ($) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItem.unit_price}
                          onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                          className="h-9"
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
                  <span>Tax ({generatedQuote.tax_rate}%):</span>
                  <span>${(generatedQuote.subtotal * (generatedQuote.tax_rate / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-accent">
                  <span>Total:</span>
                  <span>${generatedQuote.total.toFixed(2)}</span>
                </div>
              </div>

              {generatedQuote.notes && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="text-sm font-semibold mb-1">Notes:</div>
                  <div className="text-sm">{generatedQuote.notes}</div>
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
        </main>
      )}
      </div>
    </div>
  )
}
