# Error Handling & User Experience Guide

## Overview
QuotePro implements comprehensive error handling to ensure a smooth user experience even when things go wrong.

## Components

### 1. Error Boundaries

**Global Error Boundary** (`src/components/error-boundary.tsx`)
- Wraps entire application in root layout
- Catches unhandled React errors
- Shows user-friendly error screen with retry option
- Logs errors for debugging (integration with Sentry/monitoring ready)

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- ✅ Graceful error recovery with "Try Again" button
- ✅ "Go to Dashboard" escape hatch
- ✅ Dev-only error details (stack trace)
- ✅ Production-safe error messages
- ✅ Custom fallback UI support

### 2. Network Status Detection

**NetworkStatus Component** (`src/components/network-status.tsx`)
- Monitors online/offline status
- Shows banner when offline
- Toast notifications on status change
- Automatically dismisses when back online

**Hook Usage:**
```tsx
import { useNetworkStatus } from '@/components/network-status'

function MyComponent() {
  const isOnline = useNetworkStatus()
  
  if (!isOnline) {
    return <p>You're offline. Please check your connection.</p>
  }
  
  // Normal render
}
```

**Features:**
- ✅ Real-time connection monitoring
- ✅ Persistent offline banner
- ✅ Toast notifications on state change
- ✅ Reusable hook for component-level checks

### 3. Loading States

**Skeleton Loaders** (`src/components/skeletons.tsx`)

Available skeletons:
- `QuoteCardSkeleton` - Individual quote card
- `QuoteListSkeleton` - List of quotes
- `StatsCardSkeleton` - Dashboard stat card
- `StatsGridSkeleton` - Grid of stats
- `TableSkeleton` - Data table
- `FormSkeleton` - Form fields
- `PageSkeleton` - Full page layout
- `ContentSkeleton` - Generic content

**Usage:**
```tsx
import { QuoteListSkeleton } from '@/components/skeletons'

function QuotesList() {
  const { data, isLoading } = useQuotes()
  
  if (isLoading) return <QuoteListSkeleton count={5} />
  
  return <QuoteList quotes={data} />
}
```

**Benefits:**
- ✅ Improved perceived performance
- ✅ Reduces layout shift (CLS)
- ✅ Clear loading indication
- ✅ Matches actual content structure

### 4. Toast Notifications

**Centralized Toast System** (`src/lib/toast.tsx`)

**API:**
```tsx
import { toast, toastMessages } from '@/lib/toast'

// Basic usage
toast.success('Operation completed')
toast.error('Something went wrong')
toast.warning('Please review this')
toast.info('Did you know...')
toast.loading('Processing...')

// With options
toast.success('Quote saved', {
  description: 'Your changes have been saved successfully',
  duration: 4000,
  action: {
    label: 'View',
    onClick: () => router.push('/quotes/123')
  }
})

// Promise-based
toast.promise(
  saveQuote(),
  {
    loading: 'Saving quote...',
    success: 'Quote saved!',
    error: 'Failed to save quote'
  }
)

// Predefined messages
toastMessages.quoteGenerated()
toastMessages.networkError()
toastMessages.copiedToClipboard()
```

**Features:**
- ✅ Consistent styling with icons
- ✅ Appropriate durations (success: 4s, error: 6s)
- ✅ Action buttons support
- ✅ Promise integration
- ✅ Predefined common messages

**Common Messages:**
- `quoteGenerated()` - Quote creation success
- `quoteUpdated()` - Quote update success
- `quoteSent()` - Quote email sent
- `quoteDeleted()` - Quote deletion
- `saved()` - Generic save success
- `saveFailed()` - Generic save failure
- `networkError()` - Network/connection error
- `serverError()` - Server-side error
- `validationError(field?)` - Input validation
- `permissionDenied()` - Authorization error
- `unexpectedError()` - Catch-all error
- `copiedToClipboard()` - Copy success

## Best Practices

### Error Handling

1. **Always wrap risky operations in try-catch**
```tsx
async function handleSubmit() {
  try {
    await saveQuote(data)
    toast.success('Quote saved')
  } catch (error) {
    toast.error(error.message || 'Failed to save quote')
    console.error('Save error:', error)
  }
}
```

2. **Use ErrorBoundary for component isolation**
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <ComplexComponent />
</ErrorBoundary>
```

3. **Check network status before operations**
```tsx
const isOnline = useNetworkStatus()

async function syncData() {
  if (!isOnline) {
    toast.warning('You\'re offline. Changes will sync when you reconnect.')
    return
  }
  
  await uploadData()
}
```

### Loading States

1. **Use skeleton loaders for initial load**
```tsx
if (isLoading) return <QuoteListSkeleton count={5} />
if (error) return <ErrorMessage error={error} />
return <QuoteList data={data} />
```

2. **Use loading toasts for operations**
```tsx
const toastId = toast.loading('Generating quote...')

try {
  await generateQuote()
  toast.dismiss(toastId)
  toast.success('Quote generated!')
} catch (error) {
  toast.dismiss(toastId)
  toast.error('Generation failed')
}
```

3. **Disable buttons during operations**
```tsx
<Button
  onClick={handleSave}
  disabled={isSaving}
>
  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save Quote
</Button>
```

### User Feedback

1. **Always provide feedback for user actions**
- Button clicks → Loading state + toast
- Form submissions → Validation + success/error
- Background operations → Progress indicator

2. **Use appropriate toast types**
- `success` - Confirmed completion
- `error` - Failed operation (with retry if possible)
- `warning` - Needs attention but not critical
- `info` - FYI, no action needed
- `loading` - Operation in progress

3. **Provide actionable error messages**
```tsx
// ❌ Bad
toast.error('Error')

// ✅ Good
toast.error('Failed to send quote', {
  description: 'The email server is temporarily unavailable',
  action: {
    label: 'Retry',
    onClick: () => resendQuote()
  }
})
```

## Monitoring Integration

Error boundaries log to console by default. To integrate with error monitoring:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { react: errorInfo }
      })
    }
  }}
>
  {children}
</ErrorBoundary>
```

## Testing Error States

1. **Simulate network offline**
```bash
# Chrome DevTools: Network tab → Throttling → Offline
```

2. **Trigger error boundary**
```tsx
// Add to any component for testing
if (process.env.NODE_ENV === 'development' && forceError) {
  throw new Error('Test error boundary')
}
```

3. **Test loading states**
```tsx
// Add artificial delay in development
await new Promise(resolve => setTimeout(resolve, 2000))
```

## Migration from Old Toast Usage

Replace old toast imports:
```tsx
// ❌ Old
import { toast } from 'sonner'
toast.success('Success')

// ✅ New
import { toast } from '@/lib/toast'
toast.success('Success')
```

Benefits:
- Consistent icons
- Appropriate durations
- Predefined messages
- Better TypeScript support

## Summary

✅ **Error Boundaries** - Catch crashes gracefully
✅ **Network Detection** - Handle offline scenarios
✅ **Skeleton Loaders** - Smooth loading experience
✅ **Centralized Toasts** - Consistent feedback

All error handling is production-ready and user-friendly!
