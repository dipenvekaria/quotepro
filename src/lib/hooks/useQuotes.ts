/**
 * TanStack Query hooks for quote operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as quotesAPI from '../api/quotes'

/**
 * Generate quote with AI
 */
export function useGenerateQuote() {
  return useMutation({
    mutationFn: quotesAPI.generateQuote,
    onSuccess: () => {
      toast.success('Quote generated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate quote')
    },
  })
}

/**
 * Update quote with AI
 */
export function useUpdateQuoteWithAI() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: quotesAPI.updateQuoteWithAI,
    onSuccess: () => {
      toast.success('Quote updated')
      // Invalidate audit logs query if it exists
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update quote')
    },
  })
}

/**
 * Calculate tax rate for address
 */
export function useCalculateTaxRate() {
  return useMutation({
    mutationFn: ({ companyId, customerAddress }: { companyId: string; customerAddress: string }) =>
      quotesAPI.calculateTaxRate(companyId, customerAddress),
    onError: (error: Error) => {
      console.error('Failed to calculate tax rate:', error)
    },
  })
}

/**
 * Send quote to customer
 */
export function useSendQuote() {
  return useMutation({
    mutationFn: quotesAPI.sendQuote,
    onSuccess: () => {
      toast.success('Quote sent successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send quote')
    },
  })
}

/**
 * Generate job name with AI
 */
export function useGenerateJobName() {
  return useMutation({
    mutationFn: ({ customerName, description }: { customerName: string; description: string }) =>
      quotesAPI.generateJobName(customerName, description),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate job name')
    },
  })
}
