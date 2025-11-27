# Next.js 16 Async Params Fix

## Issue
PDF generation was failing with 404 errors after upgrading to Next.js 16.

## Root Cause
Next.js 16 changed dynamic route parameters to be async promises instead of direct objects.

### Before (Next.js 14/15)
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const quoteId = params.id  // Direct access
}
```

### After (Next.js 16)
```typescript
export async function POST(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  const params = await segmentData.params  // Must await
  const quoteId = params.id
}
```

## Fix Applied

Updated `/src/app/api/quotes/[id]/generate-pdf/route.ts` to use async params pattern.

## Files Modified
- ✅ `/src/app/api/quotes/[id]/generate-pdf/route.ts`

## Testing
After this fix, PDF generation should work:
1. Create/save a quote
2. Check console - should see "PDF generated: https://..."
3. No more 404 errors on `/api/quotes/{id}/generate-pdf`

## Related
This is a Next.js 16 breaking change documented at:
https://nextjs.org/docs/app/building-your-application/upgrading/version-16

All dynamic route handlers need this update.
