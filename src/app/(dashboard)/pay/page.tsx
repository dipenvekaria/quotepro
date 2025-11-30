// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { DollarSign, MapPin, User, Calendar, CheckCircle, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

export default function PayPage() {
  const { quotes, refreshQuotes } = useDashboard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('invoice')
  const [payingQuoteId, setPayingQuoteId] = useState<string | null>(null)

  // Update tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'paid') {
      setActiveTab('paid')
    } else {
      setActiveTab('invoice')
    }
  }, [searchParams])

  // Filter quotes for each tab
  const invoiceQuotes = quotes.filter(q => 
    q.completed_at && !q.paid_at
  )
  
  const paidQuotes = quotes.filter(q => 
    q.paid_at
  )

  const handleMarkAsPaid = async (quoteId: string) => {
    if (!confirm('Mark this invoice as paid?')) return

    setPayingQuoteId(quoteId)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_at: new Date().toISOString() }),
      })

      if (!response.ok) throw new Error('Failed to mark as paid')

      toast.success('Invoice marked as paid')
      await refreshQuotes()
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error('Failed to mark as paid. Please try again.')
    } finally {
      setPayingQuoteId(null)
    }
  }

  const renderInvoiceCard = (quote: any) => {
    const hasSentInvoice = !!quote.invoice_sent_at
    const [sending, setSending] = useState(false)

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
        await refreshQuotes()
      } catch (error) {
        console.error('Error sending invoice:', error)
        toast.error('Failed to send invoice')
      } finally {
        setSending(false)
      }
    }

    return (
      <Card key={quote.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <Link href={`/quotes/new?id=${quote.id}`} className="flex-1">
              <div className="space-y-2">
                {/* Customer Name & Invoice Number */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
                  {quote.invoice_number && (
                    <span className="px-2 py-0.5 text-xs font-mono bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                      {quote.invoice_number}
                    </span>
                  )}
                  {hasSentInvoice && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                      Sent {format(new Date(quote.invoice_sent_at), 'MMM d')}
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
                    <span className="font-semibold text-[#FF6200] text-lg">
                      ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">{quote.quote_number}</span>
                  </div>

                  {quote.completed_at && (
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">
                        Completed {format(new Date(quote.completed_at), 'MMM d')}
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
                {quote.payment_link_url && (
                  <div className="text-xs text-muted-foreground">
                    Payment link: <a href={quote.payment_link_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">View</a>
                  </div>
                )}
              </div>
            </Link>

            {/* Action Buttons */}
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
                onClick={() => handleMarkAsPaid(quote.id)}
                disabled={payingQuoteId === quote.id}
                className="bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {payingQuoteId === quote.id ? 'Processing...' : 'Mark Paid'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPaidCard = (quote: any) => (
    <Card key={quote.id} className="hover:shadow-md transition-shadow bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
      <CardContent className="p-4">
        <Link href={`/quotes/new?id=${quote.id}`}>
          <div className="space-y-2">
            {/* Customer Name & Invoice Number */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
              {quote.invoice_number && (
                <span className="px-2 py-0.5 text-xs font-mono bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded">
                  {quote.invoice_number}
                </span>
              )}
              <span className="ml-auto bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                PAID
              </span>
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
                <span className="font-semibold text-green-700 dark:text-green-400 text-lg">
                  ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-xs">{quote.quote_number}</span>
              </div>

              {quote.paid_at && (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    Paid {format(new Date(quote.paid_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              {quote.payment_method && (
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
          </div>
        </Link>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
        <div className="px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pay</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review invoices and payments</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          router.push(`/pay${value === 'paid' ? '?tab=paid' : ''}`)
        }} className="w-full">
          <TabsList className="md:hidden grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="invoice" className="gap-2">
              <FileText className="h-4 w-4" />
              Invoice
              <span className="ml-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                {invoiceQuotes.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Paid
              <span className="ml-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                {paidQuotes.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="space-y-4">
            {invoiceQuotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">No Pending Invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed jobs will appear here when ready for invoicing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    💰 <strong>{invoiceQuotes.length} invoice{invoiceQuotes.length !== 1 ? 's' : ''}</strong> pending payment.
                    Total outstanding: <strong className="text-[#FF6200]">
                      ${invoiceQuotes.reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
                {invoiceQuotes.map(renderInvoiceCard)}
              </>
            )}
          </TabsContent>

          {/* Paid Tab */}
          <TabsContent value="paid" className="space-y-4">
            {paidQuotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">No Paid Invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    Paid invoices will appear here for your records.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✅ <strong>{paidQuotes.length} invoice{paidQuotes.length !== 1 ? 's' : ''}</strong> paid.
                    Total received: <strong className="text-green-700 dark:text-green-400">
                      ${paidQuotes.reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
                {paidQuotes.map(renderPaidCard)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
