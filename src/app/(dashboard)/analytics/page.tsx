// @ts-nocheck - Supabase type generation pending
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Target, Award, BarChart3 } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function AnalyticsPage() {
  const {
    quotes,
    sentQuotes,
    signedQuotes,
    signedThisMonth,
    winRate,
    averageQuoteValue,
    totalRevenue,
    revenueThisMonth,
    statusCounts
  } = useAnalytics()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-base text-muted-foreground mt-1">
              Track your performance and grow your business
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Win Rate
                  </p>
                  <div className="text-3xl font-bold text-[#2563eb] mt-2">{winRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {signedQuotes.length} of {sentQuotes.length} sent quotes
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Award className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Avg Quote Value
                  </p>
                  <div className="text-3xl font-bold mt-2">${averageQuoteValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {quotes.length} quotes
                  </p>
                </div>
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center shadow-md">
                  <Target className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Total Revenue
                  </p>
                  <div className="text-3xl font-bold text-green-600 mt-2">${totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {signedQuotes.length} signed quotes
                  </p>
                </div>
                <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    This Month
                  </p>
                  <div className="text-3xl font-bold mt-2">${revenueThisMonth.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {signedThisMonth.length} deals closed
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Status Breakdown</CardTitle>
            <CardDescription>Distribution of quotes by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-6 border rounded-lg">
                <div className="text-sm font-bold text-gray-600">{statusCounts.draft}</div>
                <p className="text-sm text-muted-foreground mt-2">Draft</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.draft / quotes.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-sm font-bold text-blue-600">{statusCounts.sent}</div>
                <p className="text-sm text-muted-foreground mt-2">Sent</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.sent / quotes.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-sm font-bold text-green-600">{statusCounts.signed}</div>
                <p className="text-sm text-muted-foreground mt-2">Signed</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.signed / quotes.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-sm font-bold text-red-600">{statusCounts.declined}</div>
                <p className="text-sm text-muted-foreground mt-2">Declined</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.declined / quotes.length) * 100) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>Key takeaways from your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {winRate >= 50 ? (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Award className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Strong Win Rate!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your {winRate}% win rate is excellent. Keep up the great work!
                    </p>
                  </div>
                </div>
              ) : winRate > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <Target className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Room for Improvement</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your {winRate}% win rate has potential. Consider following up faster or refining your quotes.
                    </p>
                  </div>
                </div>
              ) : null}

              {averageQuoteValue > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Average Quote Value</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${averageQuoteValue.toLocaleString()} per quote. Consider upselling to increase this number.
                    </p>
                  </div>
                </div>
              )}

              {signedThisMonth.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-[#2563eb]/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-[#2563eb] mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">This Month's Progress</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {signedThisMonth.length} deal{signedThisMonth.length !== 1 ? 's' : ''} closed for ${revenueThisMonth.toLocaleString()} in revenue.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Charts & Visualizations</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="font-bold">Advanced Charts Coming Soon</p>
                <p className="text-sm mt-2">Revenue over time, conversion funnels, and more</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
