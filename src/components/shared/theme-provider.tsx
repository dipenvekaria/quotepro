'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * Theme, defaulting to whatever the device is set to.
 *
 * `next-themes` was already a dependency and `<html>` already carried
 * `suppressHydrationWarning` for it — but nothing ever mounted a provider, so
 * the dark tokens in `globals.css` were unreachable and `useTheme()` in the
 * toaster returned nothing. Dark mode existed everywhere except in the running
 * app.
 *
 * `system` is the default deliberately. A contractor who has set their phone to
 * dark has already told us what they want, and asking again is a worse answer
 * than reading it. It also matters more here than in most products: this is used
 * in a truck at 6am and in someone's unlit basement, and a screen that ignores
 * the device setting is a screen that blinds you in both.
 *
 * `attribute="class"` because `globals.css` declares
 * `@custom-variant dark (&:is(.dark *))` — Tailwind is looking for a class, not
 * a media query, which is also what makes an explicit override possible at all.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Transitions on a theme swap animate every colour on the page at once,
      // which reads as a glitch rather than a change.
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}
