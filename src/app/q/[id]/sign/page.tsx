// Sign page - Initiates SignNow signing flow
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SignPageProps {
  params: Promise<{ id: string }>
}

export default function SignPage({ params }: SignPageProps) {
  const [quoteId, setQuoteId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Unwrap params promise
    params.then(({ id }) => {
      setQuoteId(id)
      initiateSigningFlow(id)
    })
  }, [params])

  const initiateSigningFlow = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Call the sign API to upload to SignNow and create invite
      const response = await fetch('/api/quotes/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate signing')
      }

      // Redirect to SignNow signing URL
      if (data.signing_url) {
        window.location.href = data.signing_url
      } else {
        throw new Error('No signing URL received')
      }
    } catch (err: any) {
      console.error('Signing error:', err)
      setError(err.message || 'Failed to start signing process')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#FF6200]" />
              <h2 className="text-xl font-semibold">Preparing Your Signature...</h2>
              <p className="text-sm text-muted-foreground">
                We're setting up the electronic signing process. You'll be redirected to SignNow in
                just a moment.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>✓ Uploading quote document</p>
                <p>✓ Creating signature fields</p>
                <p>✓ Generating secure signing link</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <h2 className="text-xl font-semibold">Unable to Start Signing</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="space-y-2 pt-4">
                <Link href={`/q/${quoteId}`}>
                  <Button className="w-full" variant="default">
                    Back to Quote
                  </Button>
                </Link>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => initiateSigningFlow(quoteId)}
                >
                  Try Again
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-4">
                If this problem persists, please contact the company directly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
