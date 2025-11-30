// @ts-nocheck - Supabase type generation pending
'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  DollarSign,
  CheckCircle,
  FileText,
  Package
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CompleteJobModal } from '@/components/complete-job-modal'
import Link from 'next/link'

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  useEffect(() => {
    loadQuote()
  }, [id])

  const loadQuote = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setQuote(data)
    } catch (error) {
      console.error('Error loading quote:', error)
      toast.error('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested job could not be found.</p>
          <Button onClick={() => router.push('/work')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work
          </Button>
        </div>
      </div>
    )
  }

  const scheduledDate = quote.scheduled_at ? new Date(quote.scheduled_at) : null

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/work?tab=scheduled')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Job Details</h1>
              <p className="text-sm text-muted-foreground">{quote.quote_number}</p>
            </div>
            {!quote.completed_at && scheduledDate && (
              <Button 
                onClick={() => setShowCompleteModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Job
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Schedule Info Card */}
        {scheduledDate && (
          <div className="bg-blue-50 dark:bg-slate-900 rounded-xl">
            <Card className="!bg-transparent !border-0 !shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Scheduled Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                    <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                      {format(scheduledDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Time</p>
                    <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                      {format(scheduledDate, 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
              {quote.job_name && (
                <div className="pt-3 border-t border-blue-200 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Job Description</p>
                  <p className="font-medium text-blue-900 dark:text-blue-100">{quote.job_name}</p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
            </div>
            {quote.customer_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{quote.customer_address}</p>
                </div>
              </div>
            )}
            {quote.customer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${quote.customer_phone}`} className="font-medium hover:underline">
                    {quote.customer_phone}
                  </a>
                </div>
              </div>
            )}
            {quote.customer_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${quote.customer_email}`} className="font-medium hover:underline">
                    {quote.customer_email}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products & Services Card */}
        {quote.items && quote.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products & Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quote.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start py-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.description || item.name}</p>
                      {item.quantity && (
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      )}
                    </div>
                    <p className="font-semibold">
                      ${(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Quote Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quote.subtotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {quote.discount_percentage > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Discount ({quote.discount_percentage}%)
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    -${quote.discount_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {quote.tax > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Tax ({quote.tax_rate}%)
                  </span>
                  <span className="font-medium">
                    ${quote.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">
                  ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/quotes/new?id=${quote.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View Full Quote
            </Button>
          </Link>
        </div>
      </main>

      {/* Complete Job Modal with Signature */}
      {showCompleteModal && (
        <CompleteJobModal
          quote={quote}
          onClose={() => setShowCompleteModal(false)}
          onComplete={() => {
            setShowCompleteModal(false)
            router.push('/pay')
          }}
        />
      )}
    </div>
  )
}
