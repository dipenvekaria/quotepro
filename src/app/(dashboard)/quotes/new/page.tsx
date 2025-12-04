// @ts-nocheck - Reuse existing lead/quote editor
'use client'

import { useEffect } from 'react'
import NewQuotePage from '@/app/(dashboard)/leads/new/page'

/**
 * Quote Editor Route
 * 
 * This page reuses the existing lead/quote editor from /leads/new
 * but customizes the heading to show "New Quote" / "Edit Quote"
 * 
 * Usage:
 * - /quotes/new - Create new quote
 * - /quotes/new?id=X - Edit existing quote
 * - /quotes/new?mode=quote - Force quote mode
 * 
 * The underlying editor handles both leads and quotes with full features:
 * - AI-powered quote generation
 * - Line item editing
 * - Photo uploads
 * - Tax calculation
 * - PDF generation
 * - SignNow integration
 */
export default function QuoteEditorPage() {
  // Set the flag in useEffect to avoid hydration mismatch
  useEffect(() => {
    sessionStorage.setItem('isQuoteMode', 'true')
    return () => {
      sessionStorage.removeItem('isQuoteMode')
    }
  }, [])
  
  return <NewQuotePage />
}
