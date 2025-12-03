'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AuditLogEntry {
  id: string
  company_id: string
  user_id: string | null
  entity_type: string  // 'lead', 'quote', 'job', etc.
  entity_id: string
  action: string  // 'created', 'updated', 'sent', 'accepted', etc.
  description: string | null
  changes: any  // JSONB with before/after changes
  metadata: any
  created_at: string
  users?: {
    id: string
    role: string
  }
  profiles?: {
    full_name: string | null
    email: string
  }
}

interface AuditTrailProps {
  quoteId: string
  entries: AuditLogEntry[]
}

export function AuditTrail({ quoteId, entries }: AuditTrailProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs whitespace-nowrap">Created</Badge>
      case 'updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap">Updated</Badge>
      case 'sent':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs whitespace-nowrap">Sent</Badge>
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs whitespace-nowrap">Accepted</Badge>
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs whitespace-nowrap">Archived</Badge>
      case 'ai_generated':
        return <Badge variant="default" className="text-xs whitespace-nowrap">AI Generated</Badge>
      case 'ai_updated':
        return <Badge variant="secondary" className="text-xs whitespace-nowrap">AI Updated</Badge>
      default:
        return <Badge variant="outline" className="text-xs whitespace-nowrap capitalize">{action.replace('_', ' ')}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatChanges = (entry: AuditLogEntry): string => {
    if (!entry.changes) return entry.description || ''

    const changes = entry.changes
    const parts: string[] = []

    // Lead created/updated
    if (entry.action === 'created' || entry.action === 'updated') {
      if (changes.customer_name) parts.push(`Customer: ${changes.customer_name}`)
      if (changes.customer_phone) parts.push(`Phone: ${changes.customer_phone}`)
      if (changes.customer_address) parts.push(`Address: ${changes.customer_address}`)
      if (changes.job_type) parts.push(`Job Type: ${changes.job_type}`)
      if (changes.description && changes.description.length > 0) {
        const desc = changes.description.length > 80 
          ? changes.description.substring(0, 80) + '...' 
          : changes.description
        parts.push(`Description: ${desc}`)
      }
    }

    // If no parts from changes, return description
    if (parts.length === 0 && entry.description) {
      return entry.description
    }

    return parts.join(' • ')
  }

  const getUserName = (entry: AuditLogEntry): string => {
    if (entry.profiles) {
      return entry.profiles.full_name || entry.profiles.email || 'User'
    }
    return 'System'
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity yet</p>
            <p className="text-sm mt-1">Changes will appear here as you edit</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audit Trail ({entries.length})</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block space-y-0 border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-bold text-muted-foreground border-b">
              <div className="col-span-2">When</div>
              <div className="col-span-2">Who</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-6">What Changed</div>
            </div>
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`px-4 py-3 grid grid-cols-12 gap-4 text-sm hover:bg-accent/5 transition-colors ${
                  index !== entries.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="col-span-2 text-xs text-muted-foreground">
                  {formatDate(entry.created_at)}
                </div>
                <div className="col-span-2 text-xs font-medium truncate" title={getUserName(entry)}>
                  {getUserName(entry)}
                </div>
                <div className="col-span-2">
                  {getActionBadge(entry.action)}
                </div>
                <div className="col-span-6 text-xs text-muted-foreground">
                  {formatChanges(entry)}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">
                      {formatDate(entry.created_at)}
                    </div>
                    <div className="text-sm font-medium">
                      {getUserName(entry)}
                    </div>
                  </div>
                  <div>
                    {getActionBadge(entry.action)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatChanges(entry)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
