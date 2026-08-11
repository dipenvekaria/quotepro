'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { toast } from 'sonner'

export function NetworkStatus() {
  // Lazy initial state rather than setting it in an effect: navigator is
  // unavailable during SSR, so default to online and correct on first client
  // render.
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  )
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {

    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(false)
      toast.success('You\'re back online', {
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
      toast.error('You\'re offline. Some features may not work.', {
        icon: <WifiOff className="h-4 w-4" />,
        duration: 10000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span>You’re offline. Some features may not work until you reconnect.</span>
    </div>
  )
}

// Hook for checking network status in components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  )

  useEffect(() => {

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
