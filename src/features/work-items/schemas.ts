/**
 * Zod schemas for the unified `work_items` table.
 *
 * Mirrors public.work_items in supabase/migrations/00000000000000_baseline.sql.
 */

import { z } from 'zod'

// Enum kept in sync with the Postgres enum `work_item_status`.
export const workItemStatus = z.enum([
  'lead',
  'quote_draft',
  'quote_sent',
  'quote_viewed',
  'quote_accepted',
  'quote_rejected',
  'quote_expired',
  'job_scheduled',
  'job_in_progress',
  'job_completed',
  'job_cancelled',
  'archived',
])

export type WorkItemStatus = z.infer<typeof workItemStatus>

export const workItemKind = z.enum(['lead', 'quote', 'job', 'archived', 'unknown'])
export type WorkItemKind = z.infer<typeof workItemKind>

// Convenience groupings that mirror the pipeline board columns.
export const kindByStatus: Record<WorkItemStatus, WorkItemKind> = {
  lead: 'lead',
  quote_draft: 'quote',
  quote_sent: 'quote',
  quote_viewed: 'quote',
  quote_accepted: 'quote',
  quote_rejected: 'quote',
  quote_expired: 'quote',
  job_scheduled: 'job',
  job_in_progress: 'job',
  job_completed: 'job',
  job_cancelled: 'job',
  archived: 'archived',
}

// ---- Server-action input schemas -------------------------------------------

export const createLeadInputSchema = z.object({
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional(),
  address: z.string().optional(),
  description: z.string().min(1),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  source: z.string().default('direct'),
})

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>

export const transitionStatusInputSchema = z.object({
  id: z.string().uuid(),
  to: workItemStatus,
  reason: z.string().optional(),
})

export const assignInputSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
})

export const archiveInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1),
})

// Query filters
export const listFiltersSchema = z.object({
  kind: workItemKind.optional(),
  status: workItemStatus.optional(),
  assigned_to: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
})

export type ListFilters = z.infer<typeof listFiltersSchema>
