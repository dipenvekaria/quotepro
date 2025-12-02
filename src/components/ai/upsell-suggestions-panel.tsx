'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles, TrendingUp, Loader2, Plus, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface UpsellSuggestionsPanelProps {
  companyId: string
  jobDescription: string
  currentItems: Array<{
    name: string
    quantity: number
    unit_price: number
    total: number
  }>
  currentTotal: number
  customerAddress?: string
  onAddItems?: (items: Array<{
    name: string
    unit_price: number
    quantity: number
  }>) => void
}

interface UpsellSuggestion {
  item_name: string
  category: string
  estimated_value: number
  reason: string
  source: string
  confidence: string
  frequency?: number
  frequency_percentage?: number
}

interface UpsellResult {
  suggestions: UpsellSuggestion[]
  potential_increase: number
  potential_increase_percentage: number
  confidence: string
  analysis: {
    quotes_analyzed: number
    patterns_found: number
    pattern_suggestions: number
    ai_suggestions: number
  }
  market_insights: {
    average_won_quote: number
    highest_won_quote: number
    current_vs_average: number
    upside_potential: number
  }
}

export function UpsellSuggestionsPanel({
  companyId,
  jobDescription,
  currentItems,
  currentTotal,
  customerAddress,
  onAddItems
}: UpsellSuggestionsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<UpsellResult | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  const analyzeUpsells = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/suggest-upsells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          job_description: jobDescription,
          current_items: currentItems,
          current_total: currentTotal,
          customer_address: customerAddress
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get upsell suggestions')
      }

      const data = await response.json()
      setResult(data)
      setSelectedItems(new Set())
      toast.success(`Found ${data.suggestions.length} upsell opportunities`)
    } catch (error) {
      console.error('Upsell analysis error:', error)
      toast.error('Failed to analyze upsells')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const addSelectedItems = () => {
    if (!result || !onAddItems) return

    const itemsToAdd = Array.from(selectedItems).map(index => {
      const suggestion = result.suggestions[index]
      return {
        name: suggestion.item_name,
        unit_price: suggestion.estimated_value,
        quantity: 1
      }
    })

    onAddItems(itemsToAdd)
    toast.success(`Added ${itemsToAdd.length} items to quote`)
    setSelectedItems(new Set())
  }

  const getSelectedTotal = () => {
    if (!result) return 0
    return Array.from(selectedItems).reduce((sum, index) => {
      return sum + result.suggestions[index].estimated_value
    }, 0)
  }

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, string> = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700'
    }
    return <Badge className={variants[confidence] || variants.medium}>{confidence}</Badge>
  }

  const getSourceIcon = (source: string) => {
    if (source === 'ai_recommendation') {
      return <Sparkles className="h-3 w-3 text-purple-600" />
    }
    return <TrendingUp className="h-3 w-3 text-blue-600" />
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle>Upsell Suggestions</CardTitle>
          </div>
          {result && (
            <Badge variant="outline" className="text-xs">
              +${result.potential_increase.toLocaleString()} potential
            </Badge>
          )}
        </div>
        <CardDescription>
          AI-powered recommendations based on {result?.analysis.quotes_analyzed || 'historical'} similar won quotes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!result ? (
          <Button
            onClick={analyzeUpsells}
            disabled={isAnalyzing || !jobDescription || currentItems.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Find Upsell Opportunities
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            {result.suggestions.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Potential Increase</div>
                  <div className="text-sm font-bold text-green-600">
                    +${result.potential_increase.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.potential_increase_percentage.toFixed(1)}% boost
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="mt-1">
                    {getConfidenceBadge(result.confidence)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.analysis.quotes_analyzed} quotes analyzed
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions List */}
            {result.suggestions.length === 0 ? (
              <div className="p-4 bg-white rounded-lg border text-center text-sm text-muted-foreground">
                No upsell opportunities found for this quote.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recommended Items</div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {result.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 bg-white rounded-lg border transition-all ${
                        selectedItems.has(index)
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.has(index)}
                          onCheckedChange={() => toggleItem(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{suggestion.item_name}</div>
                              <div className="text-xs text-muted-foreground">{suggestion.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">
                                ${suggestion.estimated_value.toLocaleString()}
                              </div>
                              {getConfidenceBadge(suggestion.confidence)}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            {getSourceIcon(suggestion.source)}
                            <span>{suggestion.reason}</span>
                          </div>
                          
                          {suggestion.frequency_percentage && (
                            <div className="mt-1 text-xs text-blue-600">
                              Appears in {suggestion.frequency_percentage}% of similar quotes
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Insights */}
            {result.market_insights && result.market_insights.upside_potential > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs font-medium text-green-900 mb-1">💡 Market Insight</div>
                <div className="text-sm text-green-800">
                  Similar won quotes average ${result.market_insights.average_won_quote.toLocaleString()}.
                  You have ${result.market_insights.upside_potential.toLocaleString()} upside potential.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedItems.size > 0 && onAddItems && (
              <div className="p-3 bg-blue-100 rounded-lg border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{selectedItems.size} items selected</span>
                  <span className="font-bold text-blue-700">
                    +${getSelectedTotal().toLocaleString()}
                  </span>
                </div>
                <Button
                  onClick={addSelectedItems}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Selected to Quote
                </Button>
              </div>
            )}

            {/* Re-analyze Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeUpsells}
              disabled={isAnalyzing}
              className="w-full text-xs"
            >
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
