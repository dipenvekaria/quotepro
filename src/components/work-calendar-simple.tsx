'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Phone, MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Quote = {
  id: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  quote_number: string
  status: string
  total: number
  created_at: string
  signed_at?: string
  job_scheduled_date?: string
  job_status?: string
  payment_status?: string
  notes?: string
}

export function WorkCalendar({ quotes }: { quotes: Quote[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')

  // All work jobs (signed quotes)
  const allJobs = useMemo(() => 
    quotes.filter(q => q.status === 'signed' || q.job_status),
    [quotes]
  )

  // Get job status label
  const getJobStatus = (quote: Quote) => {
    if (!quote.job_scheduled_date && (quote.status === 'signed' || quote.job_status === 'to_schedule')) {
      return 'to_schedule'
    } else if (quote.job_scheduled_date && quote.job_status !== 'in_progress' && quote.job_status !== 'completed') {
      return 'scheduled'
    } else if (quote.job_status === 'in_progress' || quote.status === 'in-progress') {
      return 'in_progress'
    } else if (quote.job_status === 'completed' || quote.status === 'completed') {
      return 'completed'
    }
    return 'to_schedule'
  }

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = allJobs.filter(job => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        job.customer_name?.toLowerCase().includes(searchLower) ||
        job.quote_number?.toLowerCase().includes(searchLower) ||
        job.customer_phone?.toLowerCase().includes(searchLower) ||
        job.customer_address?.toLowerCase().includes(searchLower)
      
      // Status filter
      const jobStatus = getJobStatus(job)
      const matchesStatus = statusFilter === 'all' || jobStatus === statusFilter
      
      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.signed_at || b.created_at).getTime() - new Date(a.signed_at || a.created_at).getTime()
        case 'oldest':
          return new Date(a.signed_at || a.created_at).getTime() - new Date(b.signed_at || b.created_at).getTime()
        case 'name':
          return (a.customer_name || '').localeCompare(b.customer_name || '')
        default:
          return 0
      }
    })

    return filtered
  }, [allJobs, searchQuery, statusFilter, sortBy])

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      all: allJobs.length,
      to_schedule: allJobs.filter(j => getJobStatus(j) === 'to_schedule').length,
      scheduled: allJobs.filter(j => getJobStatus(j) === 'scheduled').length,
      in_progress: allJobs.filter(j => getJobStatus(j) === 'in_progress').length,
      completed: allJobs.filter(j => getJobStatus(j) === 'completed').length,
    }
  }, [allJobs])

  // Job Card Component
  const JobCard = ({ quote }: { quote: Quote }) => {
    const jobStatus = getJobStatus(quote)
    
    const statusConfig = {
      to_schedule: { label: 'To Schedule', color: 'bg-gray-500' },
      scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
      in_progress: { label: 'In Progress', color: 'bg-[#FF6200]' },
      completed: { label: 'Completed', color: 'bg-green-500' },
    }

    const config = statusConfig[jobStatus] || statusConfig.to_schedule

    return (
      <Card className="hover:shadow-md transition-all">
        <a href={`/quotes/new?id=${quote.id}`} className="block">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{quote.customer_name}</h3>
                <p className="text-sm text-muted-foreground font-mono mt-1">{quote.quote_number}</p>
              </div>
              <Badge className={`${config.color} text-white flex-shrink-0`}>
                {config.label}
              </Badge>
            </div>

            <div className="space-y-2.5 text-sm">
              {quote.customer_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{quote.customer_phone}</span>
                </div>
              )}
              
              {quote.customer_address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{quote.customer_address}</span>
                </div>
              )}

              {quote.signed_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Signed {formatDistanceToNow(new Date(quote.signed_at), { addSuffix: true })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </a>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs ({statusCounts.all})</SelectItem>
                <SelectItem value="to_schedule">To Schedule ({statusCounts.to_schedule})</SelectItem>
                <SelectItem value="scheduled">Scheduled ({statusCounts.scheduled})</SelectItem>
                <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
                <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || statusFilter !== 'all' || sortBy !== 'newest') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setSortBy('newest')
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchQuery || statusFilter !== 'all' 
                ? 'No jobs match your filters' 
                : 'No jobs yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Jobs will appear here when quotes are signed'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing {filteredJobs.length} of {allJobs.length} jobs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} quote={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
