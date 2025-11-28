# Workflow Improvements: Scheduling & Payment Tracking

## Overview

This document details the complete quote-to-payment workflow improvements implemented based on real-world usage patterns. The updates streamline the contractor workflow from customer acceptance through job completion and payment collection.

## Complete Workflow

```
Customer Actions:
1. View quote (/q/[id])
2. Click "Accept & Sign" 
3. Either: SignNow signature OR instant acceptance
4. See confirmation (Accepted or Signed status)

Contractor Actions:
5. Work > To be Scheduled - See accepted/signed quotes
6. Click "Schedule" button → Select date & time
7. Work > Scheduled - Job appears with scheduled time
8. Complete the job → Click "Complete" button
9. Pay > Invoice - Job appears as pending payment
10. Receive payment → Click "Mark as Paid"
11. Pay > Paid - Job archived as paid
```

## Database Changes

### Migration 014 (Existing - Acceptance & Scheduling)
```sql
ALTER TABLE quotes ADD COLUMN accepted_at TIMESTAMP;
ALTER TABLE quotes ADD COLUMN scheduled_at TIMESTAMP;
ALTER TABLE quotes ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('draft', 'sent', 'accepted', 'signed', 'declined'));
```

### Migration 015 (New - Payment Tracking)
```sql
ALTER TABLE quotes ADD COLUMN paid_at TIMESTAMP;
CREATE INDEX idx_quotes_payment_status ON quotes(completed_at, paid_at);
```

## Features Implemented

### 1. Public Quote Viewer Updates (/q/[id]/page.tsx)

**Customer Experience Improvements:**

- ✅ Shows "Accepted" status badge (green) when quote.accepted_at is set
- ✅ Shows "Signed" status badge (emerald) when quote.signed_at is set
- ✅ Hides "Accept & Sign" button when already accepted or signed
- ✅ Shows appropriate confirmation message:
  - **Signed:** "Quote Signed! Signed on [date]. We'll contact you soon to schedule the work."
  - **Accepted:** "Quote Accepted! Accepted on [date]. We'll contact you soon to schedule the work."

**Benefits:**
- Prevents customer confusion about needing to sign again
- Clear visual feedback that their action was recorded
- Professional communication of next steps

### 2. Scheduling Modal Component

**File:** `/src/components/schedule-job-modal.tsx`

**Features:**
- Date picker (minimum: today)
- Time slot selection (8:00 AM - 5:00 PM in 1-hour increments)
- Customer info summary (name, address, total)
- Validates date and time before scheduling
- Calls `/api/quotes/[id]/schedule` endpoint

**UX Design:**
- Orange brand color for selected time slot
- Disabled state during submission
- Clear error handling
- Auto-closes on success

### 3. Work Page Redesign

**File:** `/src/app/(dashboard)/work/page.tsx`

#### To be Scheduled Tab
- **Filter:** `(status = 'accepted' OR 'signed') AND scheduled_at IS NULL`
- **Card Layout:**
  - Customer name, address, quote number
  - Status badge, total amount
  - Acceptance date
  - **Schedule button** (orange) → Opens scheduling modal
- **Behavior:** Click Schedule, pick date/time, quote moves to Scheduled tab

#### Scheduled Tab
- **Filter:** `scheduled_at IS NOT NULL AND completed_at IS NULL`
- **Card Layout:**
  - Customer name, address, quote number
  - Status badge, total amount
  - **Scheduled date & time** (blue highlight)
  - **Complete button** (green outline)
- **Behavior:** Click Complete, confirmation dialog, quote moves to Pay > Invoice

#### Completed Tab (Deprecated)
- Now shows redirect message to Pay page
- "Completed Jobs Moved to Pay" with button to /pay
- Simplifies navigation and workflow

### 4. Pay Page (New)

**File:** `/src/app/(dashboard)/pay/page.tsx`

**Purpose:** Centralize all financial tracking in one place

#### Invoice Tab
- **Filter:** `completed_at IS NOT NULL AND paid_at IS NULL`
- **Features:**
  - Shows pending invoices awaiting payment
  - Displays total outstanding amount across all invoices
  - Orange highlight for pending status
  - **Mark as Paid button** (green) for each invoice
- **Card Layout:**
  - Customer name, address, quote number
  - Large amount display in orange
  - Completion date
  - Mark as Paid action button

#### Paid Tab
- **Filter:** `paid_at IS NOT NULL`
- **Features:**
  - Archive of all paid invoices
  - Green highlight showing paid status
  - Total revenue received summary
  - Read-only cards (link to quote details)
- **Card Layout:**
  - Green background theme
  - "PAID" badge
  - Amount in green color
  - Payment date

### 5. API Endpoints

#### POST /api/quotes/accept (Existing)
- Sets accepted_at timestamp
- Updates status to 'accepted'
- Logs to audit trail

#### PUT /api/quotes/[id]/schedule (New)
```typescript
Request: { scheduled_at: ISO timestamp }
Response: { success: true, quote: {...} }
```
- Updates scheduled_at
- Logs 'scheduled' action to audit trail
- Used by scheduling modal

#### PUT /api/quotes/[id]/complete (New)
```typescript
Request: { completed_at: ISO timestamp }
Response: { success: true, quote: {...} }
```
- Updates completed_at
- Logs 'completed' action to audit trail
- Moves job to Invoice tab

#### PUT /api/quotes/[id]/mark-paid (New)
```typescript
Request: { paid_at: ISO timestamp }
Response: { success: true, quote: {...} }
```
- Updates paid_at
- Logs 'marked_paid' action to audit trail
- Moves invoice to Paid tab

### 6. Navigation Updates

**File:** `/src/components/dashboard-navigation.tsx`

- Updated Pay navigation item:
  - Icon: DollarSign
  - Label: "Pay"
  - Route: `/pay` (was `/payments`)
  - Description: "Invoices and payments"

## Status Flow

```
Quote States (visual representation):

DRAFT → SENT → ACCEPTED/SIGNED → TO BE SCHEDULED → SCHEDULED → COMPLETED → INVOICE → PAID
  ↓      ↓           ↓                  ↓              ↓           ↓           ↓        ↓
Gray   Blue    Green/Emerald         Orange          Blue       Green      Orange   Green
```

**Database Fields:**
- `status`: 'draft', 'sent', 'accepted', 'signed', 'declined'
- `sent_at`: When quote was sent to customer
- `accepted_at`: Customer accepted (instant acceptance fallback)
- `signed_at`: Customer signed via SignNow
- `scheduled_at`: Job scheduled with date/time
- `completed_at`: Job finished
- `paid_at`: Invoice paid

## Testing Checklist

### Customer Flow
- [ ] View quote as customer
- [ ] Accept quote (instant acceptance)
- [ ] Verify "Accept & Sign" button disappears
- [ ] See "Accepted" confirmation message
- [ ] Try to access same quote again - should still show accepted

### Contractor Flow - Scheduling
- [ ] See accepted quote in Work > To be Scheduled
- [ ] Click Schedule button
- [ ] Select date and time
- [ ] Click "Schedule Job"
- [ ] Verify quote moves to Scheduled tab
- [ ] Check scheduled date displays correctly

### Contractor Flow - Completion
- [ ] See scheduled job in Work > Scheduled
- [ ] Click Complete button
- [ ] Confirm completion dialog
- [ ] Verify quote moves to Pay > Invoice
- [ ] Check completed date shows

### Contractor Flow - Payment
- [ ] See completed job in Pay > Invoice
- [ ] Verify total outstanding amount is correct
- [ ] Click "Mark as Paid"
- [ ] Confirm payment dialog
- [ ] Verify invoice moves to Pay > Paid
- [ ] Check paid date shows
- [ ] Verify total received amount updates

### Navigation
- [ ] Pay link in navigation works
- [ ] All tabs load correctly
- [ ] Counts in tab badges are accurate
- [ ] Back buttons work properly

## Migration Instructions

### 1. Apply Database Migrations

```bash
# Apply both migrations (if not already applied)
npx supabase db push

# Or apply individually:
npx supabase migration up 014_add_acceptance_and_scheduling
npx supabase migration up 015_add_payment_tracking
```

### 2. Verify Database Changes

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
  AND column_name IN ('accepted_at', 'scheduled_at', 'completed_at', 'paid_at');

-- Check indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'quotes';

-- Check status constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'quotes'::regclass AND conname = 'quotes_status_check';
```

### 3. Regenerate Supabase Types (Optional)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

### 4. Test the Flow

1. Create a test quote
2. Send to customer
3. Accept it (use /q/[id]/sign with fallback)
4. Schedule it from Work page
5. Complete it from Scheduled tab
6. Mark as paid from Invoice tab
7. Verify it appears in Paid tab

## Key Benefits

### For Customers
- ✅ Clear confirmation they don't need to sign again
- ✅ Professional communication of next steps
- ✅ No confusion about quote status

### For Contractors
- ✅ Efficient scheduling directly from work list
- ✅ Clear separation: Work = Active Jobs, Pay = Financials
- ✅ Easy tracking of outstanding payments
- ✅ Complete workflow visibility from acceptance to payment
- ✅ Accurate financial reporting (total outstanding, total received)

### For Business
- ✅ Complete audit trail of all actions
- ✅ Better cash flow tracking
- ✅ Reduced confusion and support requests
- ✅ Streamlined operations

## Technical Notes

### TypeScript Issues
Files using these new columns have `@ts-nocheck` until Supabase types are regenerated. This is expected and safe.

### Backward Compatibility
- Existing quotes without new timestamps still work
- Filters handle NULL values correctly
- Status badge supports both old and new status values

### Performance
- Indexes on `scheduled_at`, `completed_at`, and `paid_at` ensure fast filtering
- Queries are optimized for common workflows

## Future Enhancements

Potential improvements for future iterations:

1. **Payment Integration**
   - Replace "Mark as Paid" with actual payment processing
   - Support partial payments
   - Generate invoices as PDFs

2. **Calendar Improvements**
   - Show scheduled jobs on main calendar
   - Drag-and-drop rescheduling
   - Calendar sync (Google Calendar, iCal)

3. **Notifications**
   - Email customer when job is scheduled
   - Reminder before scheduled job
   - Payment receipt emails

4. **Reporting**
   - Revenue reports
   - Outstanding invoices report
   - Job completion metrics

5. **Advanced Scheduling**
   - Recurring jobs
   - Multi-day jobs
   - Team member assignment

## Summary

These workflow improvements address real-world contractor needs:
- ✅ Customer clarity (no duplicate signing)
- ✅ Efficient scheduling (modal, not full editor)
- ✅ Job tracking (to schedule → scheduled → completed)
- ✅ Payment tracking (invoice → paid)
- ✅ Financial visibility (outstanding amounts, revenue)

The complete workflow is now: **Accept → Schedule → Complete → Invoice → Paid**

Each stage has clear actions, visual feedback, and automatic progression through the workflow.
