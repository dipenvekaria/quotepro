// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PayInvoiceCard } from '@/components/features/pay/PayInvoiceCard'
import { usePayInvoices } from '@/hooks/usePayInvoices'
import { DollarSign, FileText } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('invoice')
  
  const { 
    invoiceQuotes, 
    paidQuotes, 
    handleMarkAsPaid,
    payingQuoteId,
    refreshQuotes
  } = usePayInvoices()

  // Update tab based on URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'paid') {
      setActiveTab('paid')
    } else {
      setActiveTab('invoice')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen pb-20 md:pb-0 overflow-x-hidden">
      {/* Header */}
      <header className="bg-gray-50 border-b border-gray-200/50 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay</h1>
          <p className="text-base text-gray-600 mt-1">Review invoices and payments</p>
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
              <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {invoiceQuotes.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Paid
              <span className="ml-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
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
                  <h3 className="font-bold text-sm mb-2">No Pending Invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed jobs will appear here when ready for invoicing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💰 <strong>{invoiceQuotes.length} invoice{invoiceQuotes.length !== 1 ? 's' : ''}</strong> pending payment.
                    Total outstanding: <strong className="text-[#2563eb]">
                      ${invoiceQuotes.reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
                {invoiceQuotes.map(quote => (
                  <PayInvoiceCard
                    key={quote.id}
                    quote={quote}
                    variant="invoice"
                    onMarkAsPaid={handleMarkAsPaid}
                    onRefresh={refreshQuotes}
                    isMarkingPaid={payingQuoteId === quote.id}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* Paid Tab */}
          <TabsContent value="paid" className="space-y-4">
            {paidQuotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm mb-2">No Paid Invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    Paid invoices will appear here for your records.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ <strong>{paidQuotes.length} invoice{paidQuotes.length !== 1 ? 's' : ''}</strong> paid.
                    Total received: <strong className="text-green-700">
                      ${paidQuotes.reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
                {paidQuotes.map(quote => (
                  <PayInvoiceCard
                    key={quote.id}
                    quote={quote}
                    variant="paid"
                  />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
