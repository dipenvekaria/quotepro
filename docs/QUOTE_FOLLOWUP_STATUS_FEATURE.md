# Quote Follow-Up Status Tracking Feature

## Overview

Added a comprehensive status tracking system to monitor the customer follow-up journey for quotes. This helps you track where each quote is in the process and know when to follow up.

## Status Workflow

The quote moves through these stages:

```
Draft → Sent → 1st Reminder → 2nd Reminder → Expired/Accepted
```

### Status Stages with Color Coding

| Status | Badge Color | Icon | Description |
|--------|------------|------|-------------|
| **Draft** | Gray | 🕐 Clock | Quote created but not sent yet |
| **Sent** | Blue | 📤 Send | Quote sent to customer, waiting for response |
| **1st Reminder** | Yellow | 🔔 Bell | First follow-up reminder sent |
| **2nd Reminder** | Orange | 🔔🔔 Bell Ring | Second follow-up reminder sent |
| **Expired** | Red | ❌ X Circle | Quote expired, no response from customer |
| **Accepted** | Green | ✅ Check | Customer accepted quote, ready to schedule |

## Visual Examples

### Quote List View
```
┌────────────────────────────────────────────────────┐
│ John Doe                                   📞 📅 📄│
│ Replace water heater                               │
│ [🕐 Draft]  $1,250  2m ago                        │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Jane Smith                                 📞 📅 📄│
│ Full system tune-up                                │
│ [📤 Sent]  $450  1d ago                           │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Bob Johnson                                📞 📅 📄│
│ Sewer line repair                                  │
│ [🔔 1st Reminder]  $2,100  3d ago                 │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Alice Brown                                📞 📅 📄│
│ Emergency water leak fix                           │
│ [✅ Accepted]  $850  5d ago                       │
└────────────────────────────────────────────────────┘
```

## Calendar Icon Behavior

The calendar (📅) icon is now **conditional**:

### ✅ **Accepted Status - Calendar ENABLED**
- Icon is **bright blue** and clickable
- Hover effect: Scales up slightly
- Tooltip: "Schedule Job"
- Action: Opens scheduling modal

### ⚠️ **Other Statuses - Calendar DISABLED**
- Icon is **grayed out** (gray-300)
- Opacity: 50%
- Cannot click
- Tooltip: "Quote must be accepted first"
- Visual cue: Customer hasn't accepted yet

## Database Changes

### New Migration: `013_add_quote_followup_status.sql`

Added to quotes table:
- `followup_status` - Tracks current stage in follow-up process
- `reminder_1_sent_at` - Timestamp when 1st reminder sent
- `reminder_2_sent_at` - Timestamp when 2nd reminder sent
- `accepted_at` - Timestamp when customer accepted
- `expired_at` - Timestamp when quote expired

### Apply Migration

**Option 1: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/013_add_quote_followup_status.sql`
3. Paste and click "Run"

**Option 2: Supabase CLI**
```bash
npx supabase db push
```

## New Component: QuoteStatusBadge

### Location
`src/components/quote-status-badge.tsx`

### Usage
```tsx
import { QuoteStatusBadge } from '@/components/quote-status-badge'

// In your component
<QuoteStatusBadge status="sent" size="sm" />
<QuoteStatusBadge status="accepted" size="md" showIcon={true} />
```

### Props
- `status`: 'draft' | 'sent' | 'reminder_1' | 'reminder_2' | 'expired' | 'accepted'
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `showIcon`: boolean (default: true)

### Helper Functions

**canScheduleQuote(status)**
```tsx
import { canScheduleQuote } from '@/components/quote-status-badge'

const canSchedule = canScheduleQuote('accepted') // true
const canSchedule = canScheduleQuote('sent') // false
```

**getNextStatus(status)**
```tsx
import { getNextStatus } from '@/components/quote-status-badge'

const next = getNextStatus('sent') // 'reminder_1'
const next = getNextStatus('accepted') // null (terminal state)
```

## Updated Components

### 1. QuoteRow Component
**Location:** `src/components/leads-and-quotes.tsx`

**Changes:**
- ✅ Replaced old "Quoted"/"Signed"/"Lost" badges with new status badges
- ✅ Added color-coded status indicators
- ✅ Conditional calendar icon (enabled only when accepted)
- ✅ Better tooltips for user guidance
- ✅ Visual feedback with hover effects

**Before:**
```tsx
// Old: Simple text badges
[Quoted] $1,250  2d ago
```

**After:**
```tsx
// New: Color-coded status with icons
[🕐 Draft] $1,250  2d ago         // Gray
[📤 Sent] $1,250  2d ago          // Blue
[🔔 1st Reminder] $1,250  2d ago  // Yellow
[✅ Accepted] $1,250  2d ago      // Green
```

### 2. LeadRow Component
**Location:** `src/components/leads-and-quotes.tsx`

**Changes:**
- ✅ Enhanced color contrast for better visibility
- ✅ Added default "Active" badge for leads without status
- ✅ More descriptive badge text ("New Lead" instead of just "New")
- ✅ Consistent styling with quote badges

## How It Works

### 1. Quote Creation
- New quote starts with `followup_status = 'draft'`
- Calendar icon is grayed out (not accepted yet)

### 2. Sending Quote
When you send the quote:
- Status updates to `'sent'`
- `sent_at` timestamp recorded
- Calendar still grayed out

### 3. Follow-Up Reminders
First reminder:
- Status → `'reminder_1'`
- `reminder_1_sent_at` timestamp recorded

Second reminder:
- Status → `'reminder_2'`
- `reminder_2_sent_at` timestamp recorded

### 4. Customer Response

**If customer accepts:**
- Status → `'accepted'`
- `accepted_at` timestamp recorded
- ✅ **Calendar icon becomes ENABLED (blue and clickable)**
- Can now schedule the job

**If no response after 2nd reminder:**
- Status → `'expired'`
- `expired_at` timestamp recorded
- Quote marked as lost opportunity

## Future Enhancements (TODO)

### Automatic Status Updates
```tsx
// Automatically move quotes through workflow based on time
- Draft → Sent: Manual action
- Sent → Reminder 1: After 3 days
- Reminder 1 → Reminder 2: After 3 more days
- Reminder 2 → Expired: After 7 days
```

### Status Update UI
Add dropdown/buttons to manually update status:
```tsx
<Select value={status} onValueChange={updateStatus}>
  <SelectItem value="sent">Mark as Sent</SelectItem>
  <SelectItem value="reminder_1">Send 1st Reminder</SelectItem>
  <SelectItem value="accepted">Mark as Accepted</SelectItem>
</Select>
```

### Email Integration
- Auto-send reminders based on status
- Track email opens/clicks
- Update status automatically

### Analytics Dashboard
- Count quotes by status
- Average time in each stage
- Conversion rates
- Follow-up success metrics

## Testing Checklist

### After Migration
- [x] Run migration in Supabase Dashboard
- [ ] Verify `followup_status` column exists
- [ ] Check existing quotes have default 'draft' status

### Visual Testing
- [ ] Open leads page
- [ ] Check quote badges show with correct colors
- [ ] Hover over calendar icon on non-accepted quote (should be grayed)
- [ ] Hover over calendar icon on accepted quote (should be blue/clickable)
- [ ] Click calendar on accepted quote (should work)
- [ ] Try clicking calendar on draft quote (should be disabled)

### Status Badge Testing
- [ ] Create new quote → Should show gray "Draft" badge
- [ ] Update status to "sent" → Should show blue "Sent" badge
- [ ] Update to "reminder_1" → Should show yellow "1st Reminder" badge
- [ ] Update to "accepted" → Should show green "Accepted" badge + enable calendar

## Migration SQL

```sql
-- Add follow-up status tracking
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS followup_status TEXT DEFAULT 'draft' 
CHECK (followup_status IN (
  'draft', 'sent', 'reminder_1', 'reminder_2', 'expired', 'accepted'
));

-- Add timestamp columns
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS reminder_1_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_2_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_quotes_followup_status 
ON quotes(followup_status);
```

---

**Status:** ✅ Ready to Test (After Migration)  
**Files Created:** 2 new files, 1 migration, 1 component updated  
**Impact:** Better quote tracking, clearer follow-up process, conditional scheduling  
**Next Step:** Apply migration and reload browser
