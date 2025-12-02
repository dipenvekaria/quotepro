'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type Quote = {
  id: string
  customer_name: string
  quote_number: string
  status: string
  total: number
  created_at: string
}

type FilterType = 'all' | 'sent' | 'signed' | 'draft'

export function DashboardQuotes({ quotes }: { quotes: Quote[] }) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredQuotes = quotes.filter(quote => {
    if (filter === 'all') return true
    if (filter === 'sent') return quote.status === 'sent'
    if (filter === 'signed') return quote.status === 'signed'
    if (filter === 'draft') return quote.status === 'draft'
    return true
  })

  const sentQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'signed')
  const signedQuotes = quotes.filter(q => q.status === 'signed')
  const draftQuotes = quotes.filter(q => q.status === 'draft')

  return (
    <div>
      {/* Stats Grid - Now Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilter('sent')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotes Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary">{sentQuotes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click to view sent quotes
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilter('signed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Signed Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-green-600">{signedQuotes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click to view signed quotes
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilter('draft')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-gray-600">{draftQuotes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click to view drafts
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setFilter('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary">{quotes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click to view all quotes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List with Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {filter === 'all' && 'All Quotes'}
                {filter === 'sent' && 'Sent Quotes'}
                {filter === 'signed' && 'Signed Quotes'}
                {filter === 'draft' && 'Draft Quotes'}
              </CardTitle>
              <CardDescription>
                {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            {filter !== 'all' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilter('all')}
              >
                Show All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-sm font-bold mb-2">No {filter !== 'all' ? filter : ''} quotes yet</h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'all' 
                  ? 'Create your first quote and start winning more jobs'
                  : `No quotes with status "${filter}"`
                }
              </p>
              <Link href="/quotes/new">
                <Button className="bg-accent hover:bg-accent/90">
                  Create New Quote
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.slice(0, 10).map((quote) => (
                <a 
                  key={quote.id}
                  href={`/quotes/new?id=${quote.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer no-underline"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-foreground">{quote.customer_name}</h4>
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
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
