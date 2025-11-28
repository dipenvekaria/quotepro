# ✅ Fixed: 500 Error - Window is Not Defined (SSR Issue)

## The Problem

The app was crashing with a 500 error:
```
ReferenceError: window is not defined
at NewQuotePage (src/app/quotes/new/page.tsx:1504:32)
```

This happened because we were using `window.location.origin` directly in the JSX, which runs on the server during SSR (Server-Side Rendering) where `window` doesn't exist.

## The Solution

Added a client-side-only state variable to store the origin URL:

### What Changed

**Before (Broken):**
```tsx
{/* This runs on server where window doesn't exist */}
<a href={`${window.location.origin}/quotes/view/${quoteId}`}>
  {window.location.origin}/quotes/view/{quoteId}
</a>
```

**After (Fixed):**
```tsx
// Added state variable
const [origin, setOrigin] = useState('')

// Set it only on client side
useEffect(() => {
  if (typeof window !== 'undefined') {
    setOrigin(window.location.origin)
  }
}, [quoteId])

// Use the state variable instead
{quoteId && origin && (
  <a href={`${origin}/quotes/view/${quoteId}`}>
    {origin}/quotes/view/{quoteId}
  </a>
)}
```

## Why This Works

1. **Server Render**: `origin` starts as empty string `''`, link doesn't render
2. **Client Mount**: `useEffect` runs, sets `origin` to actual URL
3. **Client Render**: Link appears with correct URL
4. **No Error**: No access to `window` during server render

## What's Fixed

✅ No more 500 error on `/quotes/new` page  
✅ Public quote link still works perfectly  
✅ Copy link button still works  
✅ Server-side rendering works properly  
✅ Client-side interactivity preserved  

## Files Changed

- **`src/app/quotes/new/page.tsx`**
  - Added `origin` state variable
  - Set origin in `useEffect` with client-side check
  - Updated public quote link to use `origin` state

---

**Status:** ✅ Fixed - Reload browser now!  
**Date:** November 27, 2025
