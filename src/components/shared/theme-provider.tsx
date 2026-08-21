'use client'

import { useEffect } from 'react'
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'

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
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <NextThemeProvider
      nonce={nonce}
      attribute="class"
      defaultTheme="light"
      enableSystem
      // Transitions on a theme swap animate every colour on the page at once,
      // which reads as a glitch rather than a change.
      disableTransitionOnChange
    >
      <ThemeColorSync />
      {children}
    </NextThemeProvider>
  )
}

/**
 * Keeps <meta name="theme-color"> on the theme the app actually renders.
 * Safari paints its collapsed toolbars with this value; left on a
 * prefers-color-scheme pair, a dark phone gets black bars around a light app
 * and the page looks like it stops above the home indicator.
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    if (!resolvedTheme) return
    // --background from globals.css, as hex for the meta tag.
    const color = resolvedTheme === 'dark' ? '#0E0E11' : '#FFFFFF'
    for (const el of document.querySelectorAll('meta[name="theme-color"]')) {
      el.setAttribute('content', color)
    }
  }, [resolvedTheme])
  return null
}
