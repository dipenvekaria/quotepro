// Redirect to new leads page
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LeadsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/leads-and-quotes/leads')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
