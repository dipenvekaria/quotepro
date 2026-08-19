'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * Theme, defaulting to light.
 *
 * Owner decision 2026-08-19: light is the product's face — dark "doesn't look
 * natural" as a first impression, so nobody lands in it by accident. Dark and
 * follow-the-device stay one tap away in Settings → Appearance, and an
 * explicit choice (stored by next-themes in localStorage) is always honoured.
 *
 * `attribute="class"` because `globals.css` declares
 * `@custom-variant dark (&:is(.dark *))` — Tailwind is looking for a class, not
 * a media query, which is also what makes an explicit override possible at all.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      // Transitions on a theme swap animate every colour on the page at once,
      // which reads as a glitch rather than a change.
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}
