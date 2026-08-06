import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Logo system. Marks are drawn on a 24×24 grid with `currentColor` so they work
 * white-on-brand, monochrome, or inverted, and stay crisp from favicon to hero.
 */

type MarkProps = React.SVGProps<SVGSVGElement>

// "Rise" — a check that lifts into an up-right arrow. Reads: job won, revenue up.
export function RiseMark({ className, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <path d="M3.5 12.6l4.3 4.3L19 5.7" />
      <path d="M12.8 5.7H19V12" />
    </svg>
  )
}

// "Rivet" — a fastener head. Reads: sturdy, holds the whole job together.
export function RivetMark({ className, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

// "Bolt" — a lightning-free momentum wedge (two forward chevrons). Reads: fast.
export function ForwardMark({ className, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <path d="M5 5l7 7-7 7" />
      <path d="M13 5l6 7-6 7" />
    </svg>
  )
}

// Monogram — a clean letterform for a wordmark-led lockup. Adapts to any name.
export function MonogramMark({
  letter = 'Q',
  className,
}: {
  letter?: string
  className?: string
}) {
  return (
    <span className={cn('font-semibold leading-none tracking-tight', className)} aria-hidden>
      {letter}
    </span>
  )
}

// Brand tile — the mark on a rounded brand-colored square (the app lockup).
export function LogoTile({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-grid place-items-center rounded-[28%] bg-primary text-primary-foreground shadow-sm',
        className,
      )}
    >
      {children}
    </span>
  )
}

// Wordmark — the name set in the brand voice.
export function Wordmark({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight text-foreground', className)}>{name}</span>
  )
}

// Full horizontal lockup: tile + wordmark.
export function Logo({
  name,
  mark,
  className,
}: {
  name: string
  mark: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoTile className="h-9 w-9">{mark}</LogoTile>
      <Wordmark name={name} className="text-lg" />
    </span>
  )
}
