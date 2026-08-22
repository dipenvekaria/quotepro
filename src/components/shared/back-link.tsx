'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The way back from a detail screen, sized for a thumb.
 *
 * When this page was reached from inside the app, going back should feel like
 * going back — history.back() returns to the list with its scroll position
 * intact. A fresh tab or a shared deep link has no useful history, so the
 * href is the fallback and the link stays a real link (middle-click, copy,
 * screen readers all behave).
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const router = useRouter()
  return (
    <Link
      href={href}
      onClick={(e) => {
        // Modified clicks keep native link behaviour.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        if (window.history.length > 2) {
          e.preventDefault()
          router.back()
        }
      }}
      className={cn(
        '-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:min-h-0 lg:gap-1 lg:text-xs',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 lg:h-3 lg:w-3" />
      {children}
    </Link>
  )
}
