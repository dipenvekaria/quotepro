'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Edit2, Trash2, Save, X, Package, Search } from 'lucide-react'
import { SmartItemInput } from '../SmartItemInput'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  option_tier?: string | null
  is_upsell?: boolean
  is_discount?: boolean
}

interface ItemsTableProps {
  items: QuoteItem[]
  subtotal: number
  taxRate: number
  total: number
  onItemsChange: (items: QuoteItem[]) => void
  onSaveItems?: () => Promise<void>
  companyId?: string
}

export function ItemsTable({
  items,
  subtotal,
  taxRate,
  total,
  onItemsChange,
  onSaveItems,
  companyId,
}: ItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedItem, setEditedItem] = useState<QuoteItem | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [newItem, setNewItem] = useState<QuoteItem>({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0,
  })
  const supabase = createClient()

  const handleEditItem = (index: number) => {
    setEditingIndex(index)
    setEditedItem({ ...items[index] })
  }

  const handleSaveEdit = async () => {
    if (editedItem && editingIndex !== null) {
      const total = editedItem.quantity * editedItem.unit_price
      const updatedItems = [...items]
      updatedItems[editingIndex] = { ...editedItem, total }
      onItemsChange(updatedItems)
      setEditingIndex(null)
      setEditedItem(null)
      
      if (onSaveItems) {
        await onSaveItems()
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditedItem(null)
  }

  const handleDeleteItem = async (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    onItemsChange(updatedItems)
    
    if (onSaveItems) {
      await onSaveItems()
    }
  }

  const handleAddItem = () => {
    setIsAddingItem(true)
    setSearchValue('')
    setNewItem({
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    })
  }

  // Handle selection from catalog
  const handleSelectCatalogItem = (catalogItem: { id: string; name: string; description?: string; base_price: number }) => {
    setNewItem({
      name: catalogItem.name,
      description: catalogItem.description || '',
      quantity: 1,
      unit_price: catalogItem.base_price,
      total: catalogItem.base_price,
    })
    setSearchValue('')
  }

  // Auto-add custom item to catalog
  const addToCatalog = async (itemName: string, price: number, description?: string) => {
    if (!companyId) return
    
    try {
      // Check if item already exists
      // @ts-ignore
      const { data: existing } = await supabase
        .from('catalog_items')
        .select('id')
        .eq('company_id', companyId)
        .ilike('name', itemName)
        .limit(1)

      if (existing && existing.length > 0) {
        // Item already exists
        return
      }

      // Add new item to catalog
      // @ts-ignore
      const { error } = await supabase
        .from('catalog_items')
        .insert({
          company_id: companyId,
          name: itemName,
          description: description || null,
          base_price: Math.abs(price),
          unit: 'each',
          is_active: true,
          tags: ['auto-added'],
        })

      if (error) {
        console.error('Error adding to catalog:', error)
      } else {
        toast.success(`"${itemName}" added to your catalog`, {
          description: 'You can edit it later in Settings → Products & Services',
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('Error adding to catalog:', error)
    }
  }

  const handleSaveNewItem = async () => {
    if (!newItem.name || newItem.unit_price === 0) {
      return
    }

    const total = newItem.quantity * newItem.unit_price
    const updatedItems = [...items, { ...newItem, total }]
    onItemsChange(updatedItems)
    setIsAddingItem(false)
    setSearchValue('')
    
    // Auto-add to catalog if it's a new custom item (not a discount)
    if (!newItem.is_discount && newItem.unit_price > 0) {
      await addToCatalog(newItem.name, newItem.unit_price, newItem.description)
    }
    
    if (onSaveItems) {
      await onSaveItems()
    }
  }

  const handleCancelAddItem = () => {
    setIsAddingItem(false)
    setSearchValue('')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900">Quote Items</span>
        <button
          onClick={handleAddItem}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0055FF] hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Empty state */}
        {items.length === 0 && !isAddingItem && (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No items yet</p>
            <p className="text-xs mt-1">Click "Add Item" above or use AI to generate</p>
          </div>
        )}

        {/* Items list */}
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index}>
              {editingIndex === index ? (
                // Edit Mode
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                    <input
                      type="checkbox"
                      id="edit-is-discount"
                      checked={editedItem?.is_discount || (editedItem?.unit_price ?? 0) < 0 || false}
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
                        {(editedItem?.is_discount || (editedItem?.unit_price ?? 0) < 0) && <span className="text-red-600 font-bold"> (negative)</span>}
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
                <div className={`flex justify-between items-start p-3 rounded-xl group ${
                  item.is_discount || item.unit_price < 0 
                    ? 'bg-green-50 border border-green-100' 
                    : 'bg-gray-50'
                }`}>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${
                      item.is_discount || item.unit_price < 0 
                        ? 'text-green-700' 
                        : 'text-gray-900'
                    }`}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {item.quantity} × ${item.unit_price.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`font-semibold text-sm ${
                      item.is_discount || item.unit_price < 0 
                        ? 'text-green-700' 
                        : 'text-gray-900'
                    }`}>
                      ${item.total.toFixed(2)}
                    </div>
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditItem(index)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
                        title="Edit item"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(index)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Item Form */}
          {isAddingItem && (
            <div className="p-3 bg-green-50 rounded-lg border-2 border-green-300 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-green-700" />
                <span className="font-bold text-green-700">Add Item</span>
              </div>
              
              {/* Smart search input - shows when name not yet set AND companyId provided */}
              {!newItem.name && companyId && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    Search Products or Type Custom
                  </Label>
                  <SmartItemInput
                    companyId={companyId}
                    value={searchValue}
                    onChange={setSearchValue}
                    onSelectItem={handleSelectCatalogItem}
                    placeholder="Search your catalog or type new item..."
                  />
                  {searchValue && (
                    <Button
                      onClick={() => {
                        setNewItem({ ...newItem, name: searchValue })
                        setSearchValue('')
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full mt-1 text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Use "{searchValue}" as custom item
                    </Button>
                  )}
                </div>
              )}

              {/* Fallback: Direct name input when no companyId */}
              {!newItem.name && !companyId && (
                <div className="space-y-2">
                  <Label className="text-xs">Item Name *</Label>
                  <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Enter item name..."
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchValue) {
                        setNewItem({ ...newItem, name: searchValue })
                        setSearchValue('')
                      }
                    }}
                  />
                  {searchValue && (
                    <Button
                      onClick={() => {
                        setNewItem({ ...newItem, name: searchValue })
                        setSearchValue('')
                      }}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Continue with "{searchValue}"
                    </Button>
                  )}
                </div>
              )}

              {/* Item details form - shows when name is set */}
              {newItem.name && (
                <>
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                    <input
                      type="checkbox"
                      id="is-discount"
                      checked={newItem.is_discount || false}
                      onChange={(e) => {
                        const isDiscount = e.target.checked
                        setNewItem({ 
                          ...newItem, 
                          is_discount: isDiscount,
                          unit_price: isDiscount && newItem.unit_price > 0 ? -Math.abs(newItem.unit_price) : newItem.unit_price,
                          name: isDiscount && newItem.name && !newItem.name.startsWith('Discount: ') ? `Discount: ${newItem.name}` : newItem.name.replace('Discount: ', '')
                        })
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="is-discount" className="text-sm font-medium cursor-pointer select-none">
                      This is a discount
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Item Name *</Label>
                    <Input
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder={newItem.is_discount ? "e.g., Discount: 10% off labor" : "e.g., Labor, Materials"}
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
                        Unit Price ($) * {newItem.is_discount && <span className="text-red-600 font-bold">(neg)</span>}
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
                </>
              )}

              {/* Cancel button always visible */}
              {!newItem.name && (
                <Button onClick={handleCancelAddItem} variant="outline" size="sm" className="w-full gap-1">
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax ({taxRate?.toFixed(2) || '0.00'}%)</span>
            <span>${(subtotal * (taxRate / 100)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2 text-gray-900">
            <span>Total</span>
            <span className="text-[#0055FF]">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
