// Quote Acceptance Success Page
// @ts-nocheck - Supabase type generation pending
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Phone, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AcceptedPageProps {
  params: Promise<{ id: string }>
}

export default function AcceptedPage({ params }: AcceptedPageProps) {
  const [quoteId, setQuoteId] = useState<string>('')
  const [quote, setQuote] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    params.then(({ id }) => {
      setQuoteId(id)
      loadQuoteData(id)
    })
  }, [params])

  const loadQuoteData = async (id: string) => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          companies (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setQuote(data)
      setCompany(data.companies)
    } catch (err) {
      console.error('Failed to load quote:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardContent className="pt-8 pb-8 px-6 sm:px-12">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full p-4">
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Thank You!
              </h1>
              <p className="text-xl text-gray-700 dark:text-gray-300">
                Your quote has been accepted.
              </p>
            </div>

            {/* Quote Details */}
            {quote && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-3">
                <div className="text-sm text-muted-foreground">
                  Quote #{quote.quote_number}
                </div>
                <div className="text-3xl font-bold text-[#FF6200]">
                  ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {quote.customer_name && (
                  <div className="text-sm text-muted-foreground">
                    for {quote.customer_name}
                  </div>
                )}
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                What happens next?
              </h2>
              <ul className="text-left space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">1.</span>
                  <span>We'll call you shortly to schedule the work</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">2.</span>
                  <span>Our team will confirm the date and time that works best for you</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">3.</span>
                  <span>We'll arrive on time and complete the job to your satisfaction</span>
                </li>
              </ul>
            </div>

            {/* Company Contact Info */}
            {company && (
              <div className="border-t pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Questions? Contact us anytime:
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {company.phone && (
                    <a
                      href={`tel:${company.phone}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">{company.phone}</span>
                    </a>
                  )}
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">{company.email}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Back to Quote Button */}
            <div className="pt-4">
              <Link href={`/q/${quoteId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Quote
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
