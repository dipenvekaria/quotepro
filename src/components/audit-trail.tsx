'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Bot, Edit, Plus, Trash2 } from 'lucide-react'

interface AuditLogEntry {
  id: string
  quote_id: string
  action_type: string
  user_prompt: string | null
  description: string
  changes_made: any
  created_at: string
  created_by: string
}

interface AuditTrailProps {
  quoteId: string
  entries: AuditLogEntry[]
}

export function AuditTrail({ quoteId, entries }: AuditTrailProps) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'ai_generation':
      case 'ai_update':
        return <Bot className="h-4 w-4" />
      case 'manual_edit':
      case 'item_modified':
        return <Edit className="h-4 w-4" />
      case 'item_added':
        return <Plus className="h-4 w-4" />
      case 'item_deleted':
        return <Trash2 className="h-4 w-4" />
      default:
        return <Edit className="h-4 w-4" />
    }
  }

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'ai_generation':
        return <Badge variant="default">AI Generated</Badge>
      case 'ai_update':
        return <Badge variant="secondary">AI Updated</Badge>
      case 'lead_created':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Lead Created</Badge>
      case 'lead_updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Lead Updated</Badge>
      case 'notes_updated':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Notes Updated</Badge>
      case 'manual_edit':
        return <Badge variant="outline">Manual Edit</Badge>
      case 'item_added':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Added Item</Badge>
      case 'item_deleted':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Deleted Item</Badge>
      case 'item_modified':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Modified Item</Badge>
      default:
        return <Badge variant="outline">{actionType}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity yet</p>
            <p className="text-sm mt-1">Changes will appear here as you edit this quote</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getActionIcon(entry.action_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionBadge(entry.action_type)}
                      <span className="text-sm text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{entry.description}</p>
                    {entry.user_prompt && (
                      <p className="text-sm text-muted-foreground italic">
                        "{entry.user_prompt}"
                      </p>
                    )}
                  </div>
                </div>
                
                {entry.changes_made && Object.keys(entry.changes_made).length > 0 && (
                  <button
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedEntry === entry.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {expandedEntry === entry.id && entry.changes_made && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {/* Debug: Log the changes_made structure */}
                  {console.log('Audit Entry:', entry.id, 'Type:', entry.action_type, 'Changes:', entry.changes_made)}
                  
                  {/* Notes Updated - Show old and new notes */}
                  {entry.action_type === 'notes_updated' && (
                    <div className="space-y-3">
                      {entry.changes_made.old_notes && (
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground mb-1">Previous Notes:</p>
                          <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                            {entry.changes_made.old_notes === '(empty)' ? (
                              <span className="italic text-muted-foreground">No previous notes</span>
                            ) : (
                              entry.changes_made.old_notes
                            )}
                          </div>
                        </div>
                      )}
                      {entry.changes_made.new_notes && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">Updated Notes:</p>
                          <div className="text-sm bg-accent/10 p-3 rounded-md whitespace-pre-wrap border border-accent">
                            {entry.changes_made.new_notes === '(empty)' ? (
                              <span className="italic text-muted-foreground">Notes cleared</span>
                            ) : (
                              entry.changes_made.new_notes
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lead Created/Updated - Show customer details */}
                  {(entry.action_type === 'lead_created' || entry.action_type === 'lead_updated') && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {entry.changes_made.customer_name && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Customer:</span>
                            <span className="text-sm">{entry.changes_made.customer_name}</span>
                          </div>
                        )}
                        {entry.changes_made.customer_phone && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Phone:</span>
                            <span className="text-sm font-mono">{entry.changes_made.customer_phone}</span>
                          </div>
                        )}
                        {entry.changes_made.customer_address && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Address:</span>
                            <span className="text-sm">{entry.changes_made.customer_address}</span>
                          </div>
                        )}
                        {entry.changes_made.description && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Description:</span>
                            <span className="text-sm whitespace-pre-wrap flex-1">{entry.changes_made.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Update Details */}
                  {entry.action_type === 'ai_update' && (
                    <div className="space-y-3">
                      {entry.changes_made.user_prompt && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">AI Instruction:</p>
                          <div className="text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                            "{entry.changes_made.user_prompt}"
                          </div>
                        </div>
                      )}
                      {entry.changes_made.ai_instructions && entry.changes_made.ai_instructions !== '(none)' && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">AI Generated Instructions:</p>
                          <div className="text-sm bg-accent/10 p-3 rounded-md whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {entry.changes_made.ai_instructions}
                          </div>
                        </div>
                      )}
                      {entry.changes_made.items_changed !== undefined && (
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Items Changed:</span>
                            <span className="ml-2 font-semibold">{entry.changes_made.items_changed}</span>
                          </div>
                          {entry.changes_made.old_total !== undefined && entry.changes_made.new_total !== undefined && (
                            <div>
                              <span className="text-muted-foreground">Price:</span>
                              <span className="ml-2">
                                <span className="text-muted-foreground">${Number(entry.changes_made.old_total).toFixed(2)}</span>
                                <span className="mx-1">→</span>
                                <span className="font-semibold">${Number(entry.changes_made.new_total).toFixed(2)}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {entry.changes_made.added_items && entry.changes_made.added_items.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-green-700 mb-2">Added Items:</p>
                      <ul className="space-y-1">
                        {entry.changes_made.added_items.map((item: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground ml-4">
                            • {item.name} - ${item.unit_price} x {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.changes_made.removed_items && entry.changes_made.removed_items.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-2">Removed Items:</p>
                      <ul className="space-y-1">
                        {entry.changes_made.removed_items.map((item: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground ml-4">
                            • {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.changes_made.modified_items && entry.changes_made.modified_items.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-blue-700 mb-2">Modified Items:</p>
                      <ul className="space-y-1">
                        {entry.changes_made.modified_items.map((item: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground ml-4">
                            • {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fallback: Show raw JSON for debugging if no specific renderer matched */}
                  {!entry.changes_made.old_notes && 
                   !entry.changes_made.new_notes && 
                   !entry.changes_made.user_prompt &&
                   !entry.changes_made.added_items && 
                   !entry.changes_made.removed_items && 
                   !entry.changes_made.modified_items &&
                   entry.action_type !== 'lead_created' &&
                   entry.action_type !== 'lead_updated' && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Details:</p>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                        {JSON.stringify(entry.changes_made, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
