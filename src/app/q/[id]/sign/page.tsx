// Sign page - Initiates SignNow signing flow
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { acceptQuote } from '../actions'

interface SignPageProps {
  params: Promise<{ id: string }>
}

export default function SignPage({ params }: SignPageProps) {
  const [quoteId, setQuoteId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  /**
   * Start the signing flow for a public token.
   *
   * Declared before the effect that calls it: it was a `const` defined below,
   * so the effect referenced it in its temporal dead zone and only worked
   * because effects run after render.
   */
  const startSigning = useCallback(
    async (token: string) => {
      setIsLoading(true)
      setError(null)

      let signingUrl: string | null = null
      try {
        const response = await fetch('/api/quotes/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await response.json()
        if (response.ok && data.signing_url) signingUrl = data.signing_url as string
      } catch {
        // Falls through to acceptance below — e-signature is a nicety, and a
        // customer who has decided to accept should not be blocked by it.
      }

      if (signingUrl) {
        window.location.href = signingUrl
        return
      }

      // The same server action the Accept button uses. The route this replaced
      // looked the quote up by `id` while being handed a public_token, and wrote
      // a status that is not in the enum — so it matched nothing, and could not
      // have written anything if it had.
      const res = await acceptQuote({ token, signer_name: 'Customer' })
      if (!res.ok) {
        setError(res.error)
        setIsLoading(false)
        return
      }
      router.push(`/q/${token}/accepted`)
    },
    [router],
  )

  useEffect(() => {
    params.then(({ id }) => {
      setQuoteId(id)
      void startSigning(id)
    })
  }, [params, startSigning])

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#2563eb]" />
              <h2 className="text-sm font-bold">Processing Your Acceptance...</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your quote acceptance.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>✓ Verifying quote details</p>
                <p>✓ Recording acceptance</p>
                <p>✓ Preparing confirmation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-sm font-bold">Unable to Start Signing</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="space-y-2 pt-4">
                <Button asChild className="w-full" variant="default">
                  <Link href={`/q/${quoteId}`}>Back to Quote</Link>
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => void startSigning(quoteId)}
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
