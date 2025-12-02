'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, TrendingUp, TrendingDown, Minus, 
  Target, DollarSign, Percent, BarChart3, Loader2 
} from 'lucide-react'
import { useDashboard } from '@/hooks/use-dashboard'
import { toast } from 'sonner'

interface AIAnalyticsData {
  total_ai_quotes: number
  optimizer_usage: number
  upsell_usage: number
  rag_usage: number
  avg_win_probability: number
  suggestion_acceptance_rate: number
  upsell_acceptance_rate: number
  total_upsell_revenue: number
  total_potential_revenue: number
  revenue_capture_rate: number
  win_rate_trend: string
  usage_trend: string
  daily_metrics: Array<{
    date: string
    optimizer_uses: number
    upsell_uses: number
    rag_uses: number
    avg_win_probability?: number
    upsell_revenue: number
  }>
}

export function AIAnalyticsDashboard() {
  const { company } = useDashboard()
  const [data, setData] = useState<AIAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (company?.id) {
      loadAnalytics()
    }
  }, [company?.id, days])

  const loadAnalytics = async () => {
    if (!company?.id) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai-analytics/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          days: days
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load AI analytics')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('AI analytics error:', error)
      toast.error('Failed to load AI analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-green-600'
    if (value >= threshold * 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No AI analytics data available yet. Start using AI features to see insights.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Performance Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track AI feature usage and business impact
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
              className={days === d ? 'bg-purple-600' : ''}
            >
              {d} days
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total AI Usage */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Total AI Quotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-purple-600">
              {data.total_ai_quotes}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              {getTrendIcon(data.usage_trend)}
              <span>{data.usage_trend} trend</span>
            </div>
          </CardContent>
        </Card>

        {/* Win Probability */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Win Probability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-sm font-bold ${getPerformanceColor(data.avg_win_probability, 60)}`}>
              {data.avg_win_probability.toFixed(0)}%
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              {getTrendIcon(data.win_rate_trend)}
              <span>{data.win_rate_trend} trend</span>
            </div>
          </CardContent>
        </Card>

        {/* Suggestion Acceptance */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Suggestion Acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-sm font-bold ${getPerformanceColor(data.suggestion_acceptance_rate, 30)}`}>
              {data.suggestion_acceptance_rate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.optimizer_usage} optimizer uses
            </div>
          </CardContent>
        </Card>

        {/* Upsell Revenue */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Upsell Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-emerald-600">
              ${data.total_upsell_revenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.revenue_capture_rate.toFixed(0)}% of potential
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feature Usage</CardTitle>
            <CardDescription>AI feature adoption breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* RAG Generation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                  <span>RAG Quote Generation</span>
                </div>
                <span className="font-bold">{data.rag_usage}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600"
                  style={{ width: `${(data.rag_usage / data.total_ai_quotes) * 100}%` }}
                />
              </div>
            </div>

            {/* Optimizer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span>Quote Optimizer</span>
                </div>
                <span className="font-bold">{data.optimizer_usage}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600"
                  style={{ width: `${(data.optimizer_usage / data.total_ai_quotes) * 100}%` }}
                />
              </div>
            </div>

            {/* Upsell */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-600"></div>
                  <span>Upsell Suggester</span>
                </div>
                <span className="font-bold">{data.upsell_usage}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600"
                  style={{ width: `${(data.upsell_usage / data.total_ai_quotes) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Business Impact</CardTitle>
            <CardDescription>Revenue and performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upsell Performance */}
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-sm font-medium text-emerald-900">Upsell Performance</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Acceptance Rate</span>
                  <span className="font-bold">{data.upsell_acceptance_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenue Captured</span>
                  <span className="font-bold">${data.total_upsell_revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Revenue</span>
                  <span className="font-bold">${data.total_potential_revenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900">Win Rate Optimization</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average Probability</span>
                  <span className="font-bold">{data.avg_win_probability.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trend</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(data.win_rate_trend)}
                    <span className="font-bold capitalize">{data.win_rate_trend}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROI Indicator */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm font-medium text-purple-900">AI ROI Indicator</div>
              <div className="mt-2">
                <div className="text-sm font-bold text-purple-700">
                  {data.total_upsell_revenue > 0 ? '+' : ''}
                  ${data.total_upsell_revenue.toLocaleString()}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Additional revenue from AI suggestions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Metrics Summary */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Success Metrics Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm font-bold text-green-600">
                {data.avg_win_probability >= 60 ? '✅' : '⚠️'}
              </div>
              <div className="text-sm font-medium mt-2">Win Probability</div>
              <div className="text-xs text-muted-foreground">
                Target: 60%+ | Actual: {data.avg_win_probability.toFixed(0)}%
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm font-bold text-green-600">
                {data.suggestion_acceptance_rate >= 15 ? '✅' : '⚠️'}
              </div>
              <div className="text-sm font-medium mt-2">Suggestion Acceptance</div>
              <div className="text-xs text-muted-foreground">
                Target: 15%+ | Actual: {data.suggestion_acceptance_rate.toFixed(0)}%
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-sm font-bold text-green-600">
                {data.total_upsell_revenue > 0 ? '✅' : '⚠️'}
              </div>
              <div className="text-sm font-medium mt-2">Revenue Impact</div>
              <div className="text-xs text-muted-foreground">
                Target: Positive | Actual: ${data.total_upsell_revenue.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
