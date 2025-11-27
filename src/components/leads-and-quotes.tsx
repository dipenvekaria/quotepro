// @ts-nocheck - New lead_status column pending database migration
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, FileText, Phone, MapPin, Mail, Clock, CheckCircle2, XCircle, Plus, Search, Filter, TrendingUp, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, isAfter, isBefore, subDays } from 'date-fns'
import { NewLeadDialog } from './new-lead-dialog'

interface LeadsAndQuotesProps {
  leads: any[]
  quotes: any[]
  companyId: string
}

export function LeadsAndQuotes({ leads, quotes, companyId }: LeadsAndQuotesProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('leads')
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [urgencyFilter, setUrgencyFilter] = useState('all')

  // Handle URL parameters
  useEffect(() => {
    if (searchParams.get('new_lead') === 'true') {
      setShowNewLeadDialog(true)
      setActiveTab('leads')
    }
    if (searchParams.get('tab') === 'quotes') {
      setActiveTab('quotes')
    }
  }, [searchParams])

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        lead.customer_name?.toLowerCase().includes(searchLower) ||
        lead.customer_phone?.toLowerCase().includes(searchLower) ||
        lead.customer_address?.toLowerCase().includes(searchLower) ||
        lead.notes?.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = leadStatusFilter === 'all' || lead.lead_status === leadStatusFilter

      // Urgency filter (based on created date and visit date)
      let matchesUrgency = true
      if (urgencyFilter === 'hot') {
        // Hot: Created in last 24 hours or visit scheduled in next 48 hours
        const isNew = isAfter(new Date(lead.created_at), subDays(new Date(), 1))
        const hasUpcomingVisit = lead.quote_visit_date && 
          isBefore(new Date(lead.quote_visit_date), subDays(new Date(), -2))
        matchesUrgency = isNew || hasUpcomingVisit
      } else if (urgencyFilter === 'warm') {
        // Warm: Created in last week
        matchesUrgency = isAfter(new Date(lead.created_at), subDays(new Date(), 7))
      } else if (urgencyFilter === 'cold') {
        // Cold: Older than a week, no visit scheduled
        matchesUrgency = isBefore(new Date(lead.created_at), subDays(new Date(), 7)) && !lead.quote_visit_date
      }

      return matchesSearch && matchesStatus && matchesUrgency
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return (a.customer_name || '').localeCompare(b.customer_name || '')
        case 'visit':
          // Sort by visit date, nulls last
          if (!a.quote_visit_date && !b.quote_visit_date) return 0
          if (!a.quote_visit_date) return 1
          if (!b.quote_visit_date) return -1
          return new Date(a.quote_visit_date).getTime() - new Date(b.quote_visit_date).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [leads, searchQuery, leadStatusFilter, sortBy, urgencyFilter])

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    let filtered = quotes.filter(quote => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        quote.customer_name?.toLowerCase().includes(searchLower) ||
        quote.quote_number?.toLowerCase().includes(searchLower) ||
        quote.customer_phone?.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = quoteStatusFilter === 'all' || quote.lead_status === quoteStatusFilter

      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return (a.customer_name || '').localeCompare(b.customer_name || '')
        case 'amount-high':
          return (b.total || 0) - (a.total || 0)
        case 'amount-low':
          return (a.total || 0) - (b.total || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [quotes, searchQuery, quoteStatusFilter, sortBy])

  // Calculate stats
  const stats = useMemo(() => {
    const totalLeadValue = filteredQuotes
      .filter(q => q.lead_status === 'quoted')
      .reduce((sum, q) => sum + (q.total || 0), 0)
    
    const totalSigned = filteredQuotes
      .filter(q => q.lead_status === 'signed')
      .reduce((sum, q) => sum + (q.total || 0), 0)

    const hotLeads = filteredLeads.filter(lead => {
      const isNew = isAfter(new Date(lead.created_at), subDays(new Date(), 1))
      const hasUpcomingVisit = lead.quote_visit_date && 
        isBefore(new Date(lead.quote_visit_date), subDays(new Date(), -2))
      return isNew || hasUpcomingVisit
    }).length

    const pendingVisits = filteredLeads.filter(l => l.quote_visit_date).length

    return {
      totalLeadValue,
      totalSigned,
      hotLeads,
      pendingVisits,
      conversionRate: leads.length > 0 
        ? Math.round((quotes.filter(q => q.lead_status === 'signed').length / leads.length) * 100)
        : 0
    }
  }, [filteredLeads, filteredQuotes, leads, quotes])

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="leads">
                Leads ({filteredLeads.length})
              </TabsTrigger>
              <TabsTrigger value="quotes">
                Quotes ({filteredQuotes.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-lg">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 bg-background"
              />
            </div>

            {/* Status Filter */}
            {activeTab === 'leads' ? (
              <>
                <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="quote_visit_scheduled">Visit Scheduled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="w-[120px] h-9 bg-background">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="warm">🌡️ Warm</SelectItem>
                    <SelectItem value="cold">❄️ Cold</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-9 bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                {activeTab === 'leads' && (
                  <SelectItem value="visit">Visit Date</SelectItem>
                )}
                {activeTab === 'quotes' && (
                  <>
                    <SelectItem value="amount-high">Highest Value</SelectItem>
                    <SelectItem value="amount-low">Lowest Value</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || leadStatusFilter !== 'all' || quoteStatusFilter !== 'all' || urgencyFilter !== 'all' || sortBy !== 'newest') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setLeadStatusFilter('all')
                  setQuoteStatusFilter('all')
                  setUrgencyFilter('all')
                  setSortBy('newest')
                }}
                className="h-9"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

      {/* Leads Tab */}
      <TabsContent value="leads" className="mt-6">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {searchQuery || leadStatusFilter !== 'all' || urgencyFilter !== 'all' 
                  ? 'No leads match your filters' 
                  : 'No active leads'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || leadStatusFilter !== 'all' || urgencyFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Click the orange + button to add a new lead'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2 px-1">
              <p className="text-xs text-muted-foreground">
                Showing {filteredLeads.length} of {leads.length} leads
              </p>
            </div>
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </>
        )}
      </TabsContent>

      {/* Quotes Tab */}
      <TabsContent value="quotes" className="mt-6">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {searchQuery || quoteStatusFilter !== 'all' 
                  ? 'No quotes match your filters' 
                  : 'No quotes yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || quoteStatusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create quotes from your leads'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2 px-1">
              <p className="text-xs text-muted-foreground">
                Showing {filteredQuotes.length} of {quotes.length} quotes • Total value: ${filteredQuotes.reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              {filteredQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>

    <NewLeadDialog 
      open={showNewLeadDialog} 
      onOpenChange={setShowNewLeadDialog}
      companyId={companyId}
    />
    </>
  )
}

function LeadCard({ lead }: { lead: any }) {
  const getStatusBadge = () => {
    switch (lead.lead_status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">New</Badge>
      case 'contacted':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Contacted</Badge>
      case 'quote_visit_scheduled':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Visit Scheduled</Badge>
      default:
        return null
    }
  }

  // Calculate urgency
  const getUrgencyIndicator = () => {
    const isNew = isAfter(new Date(lead.created_at), subDays(new Date(), 1))
    const hasUpcomingVisit = lead.quote_visit_date && 
      isBefore(new Date(lead.quote_visit_date), subDays(new Date(), -2)) &&
      isAfter(new Date(lead.quote_visit_date), new Date())
    
    if (isNew || hasUpcomingVisit) {
      return <Badge className="bg-red-500 text-white text-xs">🔥 Hot</Badge>
    }
    
    const isWarm = isAfter(new Date(lead.created_at), subDays(new Date(), 7))
    if (isWarm) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">🌡️ Warm</Badge>
    }
    
    return null
  }

  const daysOld = Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Customer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{lead.customer_name}</h3>
              {getStatusBadge()}
              {getUrgencyIndicator()}
              {daysOld > 14 && !lead.quote_visit_date && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 text-xs">
                  ⏰ {daysOld}d old
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {lead.customer_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{lead.customer_phone}</span>
                </div>
              )}
              {lead.customer_email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{lead.customer_email}</span>
                </div>
              )}
              {lead.customer_address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{lead.customer_address}</span>
                </div>
              )}
            </div>

            {/* Second row: Visit date, notes preview, timing */}
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
              {lead.quote_visit_date && (
                <div className="flex items-center gap-1 text-orange-600 font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>Visit: {new Date(lead.quote_visit_date).toLocaleDateString()}</span>
                </div>
              )}
              {lead.notes && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{lead.notes}</span>
                </div>
              )}
              <span className="text-muted-foreground/60">
                Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              <Link href={`/quotes/new?lead_id=${lead.id}`}>
                <Calendar className="h-3 w-3 mr-1" />
                Visit
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 text-xs bg-[#FF6200] hover:bg-[#FF6200]/90"
            >
              <Link href={`/quotes/new?id=${lead.id}`}>
                <FileText className="h-3 w-3 mr-1" />
                Quote
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuoteCard({ quote }: { quote: any }) {
  const getStatusBadge = () => {
    switch (quote.lead_status) {
      case 'quoted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Quoted</Badge>
      case 'signed':
        return <Badge className="bg-green-600 text-xs">Signed</Badge>
      case 'lost':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Lost</Badge>
      default:
        return null
    }
  }

  // Calculate days pending (for quoted status)
  const daysPending = Math.floor((new Date().getTime() - new Date(quote.created_at).getTime()) / (1000 * 60 * 60 * 24))
  
  // Check if quote is expiring soon (assuming 30 day validity)
  const isExpiring = quote.lead_status === 'quoted' && daysPending > 21 && daysPending < 30
  const isExpired = quote.lead_status === 'quoted' && daysPending >= 30

  // Calculate profit margin (assuming cost is 60% of total)
  const estimatedCost = quote.total * 0.6
  const estimatedProfit = quote.total - estimatedCost
  const profitMargin = quote.total > 0 ? ((estimatedProfit / quote.total) * 100).toFixed(0) : 0

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Customer & Quote info */}
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{quote.customer_name}</h3>
                {getStatusBadge()}
                {isExpiring && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                    ⚠️ Expiring Soon
                  </Badge>
                )}
                {isExpired && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
                    ❌ Expired
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{quote.quote_number}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}</span>
                {quote.lead_status === 'quoted' && (
                  <>
                    <span>•</span>
                    <span className={daysPending > 14 ? 'text-orange-600 font-medium' : ''}>
                      {daysPending}d pending
                    </span>
                  </>
                )}
                {quote.quote_visit_date && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 text-orange-600">
                      <Calendar className="h-3 w-3" />
                      <span>Visited {new Date(quote.quote_visit_date).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Additional info row */}
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                {quote.customer_phone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{quote.customer_phone}</span>
                  </div>
                )}
                {quote.customer_address && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{quote.customer_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount & Financial Info */}
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-bold text-[#FF6200]">
                ${quote.total.toLocaleString()}
              </div>
              {quote.lead_status === 'quoted' && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>~{profitMargin}% margin</span>
                </div>
              )}
              {quote.lead_status === 'signed' && quote.signed_at && (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Signed {new Date(quote.signed_at).toLocaleDateString()}</span>
                </div>
              )}
              {quote.lead_status === 'lost' && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  <span>Lost opportunity</span>
                </div>
              )}
              {quote.payment_status && quote.lead_status === 'signed' && (
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      quote.payment_status === 'received' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : quote.payment_status === 'sent'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}
                  >
                    {quote.payment_status === 'received' ? '✓ Paid' : 
                     quote.payment_status === 'sent' ? '📧 Invoice Sent' : 
                     '⏳ Payment Due'}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              <Link href={`/quotes/new?id=${quote.id}`}>
                View
              </Link>
            </Button>
            {quote.pdf_url && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <a href={quote.pdf_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
