'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, MapPin, FileText, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

interface PayInvoiceCardProps {
  quote: any
  variant: 'invoice' | 'paid'
  onMarkAsPaid?: (quoteId: string) => void
  onRefresh?: () => Promise<void>
  isMarkingPaid?: boolean
}

export function PayInvoiceCard({ 
  quote, 
  variant, 
  onMarkAsPaid,
  onRefresh,
  isMarkingPaid = false 
}: PayInvoiceCardProps) {
  const [sending, setSending] = useState(false)
  const hasSentInvoice = !!quote.invoice_sent_at
  const isPaid = variant === 'paid'

  const handleSendInvoice = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setSending(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send-invoice`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to send invoice')

      const data = await response.json()
      toast.success(`Invoice ${data.invoice_number} sent!`)
      if (onRefresh) await onRefresh()
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error('Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${
      isPaid ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <Link href={`/quotes/new?id=${quote.id}`} className="flex-1">
            <div className="space-y-2">
              {/* Customer Name & Invoice Number */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
                {quote.invoice_number && (
                  <span className={`px-2 py-0.5 text-xs font-mono rounded ${
                    isPaid 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  }`}>
                    {quote.invoice_number}
                  </span>
                )}
                {hasSentInvoice && !isPaid && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                    Sent {format(new Date(quote.invoice_sent_at), 'MMM d')}
                  </span>
                )}
                {isPaid && (
                  <span className="ml-auto bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    PAID
                  </span>
                )}
              </div>

              {/* Address */}
              {quote.customer_address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{quote.customer_address}</span>
                </div>
              )}

              {/* Quote Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-semibold text-lg ${
                    isPaid 
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-[#FF6200]'
                  }`}>
                    ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">{quote.quote_number}</span>
                </div>

                {quote.completed_at && !isPaid && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">
                      Completed {format(new Date(quote.completed_at), 'MMM d')}
                    </span>
                  </div>
                )}

                {quote.paid_at && isPaid && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Paid {format(new Date(quote.paid_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {quote.payment_method && isPaid && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="text-xs">
                      via {quote.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {quote.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quote.description}
                </p>
              )}

              {/* Payment Link */}
              {quote.payment_link_url && !isPaid && (
                <div className="text-xs text-muted-foreground">
                  Payment link: <a href={quote.payment_link_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">View</a>
                </div>
              )}
            </div>
          </Link>

          {/* Action Buttons (only for invoice variant) */}
          {variant === 'invoice' && onMarkAsPaid && (
            <div className="flex flex-col gap-2 shrink-0">
              {!hasSentInvoice ? (
                <Button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Invoice'}
                </Button>
              ) : (
                <Button
                  onClick={handleSendInvoice}
                  disabled={sending}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Resend'}
                </Button>
              )}
              <Button
                onClick={() => onMarkAsPaid(quote.id)}
                disabled={isMarkingPaid}
                className="bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {isMarkingPaid ? 'Processing...' : 'Mark Paid'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
