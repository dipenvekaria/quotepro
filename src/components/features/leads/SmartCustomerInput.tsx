'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, User, Phone, MapPin, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
}

interface SmartCustomerInputProps {
  companyId: string
  value: string
  onChange: (value: string) => void
  onSelectCustomer: (customer: Customer) => void
  placeholder?: string
  className?: string
}

export function SmartCustomerInput({
  companyId,
  value,
  onChange,
  onSelectCustomer,
  placeholder = 'Search by name or phone...',
  className,
}: SmartCustomerInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Search customers by name or phone
  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !companyId) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      // Clean query - remove non-digits for phone search
      const digitsOnly = query.replace(/\D/g, '')
      
      // If query is mostly digits (phone number), search by phone
      // Otherwise search by name
      const isPhoneSearch = digitsOnly.length >= 3 && digitsOnly.length >= query.replace(/\s/g, '').length * 0.5

      // @ts-ignore
      let customers: Customer[] = []

      if (isPhoneSearch) {
        // Search by phone - match last digits
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('company_id', companyId)
          .ilike('phone', `%${digitsOnly}%`)
          .order('name')
          .limit(8)
        
        if (error) throw error
        customers = data || []
      } else {
        // Search by name
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('company_id', companyId)
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(8)
        
        if (error) throw error
        customers = data || []
      }

      // Get addresses for found customers
      if (customers && customers.length > 0) {
        const customerIds = customers.map((c: Customer) => c.id)
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('customer_id, address')
          .in('customer_id', customerIds)
          .eq('is_primary', true)

        // Merge addresses
        const customersWithAddresses = customers.map((c: Customer) => ({
          ...c,
          address: (addresses as { customer_id: string; address: string }[] | null)?.find(
            (a) => a.customer_id === c.id
          )?.address
        }))

        setSearchResults(customersWithAddresses)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching customers:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [companyId, supabase])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        searchCustomers(value)
      } else {
        setSearchResults([])
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [value, searchCustomers])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(0, prev - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex === 0 && value) {
          // Use as new customer
          setIsOpen(false)
        } else if (selectedIndex > 0 && searchResults[selectedIndex - 1]) {
          onSelectCustomer(searchResults[selectedIndex - 1])
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer)
    setIsOpen(false)
    setSearchResults([])
  }

  // Format phone for display
  const formatPhone = (phone?: string) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setSelectedIndex(0)
          }}
          onFocus={() => {
            if (value && value.length >= 2) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (value || searchResults.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto"
        >
          {/* New customer option */}
          {value && (
            <button
              onClick={() => setIsOpen(false)}
              className={cn(
                'w-full px-3 py-3 text-left flex items-center gap-3 hover:bg-green-50 transition-colors border-b border-gray-100',
                selectedIndex === 0 && 'bg-green-50'
              )}
            >
              <div className="p-2 rounded-full bg-green-100">
                <Plus className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-green-700">
                  New customer: "{value}"
                </div>
                <div className="text-xs text-gray-500">
                  Create a new customer record
                </div>
              </div>
            </button>
          )}

          {/* Existing customers */}
          {searchResults.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Existing Customers
              </div>
              {searchResults.map((customer, index) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={cn(
                    'w-full px-3 py-3 text-left hover:bg-blue-50 transition-colors',
                    selectedIndex === index + 1 && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-100 mt-0.5">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Name */}
                      <div className="font-medium text-gray-900 truncate">
                        {customer.name}
                      </div>
                      
                      {/* Phone */}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{formatPhone(customer.phone)}</span>
                        </div>
                      )}
                      
                      {/* Address */}
                      {customer.address && (
                        <div className="flex items-start gap-1.5 text-sm text-gray-500">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {value && value.length >= 2 && searchResults.length === 0 && !isLoading && (
            <div className="px-3 py-3 text-sm text-gray-500">
              No existing customers found. Press Enter to create new.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
