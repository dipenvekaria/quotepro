/**
 * Zod schemas mirroring the FastAPI response types in
 * python-backend/src/quotepro/db/schemas.py.
 *
 * Kept manually in sync — no code generation yet. Phase 9 wires an
 * OpenAPI-driven codegen step.
 */

import { z } from 'zod'

// ---- Line items ------------------------------------------------------------

export const optionTier = z.enum(['good', 'better', 'best'])
export const discountTarget = z.enum(['total', 'item'])

export const lineItemSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().nullable().optional(),
  quantity: z.number().nonnegative(),
  unit_price: z.number(),
  total: z.number(),
  option_tier: optionTier.nullable().optional(),
  is_upsell: z.boolean().default(false),
  is_discount: z.boolean().default(false),
  discount_target: discountTarget.nullable().optional(),
  sort_order: z.number().int().default(0),
})

export type LineItem = z.infer<typeof lineItemSchema>

// ---- Quote responses -------------------------------------------------------

export const quoteResponseSchema = z.object({
  line_items: z.array(lineItemSchema),
  subtotal: z.number(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total: z.number(),
  notes: z.string().nullable().optional(),
  rag_metadata: z.record(z.string(), z.any()).nullable().optional(),
})

export type QuoteResponse = z.infer<typeof quoteResponseSchema>

export const generateQuoteRequestSchema = z.object({
  company_id: z.string().uuid(),
  description: z.string().min(1),
  customer_name: z.string().optional(),
  customer_address: z.string().optional(),
  existing_items: z.array(lineItemSchema).default([]),
})

export const updateQuoteRequestSchema = z.object({
  work_item_id: z.string().uuid(),
  company_id: z.string().uuid(),
  user_prompt: z.string().min(1),
  existing_items: z.array(lineItemSchema),
})

// ---- Chat ------------------------------------------------------------------

export const chatMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
})

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  session_id: z.string().nullable().optional(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  agent: z.string().default('router'),
})

// ---- Tax -------------------------------------------------------------------

export const taxRateResponseSchema = z.object({
  tax_rate: z.number(),
  address: z.string(),
})

// ---- Catalog search --------------------------------------------------------

export const catalogItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  base_price: z.number(),
  unit: z.string(),
  tags: z.array(z.string()).optional(),
  rrf_score: z.number().optional(),
})

export const catalogSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(catalogItemSchema),
})

// ---- Backfill --------------------------------------------------------------

export const backfillResponseSchema = z.object({
  company_id: z.string(),
  counts: z.object({
    catalog_items: z.number().int(),
    work_items: z.number().int(),
    errors: z.number().int(),
  }),
})

// ---- Error envelope --------------------------------------------------------

export const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
})
