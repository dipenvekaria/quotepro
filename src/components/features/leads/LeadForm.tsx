'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { User, MapPin } from 'lucide-react'
import { SmartCustomerInput } from './SmartCustomerInput'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
}

interface LeadFormProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  jobDescription?: string
  isDescriptionReadOnly?: boolean
  jobName?: string
  companyId?: string
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onCustomerAddressChange: (value: string) => void
  onJobDescriptionChange?: (value: string) => void
  onCustomerSelect?: (customer: Customer) => void
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
  jobDescription = '',
  isDescriptionReadOnly = false,
  jobName,
  companyId,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
  onJobDescriptionChange,
  onCustomerSelect,
  quoteId,
  origin,
  hasQuote = false,
  onAddressRecalculate,
}: LeadFormProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addressCache] = useState<Map<string, AddressSuggestion[]>>(new Map())

  // Address autocomplete with caching
  useEffect(() => {
    if (customerAddress.length < 3) {
      setAddressSuggestions([])
      return
    }

    // Check cache first
    const cacheKey = customerAddress.toLowerCase().trim()
    if (addressCache.has(cacheKey)) {
      setAddressSuggestions(addressCache.get(cacheKey)!)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(customerAddress)}&format=json&addressdetails=1&limit=5&countrycodes=us`,
          {
            headers: {
              'User-Agent': 'QuoteBuilder Pro'
            }
          }
        )
        const data = await response.json()
        
        // Cache the result
        addressCache.set(cacheKey, data)
        setAddressSuggestions(data)
      } catch (error) {
        console.error('Address lookup failed:', error)
      }
    }, 300) // Reduced from 500ms to 300ms, US-only for faster response

    return () => clearTimeout(timeoutId)
  }, [customerAddress, addressCache])

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
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-base font-semibold text-gray-900">Customer Info</span>
        </div>
        {quoteId && hasQuote && (
          <button
            onClick={() => {
              if (origin) {
                navigator.clipboard.writeText(`${origin}/q/${quoteId}`)
                toast.success('Link copied!')
              }
            }}
            className="font-mono text-xs text-gray-500 hover:text-gray-700"
          >
            #{quoteId.slice(0, 8)}
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Name - Smart Customer Search */}
        {companyId ? (
          <SmartCustomerInput
            companyId={companyId}
            value={customerName}
            onChange={onCustomerNameChange}
            onSelectCustomer={(customer) => {
              onCustomerNameChange(customer.name)
              if (customer.phone) onCustomerPhoneChange(customer.phone)
              if (customer.email) onCustomerEmailChange(customer.email)
              if (customer.address) onCustomerAddressChange(customer.address)
              onCustomerSelect?.(customer)
              toast.success(`Loaded: ${customer.name}`)
            }}
            placeholder="Search customer name or phone..."
          />
        ) : (
          <input
            placeholder="Customer name *"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent"
          />
        )}

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email"
            value={customerEmail}
            onChange={(e) => onCustomerEmailChange(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent"
          />
        </div>

        {/* Address */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <input
              placeholder="Job address"
              value={customerAddress}
              onChange={(e) => {
                onCustomerAddressChange(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent"
              autoComplete="off"
            />
          </div>
          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
              {addressSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  onClick={() => handleAddressSelect(suggestion.display_name)}
                >
                  {suggestion.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Job Description */}
        {isDescriptionReadOnly ? (
          <div className="bg-white/80 rounded-xl p-3 text-sm text-gray-700 min-h-[100px] border border-gray-200">
            {jobDescription}
          </div>
        ) : (
          <textarea
            placeholder="Job description - what does the customer need?"
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange?.(e.target.value)}
            className="w-full min-h-[100px] px-4 py-3 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent resize-none"
            rows={4}
          />
        )}
      </div>
    </div>
  )
}
