'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ActionButtonsProps {
  quoteId?: string | null
  savedQuoteId?: string | null
  hasQuote: boolean
  customerEmail?: string
  customerPhone?: string
  isGenerating?: boolean
  isSending?: boolean
  onSaveQuote: () => Promise<void>
  onUpdateQuote: () => Promise<void>
  onSendQuote: () => Promise<void>
  onRegenerateQuote: () => void
  onArchive?: () => void
}

export function ActionButtons({
  quoteId,
  savedQuoteId,
  hasQuote,
  customerEmail,
  customerPhone,
  isGenerating = false,
  isSending = false,
  onSaveQuote,
  onUpdateQuote,
  onSendQuote,
  onRegenerateQuote,
  onArchive,
}: ActionButtonsProps) {
  const router = useRouter()
  const isQuoteSaved = !!(savedQuoteId || quoteId)
  const canSend = !!(customerEmail || customerPhone)

  if (!hasQuote) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Not saved yet - show save/regenerate */}
      {!isQuoteSaved && (
        <>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onRegenerateQuote}
              className="flex-1 h-12"
            >
              Regenerate
            </Button>
            <Button
              onClick={onSaveQuote}
              disabled={isGenerating}
              className="flex-1 h-12 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white"
            >
              {isGenerating ? 'Saving...' : 'Save Quote'}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            💡 Save the quote first, then you can send it to the customer
          </p>
        </>
      )}
      
      {/* After saving - show update/send/back buttons */}
      {isQuoteSaved && (
        <>
          <div className="flex gap-3">
            <Button
              onClick={onUpdateQuote}
              disabled={isGenerating}
              className="flex-1 h-12 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white"
            >
              {isGenerating ? 'Updating...' : 'Update Quote'}
            </Button>
            
            <Button
              onClick={onSendQuote}
              disabled={isSending || !canSend}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send to Customer'
              )}
            </Button>
          </div>
          
          {!canSend && (
            <p className="text-sm text-amber-600 text-center">
              ⚠️ Add customer email or phone above to send quote
            </p>
          )}
          
          <div className="flex gap-3">
            {onArchive && (
              <Button
                variant="outline"
                onClick={onArchive}
                className="flex-1 h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Lead
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1 h-12"
            >
              Back to Dashboard
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
