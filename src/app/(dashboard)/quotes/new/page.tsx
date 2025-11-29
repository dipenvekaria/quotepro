// @ts-nocheck - Reuse existing lead/quote editor
'use client'

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
  // Set the flag synchronously so child component can read it immediately
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('isQuoteMode', 'true')
  }
  
  return <NewQuotePage />
}
