import { toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Centralized toast notification system with consistent styling
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(options?.title || message, {
      description: options?.title ? message : options?.description,
      icon: <CheckCircle2 className="h-4 w-4" />,
      duration: options?.duration || 4000,
      action: options?.action,
    })
  },

  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(options?.title || message, {
      description: options?.title ? message : options?.description,
      icon: <XCircle className="h-4 w-4" />,
      duration: options?.duration || 6000,
      action: options?.action,
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(options?.title || message, {
      description: options?.title ? message : options?.description,
      icon: <AlertCircle className="h-4 w-4" />,
      duration: options?.duration || 5000,
      action: options?.action,
    })
  },

  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(options?.title || message, {
      description: options?.title ? message : options?.description,
      icon: <Info className="h-4 w-4" />,
      duration: options?.duration || 4000,
      action: options?.action,
    })
  },

  loading: (message: string, options?: Omit<ToastOptions, 'duration'>) => {
    return sonnerToast.loading(options?.title || message, {
      description: options?.title ? message : options?.description,
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
    })
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: {
        title: loading,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      },
      success: (data) => ({
        title: typeof success === 'function' ? success(data) : success,
        icon: <CheckCircle2 className="h-4 w-4" />,
      }),
      error: (err) => ({
        title: typeof error === 'function' ? error(err) : error,
        icon: <XCircle className="h-4 w-4" />,
      }),
    })
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  },
}

/**
 * Common toast messages for consistency across the app
 */
export const toastMessages = {
  // Quote operations
  quoteGenerated: () => toast.success('Quote generated successfully'),
  quoteUpdated: () => toast.success('Quote updated'),
  quoteSent: () => toast.success('Quote sent successfully'),
  quoteDeleted: () => toast.success('Quote deleted'),
  
  // Save operations
  saved: () => toast.success('Changes saved'),
  saveFailed: () => toast.error('Failed to save changes'),
  
  // Network errors
  networkError: () => toast.error('Network error. Please check your connection.'),
  serverError: () => toast.error('Server error. Please try again later.'),
  
  // Validation
  validationError: (field?: string) => 
    toast.error(field ? `Please check the ${field} field` : 'Please check your input'),
  
  // Permissions
  permissionDenied: () => toast.error('You don\'t have permission to do this'),
  
  // Generic
  unexpectedError: () => toast.error('An unexpected error occurred'),
  copiedToClipboard: () => toast.success('Copied to clipboard', { duration: 2000 }),
}
