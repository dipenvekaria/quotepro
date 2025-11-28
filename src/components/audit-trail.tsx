'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AuditLogEntry {
  id: string
  quote_id: string
  action_type: string
  user_prompt: string | null
  description: string
  changes_made: any
  created_at: string
  created_by: string
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

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'ai_generation':
        return <Badge variant="default" className="text-xs whitespace-nowrap">AI Generated</Badge>
      case 'ai_update':
        return <Badge variant="secondary" className="text-xs whitespace-nowrap">AI Updated</Badge>
      case 'lead_created':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs whitespace-nowrap">Lead Created</Badge>
      case 'lead_updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap">Lead Updated</Badge>
      case 'notes_updated':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs whitespace-nowrap">Notes</Badge>
      case 'manual_edit':
        return <Badge variant="outline" className="text-xs whitespace-nowrap">Manual Edit</Badge>
      case 'item_added':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs whitespace-nowrap">Added Item</Badge>
      case 'item_deleted':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs whitespace-nowrap">Deleted Item</Badge>
      case 'item_modified':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap">Modified Item</Badge>
      case 'visit_scheduled':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs whitespace-nowrap">Visit Scheduled</Badge>
      default:
        return <Badge variant="outline" className="text-xs whitespace-nowrap">{actionType}</Badge>
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
    if (!entry.changes_made) return ''

    const changes = entry.changes_made
    const parts: string[] = []

    if (entry.action_type === 'lead_created' || entry.action_type === 'lead_updated') {
      if (changes.customer_name) parts.push(`Customer: ${changes.customer_name}`)
      if (changes.customer_phone) parts.push(`Phone: ${changes.customer_phone}`)
      if (changes.customer_address) parts.push(`Address: ${changes.customer_address}`)
      if (changes.description) {
        const desc = changes.description.length > 100 
          ? changes.description.substring(0, 100) + '...' 
          : changes.description
        parts.push(`Description: ${desc}`)
      }
    }

    if (entry.action_type === 'notes_updated') {
      if (changes.new_notes && changes.new_notes !== '(empty)') {
        const notes = changes.new_notes.length > 80 
          ? changes.new_notes.substring(0, 80) + '...' 
          : changes.new_notes
        parts.push(`Notes: ${notes}`)
      } else {
        parts.push('Notes cleared')
      }
    }

    if (entry.action_type === 'ai_update') {
      if (changes.user_prompt) parts.push(`Instruction: "${changes.user_prompt}"`)
      if (changes.items_changed !== undefined) parts.push(`${changes.items_changed} items`)
      if (changes.old_total !== undefined && changes.new_total !== undefined) {
        parts.push(`$${Number(changes.old_total).toFixed(2)} → $${Number(changes.new_total).toFixed(2)}`)
      }
    }

    if (changes.old && changes.new) {
      parts.push(`Item: ${changes.new.name || 'Unnamed'}`)
      if (changes.old.unit_price !== changes.new.unit_price) {
        parts.push(`$${changes.old.unit_price} → $${changes.new.unit_price}`)
      }
    }

    if (entry.action_type === 'visit_scheduled') {
      if (changes.scheduled_date) {
        const visitDate = new Date(changes.scheduled_date)
        parts.push(`Date: ${visitDate.toLocaleDateString()}`)
      }
      if (changes.scheduled_time) parts.push(`Time: ${changes.scheduled_time}`)
    }

    return parts.join(' • ')
  }

  const getUserName = (entry: AuditLogEntry): string => {
    if (entry.profiles) {
      return entry.profiles.full_name || entry.profiles.email || 'User'
    }
    return 'User'
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
          <div className="space-y-0 border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground border-b">
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
                  {getActionBadge(entry.action_type)}
                </div>
                <div className="col-span-6 text-xs text-muted-foreground">
                  {formatChanges(entry) || entry.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
