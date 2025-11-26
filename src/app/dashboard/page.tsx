// @ts-nocheck - Supabase type generation pending
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import { DashboardNav } from '@/components/dashboard-nav'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!company) {
    redirect('/onboarding')
  }

  // Fetch stats
  const { data: allQuotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('company_id', company.id)

  const quotes = allQuotes || []
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

  const averageJobSize = signedQuotes.length > 0
    ? Math.round(signedQuotes.reduce((acc, q) => acc + q.total, 0) / signedQuotes.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:flex overflow-x-hidden">
      {/* Sidebar Navigation - Desktop only */}
      <div className="hidden lg:block">
        <DashboardNav />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-[#0F172A] border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DashboardNav buttonOnly />
                <div className="bg-[#FF6200] p-2 rounded-lg">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">QuoteBuilder Pro</h1>
                  <p className="text-[#FF6200] text-sm font-semibold">
                    Stop losing jobs to slow quotes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Info with Settings */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
              {company.logo_url && (
                <div className="h-16 w-16 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain" />
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold text-primary">{company.name}</h2>
                <p className="text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quotes Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{sentQuotes.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Signed This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{signedThisMonth.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleString('default', { month: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{winRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {signedQuotes.length} of {sentQuotes.length} sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Job Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ${averageJobSize.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {signedQuotes.length} completed jobs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
            <CardDescription>
              Your latest customer quotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first quote and start winning more jobs
                </p>
                <Link href="/quotes/new">
                  <Button className="bg-accent hover:bg-accent/90">
                    Create First Quote
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.slice(0, 10).map((quote) => (
                  <Link 
                    key={quote.id}
                    href={`/quotes/new?id=${quote.id}`}
                  >
                    <div
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold">{quote.customer_name}</h4>
                          <Badge variant={
                            quote.status === 'signed' ? 'default' : 
                            quote.status === 'sent' ? 'secondary' : 
                            'outline'
                          }>
                            {quote.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          #{quote.quote_number} • ${quote.total.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
  )
}
