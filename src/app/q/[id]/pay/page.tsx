'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Download, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function PayInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    loadQuote()
  }, [id])

  async function loadQuote() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error loading quote:', error)
      toast.error('Failed to load invoice')
      setLoading(false)
      return
    }

    setQuote(data)
    setLoading(false)
  }

  async function handlePayNow() {
    setPaying(true)
    
    try {
      // Simulate payment processing (will be Stripe later)
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await fetch(`/api/quotes/${id}/mark-paid`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paid_at: new Date().toISOString(),
          payment_method: 'demo_payment',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as paid')
      }

      toast.success('Payment successful!')
      
      // Reload quote to show paid status
      await loadQuote()
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-sm font-bold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              The invoice you're looking for doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = !!quote.paid_at
  const dueDate = quote.completed_at 
    ? new Date(new Date(quote.completed_at).getTime() + 14 * 24 * 60 * 60 * 1000)
    : null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-sm font-bold mb-2">
            {isPaid ? 'Payment Received' : 'Pay Invoice'}
          </h1>
          <p className="text-muted-foreground">
            Invoice {quote.invoice_number || quote.quote_number}
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              {isPaid && (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  PAID
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Customer Info */}
            <div>
              <h3 className="font-bold mb-2">Bill To:</h3>
              <p className="text-sm">{quote.customer_name}</p>
              {quote.customer_address && (
                <p className="text-sm text-muted-foreground">{quote.customer_address}</p>
              )}
              {quote.customer_email && (
                <p className="text-sm text-muted-foreground">{quote.customer_email}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {quote.completed_at && (
                <div>
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-bold">
                    {format(new Date(quote.completed_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {dueDate && !isPaid && (
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-bold">
                    {format(dueDate, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {isPaid && quote.paid_at && (
                <div>
                  <p className="text-muted-foreground">Paid Date</p>
                  <p className="font-bold text-green-600">
                    {format(new Date(quote.paid_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-bold">
                  ${(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">
                  Tax ({quote.tax_rate || 0}%)
                </span>
                <span className="font-bold">
                  ${(quote.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
                <span className="text-sm font-bold">
                  {isPaid ? 'Total Paid' : 'Amount Due'}
                </span>
                <span className="text-sm font-bold text-blue-600">
                  ${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {!isPaid && (
                <Button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white h-12 text-sm"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay Now - ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </>
                  )}
                </Button>
              )}
              
              {quote.invoice_pdf_url && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(quote.invoice_pdf_url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice PDF
                </Button>
              )}
            </div>

            {/* Payment Info */}
            {!isPaid && (
              <div className="text-sm text-muted-foreground bg-gray-50 p-4 rounded-lg">
                <p className="font-bold mb-2">Accepted Payment Methods:</p>
                <p>• Credit & Debit Cards</p>
                <p>• Apple Pay & Google Pay</p>
                <p className="mt-2 text-xs">
                  Note: This is a demo payment. In production, this will integrate with Stripe for secure payments.
                </p>
              </div>
            )}

            {isPaid && (
              <div className="text-sm bg-green-50 text-green-700 p-4 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-bold">Thank you for your payment!</p>
                <p className="text-xs mt-1">
                  A receipt has been sent to {quote.customer_email}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Questions about this invoice? Contact us at{' '}
          {process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'support@company.com'}
        </p>
      </div>
    </div>
  )
}
