// @ts-nocheck - Supabase type generation pending
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDashboard } from '@/lib/dashboard-context'

export function CatalogIndexingPanel() {
  const { company } = useDashboard()
  const [isIndexing, setIsIndexing] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  const fetchStatus = async () => {
    if (!company?.id) return

    setIsLoadingStatus(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/catalog/index-status/${company.id}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch status')
      
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error fetching index status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleIndex = async () => {
    if (!company?.id) {
      toast.error('Company ID not found')
      return
    }

    setIsIndexing(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/catalog/index`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: company.id,
            force_reindex: false
          })
        }
      )

      if (!response.ok) throw new Error('Indexing failed')

      const result = await response.json()
      
      toast.success(
        `✨ Indexed ${result.indexed} of ${result.total} catalog items!`,
        { duration: 5000 }
      )
      
      // Refresh status
      await fetchStatus()
      
    } catch (error: any) {
      console.error('Indexing error:', error)
      toast.error(`Failed to index catalog: ${error.message}`)
    } finally {
      setIsIndexing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle>AI Search Indexing</CardTitle>
            <CardDescription>
              Enable semantic search for your pricing catalog
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        {status && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Catalog Items</span>
              <span className="font-semibold">
                {status.indexed_items} / {status.total_items} indexed
              </span>
            </div>
            
            <Progress value={status.index_percentage} className="h-2" />
            
            <div className="flex items-center gap-2 text-sm">
              {status.is_complete ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 dark:text-green-400">
                    All items indexed - AI search ready!
                  </span>
                </>
              ) : status.pending_items > 0 ? (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-600 dark:text-orange-400">
                    {status.pending_items} items pending indexing
                  </span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 text-gray-600" />
                  <span className="text-muted-foreground">
                    No catalog items found
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
            What is catalog indexing?
          </h4>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            AI indexing enables intelligent search across your pricing catalog. When generating quotes,
            the AI can find relevant items by understanding meaning, not just keywords.
          </p>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1 mt-2">
            <li>• Search "water heater" → finds all plumbing heating items</li>
            <li>• Search "cooling" → finds AC, HVAC, ventilation items</li>
            <li>• Smarter quote generation with better item suggestions</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleIndex}
            disabled={isIndexing}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isIndexing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {status?.is_complete ? 'Re-index Catalog' : 'Index Catalog Now'}
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={fetchStatus}
            disabled={isLoadingStatus}
          >
            {isLoadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Check Status'
            )}
          </Button>
        </div>

        {/* Auto-indexing note */}
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> New pricing items are automatically indexed when you add them.
          Use this button to index existing items or refresh the index.
        </p>
      </CardContent>
    </Card>
  )
}
