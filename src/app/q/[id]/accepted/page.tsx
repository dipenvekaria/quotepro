// Quote Acceptance Success Page
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

type AcceptedQuote = {
  quote_number: string | null
  customer_name: string | null
  total: number | null
}

type AcceptedCompany = {
  phone: string | null
  email: string | null
}

export default function AcceptedPage({ params }: AcceptedPageProps) {
  const [quoteId, setQuoteId] = useState<string>('')
  const [quote, setQuote] = useState<AcceptedQuote | null>(null)
  const [company, setCompany] = useState<AcceptedCompany | null>(null)
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
        .from('work_items')
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
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-foreground border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardContent className="pt-8 pb-8 px-6 sm:px-12">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="bg-muted rounded-full p-4">
                <CheckCircle className="h-16 w-16 text-foreground" />
              </div>
            </div>

            {/* Success Message */}
            <div>
              <h1 className="text-sm font-bold text-foreground mb-2">
                Thank You!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your quote has been accepted.
              </p>
            </div>

            {/* Quote Details */}
            {quote && (
              <div className="bg-muted rounded-lg p-6 space-y-3">
                <div className="text-sm text-muted-foreground">
                  Quote #{quote.quote_number}
                </div>
                <div className="text-sm font-bold text-foreground">
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
            <div className="bg-muted border border-border rounded-lg p-6 space-y-4">
              <h2 className="font-bold text-sm text-foreground">
                What happens next?
              </h2>
              <ul className="text-left space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-foreground font-bold mt-0.5">1.</span>
                  <span>We’ll call you shortly to schedule the work</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-foreground font-bold mt-0.5">2.</span>
                  <span>Our team will confirm the date and time that works best for you</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-foreground font-bold mt-0.5">3.</span>
                  <span>We’ll arrive on time and complete the job to your satisfaction</span>
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
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="font-bold">{company.phone}</span>
                    </a>
                  )}
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="font-bold">{company.email}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Back to Quote Button */}
            <div className="pt-4">
              <Button asChild variant="outline" className="gap-2">
                  <Link href={`/q/${quoteId}`}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Quote
                  </Link>
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
