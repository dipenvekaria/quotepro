import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Shared page scaffolding — one consistent way to lay out every screen.
 * Replaces the hand-rolled `mx-auto max-w-… / rounded-xl border bg-card` blocks
 * that drifted across screens, so spacing, width, and elevation stay uniform.
 */

// Centered, breathing-room page shell. One max width for the whole app.
export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9', className)}>
      {children}
    </div>
  )
}

// Page title block: optional breadcrumb, title, description, and right-aligned actions.
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

// A bordered surface. The single card/panel primitive used across the app.
export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  // `flush` removes body padding (for tables / full-bleed lists).
  flush?: boolean
}) {
  const hasHeader = Boolean(title || description || actions)
  return (
    <section className={cn('rounded-xl border border-border/70 bg-card shadow-sm', className)}>
      {hasHeader && (
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold leading-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
