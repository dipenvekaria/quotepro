'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Check, X, AlertCircle, Loader2, Download, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface ColumnMapping {
  csv_column: string
  db_field: string
  confidence: number
  sample_values: string[]
}

interface MappingSuggestion {
  mappings: ColumnMapping[]
  unmapped_columns: string[]
  missing_required_fields: string[]
  row_count: number
  preview_rows: Record<string, any>[]
}

interface SmartCSVImportProps {
  companyId: string
  onImportComplete: () => void
}

const DB_FIELDS = {
  name: { label: 'Name', required: true, description: 'Product/service name' },
  description: { label: 'Description', required: false, description: 'Detailed description' },
  category: { label: 'Category', required: false, description: 'Main category' },
  subcategory: { label: 'Subcategory', required: false, description: 'Subcategory' },
  base_price: { label: 'Base Price', required: true, description: 'Price per unit ($)' },
  unit: { label: 'Unit', required: false, description: 'Unit (hour, each, sqft, lf)' },
  tags: { label: 'Tags', required: false, description: 'Comma-separated tags' },
  typical_quantity: { label: 'Typical Qty', required: false, description: 'Typical quantity per job' },
  labor_hours: { label: 'Labor Hours', required: false, description: 'Labor hours required' },
  material_cost: { label: 'Material Cost', required: false, description: 'Cost of materials' },
}

export function SmartCSVImport({ companyId, onImportComplete }: SmartCSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [mappingSuggestion, setMappingSuggestion] = useState<MappingSuggestion | null>(null)
  const [userMappings, setUserMappings] = useState<Record<string, string>>({})
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('append')
  const [manualMode, setManualMode] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreview, setCsvPreview] = useState<Record<string, any>[]>([])

  const supabase = createClient()

  // Parse CSV locally for manual mode
  const parseCSVLocally = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() && line.trim() !== ','.repeat(line.split(',').length - 1))
    if (lines.length === 0) return { headers: [], rows: [] }
    
    // Simple CSV parsing (handles quoted fields)
    const parseLine = (line: string) => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }
    
    // Find the header row (first row with non-empty values)
    let headerRowIndex = 0
    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i])
      const nonEmpty = parsed.filter(v => v.trim() !== '')
      if (nonEmpty.length >= 2) {
        headerRowIndex = i
        break
      }
    }
    
    const rawHeaders = parseLine(lines[headerRowIndex])
    
    // Filter out empty columns and track which indices to keep
    const validIndices: number[] = []
    const headers: string[] = []
    rawHeaders.forEach((h, i) => {
      if (h.trim() !== '') {
        validIndices.push(i)
        headers.push(h.trim())
      }
    })
    
    // Parse data rows (skip header and any rows before it)
    const rows = lines.slice(headerRowIndex + 1, headerRowIndex + 6).map(line => {
      const values = parseLine(line)
      const row: Record<string, any> = {}
      headers.forEach((h, idx) => {
        const originalIndex = validIndices[idx]
        row[h] = values[originalIndex]?.trim() || ''
      })
      return row
    }).filter(row => Object.values(row).some(v => v !== ''))
    
    return { headers, rows }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setMappingSuggestion(null)
    setUserMappings({})
    setManualMode(false)

    // Read file locally first for preview
    const text = await selectedFile.text()
    const { headers, rows } = parseCSVLocally(text)
    setCsvHeaders(headers)
    setCsvPreview(rows)

    // Try AI analysis
    await analyzeFile(selectedFile, headers, rows)
  }

  const analyzeFile = async (fileToAnalyze: File, headers: string[], rows: Record<string, any>[]) => {
    setIsAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('file', fileToAnalyze)

      const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/catalog/analyze-csv`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze CSV')
      }

      const result: MappingSuggestion = await response.json()
      setMappingSuggestion(result)

      // Initialize user mappings with AI suggestions
      const initialMappings: Record<string, string> = {}
      result.mappings.forEach(m => {
        initialMappings[m.csv_column] = m.db_field
      })
      setUserMappings(initialMappings)

      // If AI didn't find required mappings, switch to manual mode
      if (result.missing_required_fields.length > 0) {
        setManualMode(true)
        // Initialize all headers with SKIP
        headers.forEach(h => {
          if (!initialMappings[h]) {
            initialMappings[h] = 'SKIP'
          }
        })
        setUserMappings(initialMappings)
        toast.info(`⚠️ AI couldn't map all columns. Please map manually.`)
      } else {
        toast.success(`✅ Analyzed ${result.row_count} rows - AI mapped ${result.mappings.length} columns`)
      }
    } catch (error) {
      console.error('Analysis error:', error)
      // Fall back to manual mode
      setManualMode(true)
      const initialMappings: Record<string, string> = {}
      headers.forEach(h => initialMappings[h] = 'SKIP')
      setUserMappings(initialMappings)
      setMappingSuggestion({
        mappings: [],
        unmapped_columns: headers,
        missing_required_fields: ['name', 'base_price'],
        row_count: rows.length,
        preview_rows: rows
      })
      toast.info(`⚠️ AI analysis failed. Please map columns manually.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const switchToManualMode = () => {
    setManualMode(true)
    // Initialize all headers that aren't mapped with SKIP
    const newMappings = { ...userMappings }
    csvHeaders.forEach(h => {
      if (!newMappings[h]) {
        newMappings[h] = 'SKIP'
      }
    })
    setUserMappings(newMappings)
  }

  const handleImport = async () => {
    if (!file || !mappingSuggestion) return

    // Validate required fields are mapped
    const requiredFields = Object.entries(DB_FIELDS)
      .filter(([_, config]) => config.required)
      .map(([field]) => field)

    const mappedFields = Object.values(userMappings)
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f))

    if (missingRequired.length > 0) {
      toast.error(`Missing required fields: ${missingRequired.join(', ')}`)
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify({
        mappings: userMappings,
        upload_mode: uploadMode
      }))

      const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/catalog/import-with-mapping`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()

      // Insert items into Supabase
      if (uploadMode === 'replace') {
        // Delete all existing items first
        await supabase
          .from('catalog_items')
          .delete()
          .eq('company_id', companyId)
      }

      // Insert new items
      const itemsToInsert = result.items.map((item: any) => ({
        ...item,
        company_id: companyId,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('catalog_items')
        .insert(itemsToInsert)

      if (insertError) throw insertError

      toast.success(`✅ Imported ${result.imported_count} items${result.error_count > 0 ? ` (${result.error_count} errors)` : ''}`)
      
      // Reset
      setFile(null)
      setMappingSuggestion(null)
      setUserMappings({})
      onImportComplete()

    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import items')
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = `name,description,category,subcategory,base_price,unit,tags,typical_quantity,labor_hours,material_cost
"Plumbing Hourly Rate","Standard plumbing labor","Plumbing","Residential",150.00,"hour","urgent,residential",1.0,1.0,0.00
"PVC Pipe 1/2 inch","Half-inch PVC pipe","Parts","Plumbing",12.99,"each","plumbing,parts",4.0,0.25,8.50
"HVAC Diagnostic","System diagnosis and inspection","HVAC","Commercial",200.00,"job","hvac,diagnostic",1.0,2.0,0.00
"Electrical Panel Upgrade","200A panel upgrade","Electrical","Residential",2500.00,"job","electrical,upgrade",1.0,8.0,1800.00`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'catalog_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI-Powered CSV Import
        </CardTitle>
        <CardDescription>
          Upload any CSV - AI will automatically map columns to your catalog
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Mode */}
        <div className="space-y-2">
          <Label>Upload Mode</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={uploadMode === 'append' ? 'default' : 'outline'}
              onClick={() => setUploadMode('append')}
              className={uploadMode === 'append' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              ➕ Add to Existing
            </Button>
            <Button
              type="button"
              variant={uploadMode === 'replace' ? 'default' : 'outline'}
              onClick={() => setUploadMode('replace')}
              className={uploadMode === 'replace' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              🔄 Replace All
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {uploadMode === 'append' 
              ? '✅ Add new items while keeping existing ones'
              : '⚠️ WARNING: This will delete ALL existing items first!'}
          </p>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="csvFile">Select CSV File</Label>
          <div className="flex items-center gap-4">
            <label
              htmlFor="csvFile"
              className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-purple-500 transition-colors flex-1 bg-purple-50/50"
            >
              {file ? (
                <span className="text-sm font-medium flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Click to upload CSV file
                </span>
              )}
            </label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isAnalyzing || isImporting}
            />
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>
        </div>

        {/* Analyzing State */}
        {isAnalyzing && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              AI is analyzing your file and mapping columns...
            </AlertDescription>
          </Alert>
        )}

        {/* Mapping UI */}
        {(mappingSuggestion || manualMode) && !isAnalyzing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Column Mapping {mappingSuggestion && `(${mappingSuggestion.row_count} rows)`}
                {manualMode && <Badge variant="secondary" className="ml-2">Manual Mode</Badge>}
              </h3>
              <div className="flex gap-2">
                {!manualMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchToManualMode}
                  >
                    🔧 Map Manually
                  </Button>
                )}
              </div>
            </div>

            {/* All Columns - Manual Mapping */}
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50/50">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                📋 Map Your CSV Columns
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                For each CSV column, select which database field it should map to. Required fields: <strong>Name</strong> and <strong>Base Price</strong>
              </p>
              
              {csvHeaders.map((csvCol) => {
                const dbField = userMappings[csvCol] || 'SKIP'
                const fieldConfig = DB_FIELDS[dbField as keyof typeof DB_FIELDS]
                const sampleValues = csvPreview.slice(0, 2).map(row => row[csvCol]).filter(Boolean)
                
                return (
                  <div key={csvCol} className="grid grid-cols-2 gap-4 items-center p-3 bg-white rounded border">
                    <div>
                      <div className="font-medium text-sm">{csvCol}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {sampleValues.length > 0 ? `e.g. ${sampleValues.join(', ')}` : 'No data'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">→</span>
                      <Select
                        value={dbField}
                        onValueChange={(value) => {
                          setUserMappings(prev => ({
                            ...prev,
                            [csvCol]: value
                          }))
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SKIP">❌ Skip Column</SelectItem>
                          {Object.entries(DB_FIELDS).map(([field, config]) => (
                            <SelectItem key={field} value={field}>
                              {config.label}
                              {config.required && ' ⭐'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldConfig?.required && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Validation Messages */}
            {(() => {
              const mappedDbFields = Object.values(userMappings).filter(v => v !== 'SKIP')
              const hasName = mappedDbFields.includes('name')
              const hasPrice = mappedDbFields.includes('base_price')
              const missingRequired = []
              if (!hasName) missingRequired.push('Name')
              if (!hasPrice) missingRequired.push('Base Price')
              
              if (missingRequired.length > 0) {
                return (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Missing required fields:</strong> {missingRequired.join(', ')}
                      <br />
                      <span className="text-xs">You must map these columns to proceed.</span>
                    </AlertDescription>
                  </Alert>
                )
              }
              return null
            })()}

            {/* Preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preview (first 3 rows)</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {csvHeaders.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {csvHeaders.map((col, i) => (
                          <td key={i} className="px-3 py-2">{String(row[col] || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Button */}
            {(() => {
              const mappedDbFields = Object.values(userMappings).filter(v => v !== 'SKIP')
              const hasName = mappedDbFields.includes('name')
              const hasPrice = mappedDbFields.includes('base_price')
              const canImport = hasName && hasPrice
              
              return (
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !canImport}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {csvPreview.length > 0 ? `${csvPreview.length}+` : ''} Items
                    </>
                  )}
                </Button>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
