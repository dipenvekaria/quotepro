'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, TrendingUp, TrendingDown, Target, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface QuoteOptimizerPanelProps {
  companyId: string
  jobDescription: string
  proposedTotal: number
  lineItems: Array<{
    name: string
    quantity: number
    unit_price: number
    total: number
  }>
  customerAddress?: string
  onApplySuggestion?: (suggestedTotal: number) => void
}

interface OptimizerResult {
  win_probability: number
  confidence: string
  recommendation: string
  suggested_total?: number
  price_position: string
  market_data: {
    similar_quotes_analyzed: number
    won_quotes: number
    lost_quotes: number
    average_won_price: number
    average_lost_price: number
    median_price: number
  }
  margin_analysis: {
    estimated_margin: number
    margin_percentage: number
    total: number
    benchmark: string
  }
  insights: string
  similar_quotes_summary: Array<{
    job_type: string
    total: number
    status: string
    similarity: number
  }>
}

export function QuoteOptimizerPanel({
  companyId,
  jobDescription,
  proposedTotal,
  lineItems,
  customerAddress,
  onApplySuggestion
}: QuoteOptimizerPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<OptimizerResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const analyzeQuote = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/optimize-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          job_description: jobDescription,
          proposed_total: proposedTotal,
          line_items: lineItems,
          customer_address: customerAddress
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze quote')
      }

      const data = await response.json()
      setResult(data)
      toast.success('Quote analysis complete')
    } catch (error) {
      console.error('Quote optimization error:', error)
      toast.error('Failed to analyze quote')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getWinProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-green-600'
    if (probability >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPositionBadge = (position: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      aggressive: { label: 'Aggressive', className: 'bg-green-100 text-green-700' },
      competitive: { label: 'Competitive', className: 'bg-blue-100 text-blue-700' },
      moderate: { label: 'Moderate', className: 'bg-yellow-100 text-yellow-700' },
      premium: { label: 'Premium', className: 'bg-purple-100 text-purple-700' }
    }
    
    const variant = variants[position] || variants.moderate
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getRecommendationIcon = (rec: string) => {
    if (rec === 'maintain') return <Target className="h-4 w-4 text-green-600" />
    if (rec.includes('lower')) return <TrendingDown className="h-4 w-4 text-blue-600" />
    return <TrendingUp className="h-4 w-4 text-blue-600" />
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Quote Optimizer</CardTitle>
          </div>
          {result && (
            <Badge variant="outline" className="text-xs">
              {result.confidence} confidence
            </Badge>
          )}
        </div>
        <CardDescription>
          Win probability analysis based on {result?.market_data.similar_quotes_analyzed || 'historical'} similar quotes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!result ? (
          <Button
            onClick={analyzeQuote}
            disabled={isAnalyzing || !jobDescription || lineItems.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Quote
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Win Probability */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Win Probability</span>
                <span className={`text-sm font-bold ${getWinProbabilityColor(result.win_probability)}`}>
                  {(result.win_probability * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={result.win_probability * 100} className="h-2" />
            </div>

            {/* Price Position */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <span className="text-sm font-medium">Price Position</span>
              {getPositionBadge(result.price_position)}
            </div>

            {/* Recommendation */}
            <div className="p-4 bg-white rounded-lg border border-purple-200 space-y-3">
              <div className="flex items-start gap-2">
                {getRecommendationIcon(result.recommendation)}
                <div className="flex-1">
                  <div className="text-sm font-medium capitalize">
                    {result.recommendation.replace(/_/g, ' ')}
                  </div>
                  {result.suggested_total && result.suggested_total !== proposedTotal && (
                    <div className="mt-2 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Suggested: <span className="font-bold text-foreground">${result.suggested_total.toLocaleString()}</span>
                        {' '}
                        <span className="text-xs">
                          ({((result.suggested_total - proposedTotal) / proposedTotal * 100).toFixed(1)}%)
                        </span>
                      </div>
                      {onApplySuggestion && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApplySuggestion(result.suggested_total!)}
                          className="text-xs"
                        >
                          Apply Suggestion
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {result.insights && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs font-medium text-blue-900 mb-1">AI Insights</div>
                <div className="text-sm text-blue-800 whitespace-pre-line">
                  {result.insights}
                </div>
              </div>
            )}

            {/* Market Data Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white rounded border">
                <div className="text-muted-foreground">Won Quotes</div>
                <div className="font-bold">{result.market_data.won_quotes}/{result.market_data.similar_quotes_analyzed}</div>
              </div>
              <div className="p-2 bg-white rounded border">
                <div className="text-muted-foreground">Avg Won Price</div>
                <div className="font-bold">${result.market_data.average_won_price.toLocaleString()}</div>
              </div>
            </div>

            {/* Toggle Details */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-xs"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>

            {/* Detailed Analysis */}
            {showDetails && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Margin Analysis</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded border">
                      <div className="text-muted-foreground">Margin %</div>
                      <div className="font-bold">{result.margin_analysis.margin_percentage.toFixed(1)}%</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <div className="text-muted-foreground">Est. Profit</div>
                      <div className="font-bold">${result.margin_analysis.estimated_margin.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground italic">
                    {result.margin_analysis.benchmark}
                  </div>
                </div>

                {result.similar_quotes_summary.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Similar Quotes</div>
                    <div className="space-y-1">
                      {result.similar_quotes_summary.slice(0, 3).map((quote, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                          <div className="flex-1 truncate">{quote.job_type}</div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                quote.status === 'won'
                                  ? 'bg-green-50 text-green-700'
                                  : quote.status === 'lost'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-gray-50'
                              }
                            >
                              {quote.status}
                            </Badge>
                            <span className="font-bold">${quote.total.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Re-analyze Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeQuote}
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
