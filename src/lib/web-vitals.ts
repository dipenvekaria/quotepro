import type { Metric } from 'web-vitals'

/**
 * Web Vitals tracking
 * Sends Core Web Vitals to analytics
 */
export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: getVitalRating(metric),
    })
  }

  // Send to Vercel Analytics (automatic if @vercel/analytics is installed)
  // Send to custom analytics endpoint
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Could send to PostHog, Google Analytics, or custom endpoint
    sendToAnalytics(metric)
  }
}

function getVitalRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const { name, value } = metric

  switch (name) {
    case 'FCP': // First Contentful Paint
      if (value < 1800) return 'good'
      if (value < 3000) return 'needs-improvement'
      return 'poor'

    case 'LCP': // Largest Contentful Paint
      if (value < 2500) return 'good'
      if (value < 4000) return 'needs-improvement'
      return 'poor'

    case 'CLS': // Cumulative Layout Shift
      if (value < 0.1) return 'good'
      if (value < 0.25) return 'needs-improvement'
      return 'poor'

    case 'FID': // First Input Delay
      if (value < 100) return 'good'
      if (value < 300) return 'needs-improvement'
      return 'poor'

    case 'TTFB': // Time to First Byte
      if (value < 800) return 'good'
      if (value < 1800) return 'needs-improvement'
      return 'poor'

    case 'INP': // Interaction to Next Paint
      if (value < 200) return 'good'
      if (value < 500) return 'needs-improvement'
      return 'poor'

    default:
      return 'good'
  }
}

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: getVitalRating(metric),
    id: metric.id,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: window.location.href,
  })

  // Use sendBeacon if available, fall back to fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body)
  } else {
    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(console.error)
  }
}
