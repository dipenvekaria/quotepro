'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Light, dark, or whatever the device says.
 *
 * Three options rather than a two-state switch. A switch forces a choice and
 * then keeps it forever, so a contractor whose phone turns dark at sunset gets
 * a white screen in a customer's unlit basement because of something they
 * clicked in March. The app defaults to light (owner decision 2026-08-19);
 * "System" and "Dark" stay one tap away for those who want them.
 *
 * No option is marked selected until the client has hydrated. `next-themes`
 * cannot know the resolved theme during SSR — the answer lives in localStorage
 * and a media query — so choosing one on the server lights the wrong button and
 * then visibly corrects itself.
 *
 * `useSyncExternalStore` is how that is expressed: it returns the server
 * snapshot during SSR and the client snapshot after, which is precisely the
 * "am I hydrated yet" question, without an effect and without a second render
 * scheduled to answer something React already knows.
 *
 * Reading `theme === undefined` instead looks cleaner and is wrong: the hook
 * answers with the default theme on the server too, so the branch
 * flips during hydration and produces the mismatch this exists to avoid. That
 * was the first attempt and the browser caught it.
 */

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const hydrated = useSyncExternalStore(
    // Never changes after mount, so nothing to subscribe to.
    () => () => {},
    () => true, // client
    () => false, // server
  )

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Colour theme"
        className="grid grid-cols-3 gap-2 sm:max-w-md"
      >
        {OPTIONS.map((opt) => {
          const active = hydrated && theme === opt.value
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {hydrated && theme === 'system'
          ? `Following your device — currently ${resolvedTheme === 'dark' ? 'dark' : 'light'}.`
          : 'Set to follow your device, or pick one and it stays.'}
      </p>
    </div>
  )
}
