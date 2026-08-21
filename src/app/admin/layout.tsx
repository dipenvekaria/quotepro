import type { ReactNode } from 'react'

export const metadata = {
  title: 'Field Genie · Operations',
  robots: { index: false, follow: false },
}

/**
 * The operations portal wears its own name — Field Genie — and none of the
 * product's chrome. It serves from thefieldgenie.com; the product domain
 * 404s this entire subtree in middleware.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-primary px-4 py-2.5 text-primary-foreground sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <span className="text-sm font-bold tracking-widest">FIELD GENIE</span>
          <span className="text-xs opacity-70">· Rivet operations</span>
        </div>
      </header>
      {children}
    </div>
  )
}
