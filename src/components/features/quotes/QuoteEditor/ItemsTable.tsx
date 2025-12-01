'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'

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
}

export function ItemsTable({
  items,
  subtotal,
  taxRate,
  total,
  onItemsChange,
  onSaveItems,
}: ItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedItem, setEditedItem] = useState<QuoteItem | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItem, setNewItem] = useState<QuoteItem>({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0,
  })

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
    setNewItem({
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    })
  }

  const handleSaveNewItem = async () => {
    if (!newItem.name || newItem.unit_price === 0) {
      return
    }

    const total = newItem.quantity * newItem.unit_price
    const updatedItems = [...items, { ...newItem, total }]
    onItemsChange(updatedItems)
    setIsAddingItem(false)
    
    if (onSaveItems) {
      await onSaveItems()
    }
  }

  const handleCancelAddItem = () => {
    setIsAddingItem(false)
  }

  return (
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
          {items.map((item, index) => (
            <div key={index}>
              {editingIndex === index ? (
                // Edit Mode
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-700 space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
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
                        {(editedItem?.is_discount || (editedItem?.unit_price ?? 0) < 0) && <span className="text-red-600 font-semibold"> (negative)</span>}
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
                      {item.name}
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
                      unit_price: isDiscount && newItem.unit_price > 0 ? -Math.abs(newItem.unit_price) : newItem.unit_price,
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

        {/* Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax ({taxRate?.toFixed(2) || '0.00'}%):</span>
            <span>${(subtotal * (taxRate / 100)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span className="text-[#FF6200]">${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
