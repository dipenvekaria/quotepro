// @ts-nocheck - New lead_status column pending database migration
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, FileText, Phone, MapPin, Mail, Clock, CheckCircle2, XCircle, Plus, Search, Filter, TrendingUp, DollarSign, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, isAfter, isBefore, subDays } from 'date-fns'
import { NewLeadDialog } from './new-lead-dialog'
import { QuoteStatusBadge, canScheduleQuote, type QuoteFollowupStatus } from './quote-status-badge'

interface LeadsAndQuotesProps {
  leads: any[]
  quotes: any[]
  companyId: string
}

export function LeadsAndQuotes({ leads, quotes, companyId }: LeadsAndQuotesProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false)
  
  // Get initial values from URL params
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'leads')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [leadStatusFilter, setLeadStatusFilter] = useState(searchParams.get('leadStatus') || 'all')
  const [quoteStatusFilter, setQuoteStatusFilter] = useState(searchParams.get('quoteStatus') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [urgencyFilter, setUrgencyFilter] = useState(searchParams.get('urgency') || 'all')
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'leads') params.set('tab', activeTab)
    if (searchQuery) params.set('search', searchQuery)
    if (leadStatusFilter !== 'all') params.set('leadStatus', leadStatusFilter)
    if (quoteStatusFilter !== 'all') params.set('quoteStatus', quoteStatusFilter)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (urgencyFilter !== 'all') params.set('urgency', urgencyFilter)
    
    const newUrl = params.toString() ? `/leads?${params.toString()}` : '/leads'
    router.replace(newUrl, { scroll: false })
  }, [activeTab, searchQuery, leadStatusFilter, quoteStatusFilter, sortBy, urgencyFilter, router])

  // Handle URL parameters for opening dialogs
  useEffect(() => {
    if (searchParams.get('new_lead') === 'true') {
      setShowNewLeadDialog(true)
      setActiveTab('leads')
      // Clear the new_lead parameter
      const params = new URLSearchParams(searchParams.toString())
      params.delete('new_lead')
      const newUrl = params.toString() ? `/leads?${params.toString()}` : '/leads'
      router.replace(newUrl)
    }
  }, [searchParams, router])

  // Handle floating button click
  useEffect(() => {
    const handleOpenDialog = () => setShowNewLeadDialog(true)
    window.addEventListener('openNewLeadDialog', handleOpenDialog)
    return () => window.removeEventListener('openNewLeadDialog', handleOpenDialog)
  }, [])

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

  // Check if any filters are active
  const hasActiveFilters = searchQuery || leadStatusFilter !== 'all' || quoteStatusFilter !== 'all' || urgencyFilter !== 'all' || sortBy !== 'newest'

  return (
    <>
      <div className="space-y-3">
        {/* Main Tabs with Filter Icon */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between gap-3">
            <TabsList className="grid grid-cols-2 h-10 flex-1">
              <TabsTrigger value="leads" className="text-sm font-semibold">
                Leads ({filteredLeads.length})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="text-sm font-semibold">
                Quotes ({filteredQuotes.length})
              </TabsTrigger>
            </TabsList>
            
            {/* Filter Icon Button - Orange when active */}
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`h-10 w-10 p-0 relative ${hasActiveFilters ? 'bg-[#FF6200] hover:bg-[#E55800] text-white' : ''}`}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white border border-[#FF6200]" />
              )}
            </Button>
          </div>

          {/* Compact Filter Section - Only shown when expanded */}
          {isFilterExpanded && (
            <div className={`mt-3 p-3 border rounded-lg space-y-3 ${hasActiveFilters ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-muted/30'}`}>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 h-8 text-sm"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeTab === 'leads' ? (
                  <>
                    <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
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
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue placeholder="Urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="warm">🌡️ Warm</SelectItem>
                        <SelectItem value="cold">❄️ Cold</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
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

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    {activeTab === 'leads' && (
                      <SelectItem value="visit">Visit Date</SelectItem>
                    )}
                    {activeTab === 'quotes' && (
                      <>
                        <SelectItem value="amount-high">Highest $</SelectItem>
                        <SelectItem value="amount-low">Lowest $</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setLeadStatusFilter('all')
                      setQuoteStatusFilter('all')
                      setUrgencyFilter('all')
                      setSortBy('newest')
                    }}
                    className="h-8 px-3 text-xs border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Content Area */}
          <TabsContent value="leads" className="mt-0">
            {filteredLeads.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Phone className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-base font-medium">
                    {searchQuery || leadStatusFilter !== 'all' || urgencyFilter !== 'all' 
                      ? 'No leads match your filters' 
                      : 'No active leads'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery || leadStatusFilter !== 'all' || urgencyFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Click the orange + button to add a new lead'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="mt-0">
            {filteredQuotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-base font-medium">
                    {searchQuery || quoteStatusFilter !== 'all' 
                      ? 'No quotes match your filters' 
                      : 'No quotes yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery || quoteStatusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create quotes from your leads'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredQuotes.map((quote) => (
                  <QuoteRow key={quote.id} quote={quote} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog}
        companyId={companyId}
      />
    </>
  )
}

// Elegant Lead Card Component
function LeadRow({ lead }: { lead: any }) {
  const getStatusBadge = () => {
    switch (lead.lead_status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs font-medium">New Lead</Badge>
      case 'contacted':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs font-medium">Contacted</Badge>
      case 'quote_visit_scheduled':
        return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs font-medium">Visit Scheduled</Badge>
      case 'quoted':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs font-medium">Quoted</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-xs font-medium">Active</Badge>
    }
  }

  const handlePhoneClick = (e: React.MouseEvent, phone: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`tel:${phone}`, '_self')
  }

  const handleScheduleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // TODO: Open calendar scheduling modal
    console.log('Schedule clicked for lead:', lead.id)
  }

  const jobDetails = lead.description || lead.service_address_city || lead.customer_email || 'No job details'

  return (
    <Link href={`/quotes/new?id=${lead.id}`}>
      <Card className="hover:shadow-md transition-all cursor-pointer">
        <CardContent className="py-0.5 px-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left Side - Name and Job Details */}
            <div className="flex-1 min-w-0 space-y-0">
              <h3 className="text-sm font-semibold truncate leading-tight">
                {lead.customer_name}
              </h3>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {jobDetails}
              </p>
              <div className="flex items-center gap-2 flex-wrap leading-tight">
                {getStatusBadge()}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Action Icons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {lead.customer_phone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full hover:bg-green-50 text-green-600 p-0"
                  onClick={(e) => handlePhoneClick(e, lead.customer_phone)}
                  title="Call"
                >
                  <Phone className="h-5 w-5" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600 p-0"
                onClick={handleScheduleClick}
                title="Schedule"
              >
                <CalendarDays className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Elegant Quote Card Component
function QuoteRow({ quote }: { quote: any }) {
  // Use followup_status if it exists, otherwise fall back to old status mapping
  const followupStatus: QuoteFollowupStatus = quote.followup_status || 
    (quote.status === 'sent' ? 'sent' : 
     quote.status === 'signed' ? 'accepted' : 'draft')

  const canSchedule = canScheduleQuote(followupStatus)

  const handlePhoneClick = (e: React.MouseEvent, phone: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`tel:${phone}`, '_self')
  }

  const handlePdfClick = (e: React.MouseEvent, pdfUrl: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(pdfUrl, '_blank')
  }

  const handleScheduleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!canSchedule) {
      // Don't allow scheduling if quote not accepted
      return
    }
    
    // TODO: Open calendar scheduling modal
    console.log('Schedule clicked for quote:', quote.id)
  }

  const jobDetails = quote.description || quote.service_address_city || quote.customer_email || 'Quote details'

  return (
    <Link href={`/quotes/new?id=${quote.id}`}>
      <Card className="hover:shadow-md transition-all cursor-pointer">
        <CardContent className="py-0.5 px-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left Side - Name and Quote Details */}
            <div className="flex-1 min-w-0 space-y-0">
              <h3 className="text-sm font-semibold truncate leading-tight">
                {quote.customer_name}
              </h3>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {jobDetails}
              </p>
              <div className="flex items-center gap-2 flex-wrap leading-tight">
                {/* Show follow-up status badge with color coding */}
                <QuoteStatusBadge status={followupStatus} size="sm" />
                
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-green-600">
                    ${(quote.total || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Action Icons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {quote.customer_phone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full hover:bg-green-50 text-green-600 p-0"
                  onClick={(e) => handlePhoneClick(e, quote.customer_phone)}
                  title="Call Customer"
                >
                  <Phone className="h-5 w-5" />
                </Button>
              )}
              
              {/* Calendar icon - only enabled/highlighted when accepted */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 rounded-full p-0 transition-all ${
                  canSchedule 
                    ? 'hover:bg-blue-50 text-blue-600 hover:scale-110' 
                    : 'text-gray-300 cursor-not-allowed opacity-50'
                }`}
                onClick={handleScheduleClick}
                title={canSchedule ? 'Schedule Job' : 'Quote must be accepted first'}
                disabled={!canSchedule}
              >
                <CalendarDays className="h-5 w-5" />
              </Button>
              
              {quote.pdf_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full hover:bg-orange-50 text-orange-600 p-0"
                  onClick={(e) => handlePdfClick(e, quote.pdf_url)}
                  title="View PDF"
                >
                  <FileText className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Keep old card components for backwards compatibility
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
