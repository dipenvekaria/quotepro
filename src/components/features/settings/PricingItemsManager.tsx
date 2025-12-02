'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExpandableSearch } from '@/components/expandable-search'
import { Package, Search, Filter } from 'lucide-react'

interface PricingItem {
  id: string
  name: string
  price: string
  category: string
  description?: string
}

interface PricingItemsManagerProps {
  pricingItems: PricingItem[]
  newPricingItem: {
    name: string
    price: string
    category: string
    description: string
  }
  setNewPricingItem: (item: any) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  uploadMode: 'replace' | 'append'
  setUploadMode: (mode: 'replace' | 'append') => void
  uploadFile: File | null
  isLoadingPreview: boolean
  isUploading: boolean
  editingItem: PricingItem | null
  setEditingItem: (item: PricingItem | null) => void
  isSaving: boolean
  onAddItem: () => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUpdateItem: (item: PricingItem) => void
  onDeleteItem: (item: PricingItem) => void
  onDownloadTemplate: (format: 'csv' | 'excel') => void
}

export function PricingItemsManager({
  pricingItems,
  newPricingItem,
  setNewPricingItem,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  uploadMode,
  setUploadMode,
  uploadFile,
  isLoadingPreview,
  isUploading,
  editingItem,
  setEditingItem,
  isSaving,
  onAddItem,
  onFileSelect,
  onUpdateItem,
  onDeleteItem,
  onDownloadTemplate,
}: PricingItemsManagerProps) {
  // Filter items
  const filteredPricingItems = pricingItems.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedPricingItems = filteredPricingItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, PricingItem[]>)

  // Get all categories
  const allCategories = Array.from(new Set(pricingItems.map((item) => item.category)))

  return (
    <div className="space-y-6">
      {/* Add New Item Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Pricing Item</CardTitle>
          <CardDescription>
            Add items to your pricing catalog for quick quote generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={newPricingItem.name}
                onChange={(e) => setNewPricingItem({ ...newPricingItem, name: e.target.value })}
                placeholder="e.g., HVAC Unit Installation"
              />
            </div>
            <div>
              <Label htmlFor="itemPrice">Price ($)</Label>
              <Input
                id="itemPrice"
                type="number"
                step="0.01"
                value={newPricingItem.price}
                onChange={(e) => setNewPricingItem({ ...newPricingItem, price: e.target.value })}
                placeholder="299.00"
              />
            </div>
            <div>
              <Label htmlFor="itemCategory">Category</Label>
              <select
                id="itemCategory"
                value={newPricingItem.category}
                onChange={(e) => setNewPricingItem({ ...newPricingItem, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Labor">Labor</option>
                <option value="Materials">Materials</option>
                <option value="Equipment">Equipment</option>
                <option value="Permits">Permits</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="itemDescription">Description (optional)</Label>
            <Textarea
              id="itemDescription"
              value={newPricingItem.description}
              onChange={(e) => setNewPricingItem({ ...newPricingItem, description: e.target.value })}
              placeholder="Add details to help AI generate better quotes..."
              className="w-full resize-none"
              rows={2}
            />
          </div>
          <Button
            onClick={onAddItem}
            disabled={isSaving}
            className="mt-4 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white"
          >
            {isSaving ? 'Adding...' : 'Add Item'}
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Pricing Items</CardTitle>
          <CardDescription>
            Upload CSV or Excel files with any column names - we'll help you map them!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Mode Selection */}
          <div className="space-y-2">
            <Label>Upload Mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={uploadMode === 'replace' ? 'default' : 'outline'}
                onClick={() => setUploadMode('replace')}
                className={uploadMode === 'replace' ? 'bg-[#2563eb] hover:bg-[#2563eb]/90' : ''}
              >
                🔄 Replace All
              </Button>
              <Button
                type="button"
                variant={uploadMode === 'append' ? 'default' : 'outline'}
                onClick={() => setUploadMode('append')}
                className={uploadMode === 'append' ? 'bg-[#2563eb] hover:bg-[#2563eb]/90' : ''}
              >
                ➕ Add to Existing
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadMode === 'replace' 
                ? '⚠️ Replace All: Deletes all existing items and uploads new ones'
                : '✅ Add to Existing: Keeps current items and adds new ones from file'}
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="bulkUpload">Select Your File</Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="bulkUpload"
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2563eb] transition-colors flex-1 bg-gray-50"
              >
                {uploadFile ? (
                  <span className="text-sm font-medium">
                    📎 {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <span className="text-sm">📁 Click to select CSV or Excel file</span>
                )}
              </label>
              <input
                id="bulkUpload"
                type="file"
                accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={onFileSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supports: CSV (.csv), Excel (.xlsx, .xls) • Any column names work!
            </p>
          </div>

          {/* Loading State */}
          {isLoadingPreview && (
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-700 font-medium">📊 Analyzing your file...</p>
            </div>
          )}

          {/* Uploading State */}
          {isUploading && (
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-green-700 font-medium">⬆️ Uploading items...</p>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-sm">✨</span> Smart Column Mapping
            </h4>
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Upload any file</strong> - Works with QuickBooks, ServiceTitan, Excel, Google Sheets exports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Auto-detection</strong> - We automatically detect your column headers and suggest mappings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Visual preview</strong> - See first 5 rows before uploading to verify your data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Map your columns</strong> - Simply match your columns to: Name, Price, Category, Description</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">→</span>
                <span className="italic">No templates needed - use your existing files!</span>
              </li>
            </ul>
          </div>

          {/* Optional Templates */}
          <details className="mt-4">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              📥 Need a sample file? Download template (optional)
            </summary>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onDownloadTemplate('csv')}
                className="flex-1"
              >
                📄 CSV Template
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onDownloadTemplate('excel')}
                className="flex-1"
              >
                📊 Excel Template
              </Button>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Catalog Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Your Pricing Catalog
                  <Badge variant="secondary">{pricingItems.length} total</Badge>
                  {filteredPricingItems.length !== pricingItems.length && (
                    <Badge variant="outline">{filteredPricingItems.length} shown</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Search and manage your pricing items by category
                </CardDescription>
              </div>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <ExpandableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or description..."
                className="flex-1"
              />
              
              <div className="sm:w-64">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {pricingItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No pricing items yet</p>
              <p className="text-sm text-muted-foreground">Add items manually below or bulk upload from a file</p>
            </div>
          ) : filteredPricingItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No items match your filters</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6">
              {Object.entries(groupedPricingItems).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                    {category}
                    <Badge variant="secondary">{items.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
                      >
                        {editingItem?.id === item.id ? (
                          <div className="flex-1 space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <Input
                                value={editingItem.name}
                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                placeholder="Item name"
                                className="w-full"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={editingItem.price}
                                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                placeholder="Price"
                                className="w-full"
                              />
                            </div>
                            <Textarea
                              value={editingItem.description || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                              placeholder="Description (optional) - helps AI generate better quotes"
                              className="w-full resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => onUpdateItem(editingItem)}
                                disabled={isSaving}
                                className="bg-[#2563eb] hover:bg-[#2563eb]/90 flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ${parseFloat(item.price).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem({ ...item })}
                                className="flex-1 md:flex-none"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDeleteItem(item)}
                                className="flex-1 md:flex-none"
                              >
                                Delete
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
