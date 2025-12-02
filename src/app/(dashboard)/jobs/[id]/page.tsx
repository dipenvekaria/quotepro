// @ts-nocheck - Supabase type generation pending
'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { CompleteJobModal } from '@/components/complete-job-modal'
import Link from 'next/link'
import { useJobDetail } from '@/hooks/useJobDetail'

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { quote, loading, scheduledDate } = useJobDetail(id)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

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
          <h2 className="text-sm font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested job could not be found.</p>
          <Button onClick={() => router.push('/work')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
              <h1 className="text-sm font-bold">Job Details</h1>
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
          <div className="bg-blue-50 rounded-xl">
            <Card className="!bg-transparent !border-0 !shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                <Calendar className="h-5 w-5 text-blue-600" />
                Scheduled Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-bold text-sm text-gray-900">
                      {format(scheduledDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-bold text-sm text-gray-900">
                      {format(scheduledDate, 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
              {quote.job_name && (
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Job Description</p>
                  <p className="font-bold text-blue-900">{quote.job_name}</p>
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
              <h3 className="font-bold text-sm">{quote.customer_name}</h3>
            </div>
            {quote.customer_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-bold">{quote.customer_address}</p>
                </div>
              </div>
            )}
            {quote.customer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${quote.customer_phone}`} className="font-bold hover:underline">
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
                  <a href={`mailto:${quote.customer_email}`} className="font-bold hover:underline">
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
                      <p className="font-bold">{item.description || item.name}</p>
                      {item.quantity && (
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      )}
                    </div>
                    <p className="font-bold">
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
                  <span className="font-bold">
                    ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {quote.discount_percentage > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Discount ({quote.discount_percentage}%)
                  </span>
                  <span className="font-bold text-green-600">
                    -${quote.discount_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {quote.tax > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Tax ({quote.tax_rate}%)
                  </span>
                  <span className="font-bold">
                    ${quote.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Total</span>
                <span className="text-sm font-bold text-primary">
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
