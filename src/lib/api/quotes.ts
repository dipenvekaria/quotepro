/**
 * Quote API service - all quote-related backend calls
 */

import { api } from './client'

export interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  option_tier?: string | null
  is_upsell?: boolean
  is_discount?: boolean
}

export interface GeneratedQuote {
  line_items: QuoteItem[]
  options?: { tier: string; items: QuoteItem[] }[]
  subtotal: number
  tax_rate: number
  tax_amount?: number
  total: number
  notes?: string
  upsell_suggestions?: string[]
}

export interface GenerateQuoteRequest {
  company_id: string
  description: string
  customer_name?: string
  customer_address?: string
  existing_items?: QuoteItem[]
  photos?: string[]
}

export interface UpdateQuoteWithAIRequest {
  quote_id: string
  company_id: string
  user_prompt: string
  existing_items?: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
  customer_name: string
  customer_address?: string
  conversation_history?: Array<{
    role: string
    content: string
  }>
}

export interface SaveQuoteRequest {
  company_id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_address?: string
  description?: string
  job_name?: string
  photos?: string[]
  line_items: QuoteItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: string
}

export interface UpdateQuoteRequest extends SaveQuoteRequest {
  id: string
}

export interface SendQuoteRequest {
  quote_id: string
  recipient_email: string
  company_logo?: string
}

/**
 * Generate new quote using AI
 */
export async function generateQuote(
  request: GenerateQuoteRequest
): Promise<GeneratedQuote> {
  return api.post<GeneratedQuote>('/api/generate-quote', request)
}

/**
 * Update existing quote with AI
 */
export async function updateQuoteWithAI(
  request: UpdateQuoteWithAIRequest
): Promise<GeneratedQuote> {
  return api.post<GeneratedQuote>('/api/update-quote-with-ai', request)
}

/**
 * Calculate tax rate for address
 */
export async function calculateTaxRate(
  companyId: string,
  customerAddress: string
): Promise<{ tax_rate: number }> {
  return api.post<{ tax_rate: number }>('http://localhost:8001/api/calculate-tax-rate', {
    company_id: companyId,
    customer_address: customerAddress,
  })
}

/**
 * Send quote to customer via email
 */
export async function sendQuote(request: SendQuoteRequest): Promise<void> {
  await api.post('/api/send-quote', request)
}

/**
 * Generate job name using AI
 */
export async function generateJobName(
  customerName: string,
  description: string
): Promise<{ job_name: string }> {
  return api.post<{ job_name: string }>('/api/generate-job-name', {
    customer_name: customerName,
    description,
  })
}
