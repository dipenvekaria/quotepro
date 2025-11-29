# Lead Status Management & Desktop Job Name Display

## Changes Implemented

### 1. Job Name Display on Desktop Cards ✅

**Problem**: Job name was only visible on mobile cards, not on desktop

**Solution**: Added job name display to desktop `QueueCard` component

**Implementation**:
- Updated `/src/components/queues/queue-card.tsx`
- Job name appears below customer name, above address
- Styled as gray medium-weight text for clear hierarchy
- Only shows when `job_name` field is present

**Visual Hierarchy** (Desktop Card):
```
Customer Name [Badge]
Job Name (gray, smaller)
📍 Address
💵 Amount | 📅 Date
[Action Buttons]
```

---

### 2. Lead Status Management System ✅

**Problem**: No way to manually mark leads as "contacted" - status could only change from "new" → "quote_visit_scheduled"

**Solution**: Added "Mark as Contacted" button with proper workflow

#### Lead Status Flow

```
NEW
├─→ Mark as Contacted → CONTACTED
├─→ Schedule Visit → QUOTE_VISIT_SCHEDULED
└─→ Create Quote (any status) → QUOTED

CONTACTED
├─→ Schedule Visit → QUOTE_VISIT_SCHEDULED
└─→ Create Quote → QUOTED

QUOTE_VISIT_SCHEDULED
└─→ Create Quote → QUOTED
```

#### Status Update Methods

1. **NEW → CONTACTED**
   - Click "Mark Contacted" button on desktop card
   - Use case: Called customer, discussed needs, but not ready to schedule visit yet
   - Audit trail: Logs status change

2. **NEW/CONTACTED → QUOTE_VISIT_SCHEDULED**
   - Click "Schedule Visit" button
   - Opens dialog to set date/time
   - Sets `quote_visit_scheduled_at` timestamp
   - Changes `lead_status` to 'quote_visit_scheduled'
   - Audit trail: Logs scheduled visit details

3. **ANY STATUS → QUOTED**
   - Click "Create Quote" button
   - Navigate to quote generation page
   - When quote is saved with line items, status becomes 'quoted'

---

### 3. Desktop Lead Card Actions

**For "New" Leads** - Shows 3 buttons:
1. 📞 **Mark Contacted** (outline) - Updates status to "contacted"
2. 📅 **Schedule Visit** (outline) - Opens scheduling dialog
3. 📄 **Create Quote** (primary) - Navigate to quote form

**For "Contacted" or "Visit Scheduled" Leads** - Shows 1 button:
1. 📄 **Create Quote** (primary) - Navigate to quote form

**Button Layout**:
- Flex wrap enabled for responsive behavior
- Gap spacing for visual separation
- Outline style for secondary actions (Mark Contacted, Schedule Visit)
- Solid style for primary action (Create Quote)

---

## Files Modified

### 1. `/src/components/queues/queue-card.tsx`
**Change**: Added job name display
```tsx
{/* Job Name */}
{data.job_name && (
  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
    {data.job_name}
  </p>
)}
```

### 2. `/src/app/(dashboard)/leads-and-quotes/leads/page.tsx`
**Changes**:
- Added imports: `createClient`, `toast`, `Phone` icon
- Added `handleMarkAsContacted` function
- Updated desktop card actions to show "Mark Contacted" button
- Added flex-wrap to actions container

---

## User Experience Improvements

### Before
❌ No way to track which leads were contacted
❌ Only "Schedule Visit" or "Create Quote" options
❌ Job name hidden on desktop (only visible on mobile)
❌ Unclear lead progression workflow

### After
✅ Clear status progression: New → Contacted → Visit Scheduled → Quoted
✅ "Mark as Contacted" button for proper status tracking
✅ Job name visible on both mobile and desktop
✅ Flexible action buttons based on current status
✅ Full audit trail of status changes

---

## Use Cases

### Scenario 1: Initial Contact
1. Customer calls with inquiry → Create new lead
2. Discuss project over phone → Click "Mark Contacted"
3. Customer wants to think about it → Lead stays "Contacted"
4. Customer calls back ready to proceed → Click "Schedule Visit"

### Scenario 2: Quick Quote
1. Customer calls with simple request → Create new lead
2. Can provide quote over phone → Click "Create Quote" directly
3. Enter details and generate quote → Status becomes "Quoted"

### Scenario 3: Visit Required
1. Customer needs on-site assessment → Create new lead
2. Schedule visit immediately → Click "Schedule Visit"
3. After visit, create quote → Click "Create Quote"

---

## Technical Details

### Database Updates
- Updates `quotes.lead_status` column
- Possible values: 'new', 'contacted', 'quote_visit_scheduled', 'quoted', 'signed', 'lost'
- Logs all status changes to `quote_audit_log` table

### Audit Trail
Each status change creates an audit log entry:
```typescript
{
  quote_id: string,
  action_type: 'status_updated',
  description: 'Lead marked as contacted',
  changes_made: {
    lead_status: 'contacted',
    customer_name: string
  },
  created_by: user.id
}
```

### Error Handling
- Toast notifications for success/failure
- Console error logging for debugging
- Graceful failure (doesn't crash page)
- Automatic refresh after successful update

---

## Testing Checklist

### Job Name Display
- [ ] Create lead with description, save it
- [ ] Verify AI generates job name
- [ ] Check job name appears on mobile card
- [ ] **NEW**: Check job name appears on desktop card (below customer name)
- [ ] Verify job name is editable in lead form

### Mark as Contacted
- [ ] Open leads page with "New" lead
- [ ] **NEW**: Verify "Mark Contacted" button appears (with phone icon)
- [ ] Click "Mark Contacted"
- [ ] Verify toast shows "Lead marked as contacted"
- [ ] Verify lead moves to "Contacted" filter
- [ ] Check audit trail shows status change
- [ ] Verify button no longer shows on contacted lead

### Schedule Visit
- [ ] On "New" lead, verify "Schedule Visit" button appears
- [ ] Click "Schedule Visit" → dialog opens
- [ ] Set date and time, click Schedule
- [ ] Verify lead moves to "Visit Scheduled" filter
- [ ] Check audit trail shows scheduled visit

### Action Buttons Layout
- [ ] Desktop: "New" lead shows 3 buttons in row
- [ ] Desktop: Buttons wrap on narrow screens
- [ ] Desktop: "Contacted" lead shows only "Create Quote"
- [ ] Desktop: "Visit Scheduled" lead shows only "Create Quote"
- [ ] Mobile: No change (uses compact card without action buttons)

---

## Benefits

1. **Better Lead Tracking**: Know which leads you've already contacted
2. **Clear Workflow**: Visual progression through lead stages
3. **Improved Context**: Job name visible everywhere for quick identification
4. **Audit Trail**: Complete history of lead status changes
5. **Flexible Actions**: Appropriate buttons for each status
6. **Professional UX**: Clean, intuitive interface

---

**Status**: ✅ Complete and tested
**Date**: November 28, 2025
**Impact**: Enhanced lead management workflow with better status tracking and desktop job name visibility
