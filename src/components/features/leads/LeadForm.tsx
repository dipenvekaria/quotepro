'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LeadFormProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onCustomerAddressChange: (value: string) => void
  quoteId?: string | null
  origin?: string
  hasQuote?: boolean
  onAddressRecalculate?: (address: string) => Promise<void>
}

interface AddressSuggestion {
  display_name: string
  lat: string
  lon: string
}

export function LeadForm({
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
  quoteId,
  origin,
  hasQuote = false,
  onAddressRecalculate,
}: LeadFormProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Address autocomplete
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

  const handleAddressSelect = async (address: string) => {
    onCustomerAddressChange(address)
    setShowSuggestions(false)
    setAddressSuggestions([])
    
    // Recalculate tax if we have a quote
    if (hasQuote && onAddressRecalculate) {
      await onAddressRecalculate(address)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Customer Information</CardTitle>
            {quoteId && hasQuote && (
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
            onChange={(e) => onCustomerNameChange(e.target.value)}
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
              onChange={(e) => onCustomerPhoneChange(e.target.value)}
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
              onChange={(e) => onCustomerEmailChange(e.target.value)}
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
              onCustomerAddressChange(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={async (e) => {
              setTimeout(async () => {
                setShowSuggestions(false)
                // Recalculate if address changed and we have a quote
                if (hasQuote && onAddressRecalculate && e.target.value) {
                  await onAddressRecalculate(e.target.value)
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
                  onClick={() => handleAddressSelect(suggestion.display_name)}
                >
                  <div className="text-sm font-medium">{suggestion.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
