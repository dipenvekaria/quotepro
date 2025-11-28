# Quote Queue Fix - Accepted Quotes Now Move to Work

## Issue
When a quote was accepted/signed by a customer, it appeared in **both**:
- Leads & Quotes page (Quotes section)
- Work page (To be Scheduled section)

This caused confusion - the same quote showing in two places.

## Root Cause
The Leads page was filtering quotes based only on `lead_status`, not checking if the quote had been accepted/signed yet.

## Solution
Updated the Quotes section filter in `/src/app/(dashboard)/leads/page.tsx` to exclude quotes that have been accepted or signed.

### Before
```typescript
const quotes = allRecords.filter(r => 
  ['quoted', 'lost'].includes(r.lead_status)
)
```

### After
```typescript
const quotes = allRecords.filter(r => {
  // Must have quote status of 'quoted' or 'lost'
  const isQuoteLead = ['quoted', 'lost'].includes(r.lead_status)
  
  // Exclude if already accepted or signed (they're in Work section now)
  const notInWorkQueue = !r.accepted_at && !r.signed_at
  
  return isQuoteLead && notInWorkQueue
})
```

## Behavior Now

### Quote Lifecycle

```
1. New Lead → Leads section (lead_status: 'new')
   ↓
2. Quote Created → Quotes section (lead_status: 'quoted')
   ↓
3. Customer Accepts/Signs → MOVES to Work > To be Scheduled
   (accepted_at or signed_at is set)
   ↓
4. Schedule Job → Work > Scheduled
   (scheduled_at is set)
   ↓
5. Complete Job → Pay > Invoice
   (completed_at is set)
   ↓
6. Mark as Paid → Pay > Paid
   (paid_at is set)
```

### Clear Separation

- **Leads & Quotes Page:** Active sales pipeline only
  - Leads: New contacts, not yet quoted
  - Quotes: Sent quotes waiting for customer response
  
- **Work Page:** Accepted/signed quotes only
  - To be Scheduled: Customer said yes, need to pick date
  - Scheduled: Date/time confirmed
  
- **Pay Page:** Completed jobs only
  - Invoice: Job done, waiting for payment
  - Paid: Payment received

## Testing

### Test Case 1: New Quote
1. Create a new quote
2. Send it (status: 'sent', lead_status: 'quoted')
3. ✅ Should appear in **Leads & Quotes > Quotes section**
4. ✅ Should NOT appear in Work section

### Test Case 2: Customer Accepts
1. Customer clicks "Accept & Sign"
2. Quote is accepted (accepted_at is set)
3. ✅ Should DISAPPEAR from Leads & Quotes page
4. ✅ Should APPEAR in Work > To be Scheduled

### Test Case 3: Customer Signs via SignNow
1. Customer completes SignNow signature
2. Quote is signed (signed_at is set)
3. ✅ Should DISAPPEAR from Leads & Quotes page
4. ✅ Should APPEAR in Work > To be Scheduled

### Test Case 4: Lost Quote
1. Mark quote as lost (lead_status: 'lost')
2. ✅ Should still appear in Quotes section (for record keeping)
3. ✅ Should NOT appear in Work section

## Files Changed

- `/src/app/(dashboard)/leads/page.tsx` - Updated quotes filter

## Benefits

✅ No more duplicate quotes across sections
✅ Clear workflow progression
✅ Sales team sees only active quotes
✅ Operations team sees only accepted work
✅ Better organization and less confusion

## Summary

Quotes now **automatically move** from Leads & Quotes → Work when customer accepts/signs. No manual intervention needed. Clean, automatic workflow progression! 🎉
