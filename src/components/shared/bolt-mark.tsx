import { Zap } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The one Ask Bolt mark. Three entry points each drew their own lightning —
 * bare outline in the sidebar, filled avatar in the dialog — and read as
 * different products (owner report).
 */
export function BoltMark({ size = 'sm', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center bg-primary text-primary-foreground',
        size === 'md' ? 'h-8 w-8 rounded-lg' : 'h-5 w-5 rounded-md',
        className,
      )}
    >
      <Zap className={size === 'md' ? 'h-4 w-4' : 'h-3 w-3'} />
    </span>
  )
}
