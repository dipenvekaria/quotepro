'use client'

import { useEffect } from 'react'

export function HideDevTools() {
  useEffect(() => {
    // Only run on mobile
    if (typeof window === 'undefined' || window.innerWidth > 768) return

    const hideDevTools = () => {
      // Find and hide React DevTools badge
      const selectors = [
        '#react-devtools-portal',
        '[data-react-devtools-portal]',
        'iframe[src*="react-devtools"]',
        'div[id*="react-devtools"]',
        'div[class*="react-devtools"]',
      ]

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none'
            el.style.visibility = 'hidden'
            el.style.opacity = '0'
            el.style.pointerEvents = 'none'
          }
        })
      })
    }

    // Run immediately
    hideDevTools()

    // Run periodically to catch dynamically added elements
    const interval = setInterval(hideDevTools, 1000)

    // Also observe DOM changes
    const observer = new MutationObserver(hideDevTools)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [])

  return null
}
