// @ts-nocheck - Supabase type generation pending
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Target, Award, BarChart3 } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'

export default function AnalyticsPage() {
  const { quotes } = useDashboard()

  // Calculate analytics
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  
  const quotesThisMonth = quotes.filter(q => {
    const date = new Date(q.created_at)
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear
  })

  const sentQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'signed')
  const signedQuotes = quotes.filter(q => q.status === 'signed')
  const signedThisMonth = quotesThisMonth.filter(q => q.status === 'signed')
  
  const winRate = sentQuotes.length > 0 
    ? Math.round((signedQuotes.length / sentQuotes.length) * 100) 
    : 0

  const averageQuoteValue = quotes.length > 0
    ? Math.round(quotes.reduce((acc, q) => acc + q.total, 0) / quotes.length)
    : 0

  const totalRevenue = signedQuotes.reduce((acc, q) => acc + q.total, 0)

  const revenueThisMonth = signedThisMonth.reduce((acc, q) => acc + q.total, 0)

  // Status breakdown
  const statusCounts = {
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    signed: quotes.filter(q => q.status === 'signed').length,
    declined: quotes.filter(q => q.status === 'declined').length,
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Win Rate
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#FF6200]">{winRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {signedQuotes.length} of {sentQuotes.length} sent quotes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Quote Value
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${averageQuoteValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {quotes.length} quotes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {signedQuotes.length} signed quotes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${revenueThisMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {signedThisMonth.length} deals closed
              </p>
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
                <div className="text-3xl font-bold text-gray-600">{statusCounts.draft}</div>
                <p className="text-sm text-muted-foreground mt-2">Draft</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.draft / quotes.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{statusCounts.sent}</div>
                <p className="text-sm text-muted-foreground mt-2">Sent</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.sent / quotes.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-3xl font-bold text-green-600">{statusCounts.signed}</div>
                <p className="text-sm text-muted-foreground mt-2">Signed</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {quotes.length > 0 ? Math.round((statusCounts.signed / quotes.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-3xl font-bold text-red-600">{statusCounts.declined}</div>
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
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <Award className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Strong Win Rate!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your {winRate}% win rate is excellent. Keep up the great work!
                    </p>
                  </div>
                </div>
              ) : winRate > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <Target className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Room for Improvement</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your {winRate}% win rate has potential. Consider following up faster or refining your quotes.
                    </p>
                  </div>
                </div>
              ) : null}

              {averageQuoteValue > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Average Quote Value</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${averageQuoteValue.toLocaleString()} per quote. Consider upselling to increase this number.
                    </p>
                  </div>
                </div>
              )}

              {signedThisMonth.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-[#FF6200]/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-[#FF6200] mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">This Month's Progress</p>
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
                <p className="font-medium">Advanced Charts Coming Soon</p>
                <p className="text-sm mt-2">Revenue over time, conversion funnels, and more</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
