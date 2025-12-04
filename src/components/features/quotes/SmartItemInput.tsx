'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Package, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CatalogItem {
  id: string
  name: string
  description?: string
  category?: string
  base_price: number
  unit?: string
}

interface SmartItemInputProps {
  companyId: string
  value: string
  onChange: (value: string) => void
  onSelectItem: (item: CatalogItem) => void
  placeholder?: string
  className?: string
}

export function SmartItemInput({
  companyId,
  value,
  onChange,
  onSelectItem,
  placeholder = 'Search products or type custom item...',
  className,
}: SmartItemInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Search catalog items
  const searchCatalog = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      // @ts-ignore - Supabase types
      const { data, error } = await supabase
        .from('catalog_items')
        .select('id, name, description, category, base_price, unit')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching catalog:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [companyId, supabase])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        searchCatalog(value)
      } else {
        setSearchResults([])
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [value, searchCatalog])

  // Handle keyboard navigation
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
          // Use as custom item
          setIsOpen(false)
        } else if (selectedIndex > 0 && searchResults[selectedIndex - 1]) {
          onSelectItem(searchResults[selectedIndex - 1])
          setIsOpen(false)
          onChange('')
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Close dropdown on outside click
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

  const handleSelectItem = (item: CatalogItem) => {
    onSelectItem(item)
    setIsOpen(false)
    onChange('')
    setSearchResults([])
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setSelectedIndex(0)
          }}
          onFocus={() => {
            if (value && searchResults.length > 0) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (value || searchResults.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Custom item option - always first when there's input */}
          {value && (
            <button
              onClick={() => {
                // Just close dropdown - parent handles using this as custom name
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors border-b',
                selectedIndex === 0 && 'bg-blue-50'
              )}
            >
              <div className="p-1.5 rounded-full bg-green-100">
                <Plus className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-green-700 truncate">
                  Use as custom item: "{value}"
                </div>
                <div className="text-xs text-muted-foreground">
                  Will be added to your catalog automatically
                </div>
              </div>
            </button>
          )}

          {/* Catalog results */}
          {searchResults.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Products & Services
              </div>
              {searchResults.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={cn(
                    'w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors',
                    selectedIndex === index + 1 && 'bg-gray-50'
                  )}
                >
                  <div className="p-1.5 rounded-full bg-blue-100">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    )}
                    {item.category && (
                      <div className="text-xs text-blue-600">{item.category}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-blue-600">
                      ${item.base_price.toFixed(2)}
                    </div>
                    {item.unit && item.unit !== 'each' && (
                      <div className="text-xs text-muted-foreground">
                        per {item.unit}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {value && searchResults.length === 0 && !isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching products found. Use "{value}" as a custom item.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
