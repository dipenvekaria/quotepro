# Lead Workflow - Phase 2 Implementation Guide

**Quick reference for completing the remaining automation tasks**

---

## 🎯 Critical Path (Do These in Order)

### 1. Run the Database Migration

**In Supabase SQL Editor:**
```sql
-- Copy entire contents of:
supabase/migrations/011_add_lead_workflow.sql

-- Paste and execute

-- Verify:
SELECT lead_status, COUNT(*) 
FROM quotes 
GROUP BY lead_status;

-- Should show: most quotes with 'quoted', signed ones with 'signed'
```

---

### 2. Update Quote Editor to Auto-Update lead_status

**File**: `/src/app/quotes/new/page.tsx` (or wherever quote save logic lives)

**Find**: The quote save/update function  
**Add**: After successful save:

```typescript
// After quote is saved to database
if (quoteId) {
  // Update lead_status to 'quoted' when quote is created/saved
  await supabase
    .from('quotes')
    .update({ lead_status: 'quoted' })
    .eq('id', quoteId)
}
```

**Also handle**: Pre-filling customer info when URL has `?id={leadId}` or `?lead_id={leadId}`

---

### 3. Update SignNow Webhook

**File**: `/src/app/api/webhooks/signnow/route.ts`

**Find**: Where you update quote status to 'signed'  
**Add**: 

```typescript
// After finding the quote by signnow_document_id
const { error } = await supabase
  .from('quotes')
  .update({
    status: 'signed',
    signed_at: new Date().toISOString(),
    lead_status: 'signed',  // ← ADD THIS
    job_status: quote.job_scheduled_date ? null : 'to_schedule'  // ← ADD THIS
  })
  .eq('signnow_document_id', documentId)
```

**Logic**:
- Always set `lead_status = 'signed'`
- If `job_scheduled_date` exists → job already scheduled (shows on calendar)
- If no date → set `job_status = 'to_schedule'` (shows in To Schedule tab)

---

### 4. Update Work Tabs Filtering

**File**: `/src/components/work-calendar.tsx`

**Current**:
```typescript
const toSchedule = quotes.filter(q => q.status === 'signed' && !q.signed_at)
```

**Change to**:
```typescript
const toSchedule = quotes.filter(q => 
  q.lead_status === 'signed' && q.job_status === 'to_schedule'
)

const inProgress = quotes.filter(q => q.job_status === 'in_progress')

const completed = quotes.filter(q => q.job_status === 'completed')

const readyForPayment = quotes.filter(q => 
  q.job_status === 'completed' && q.payment_status === 'pending'
)
```

**Update Tab Labels**:
```typescript
<TabsTrigger value="pending-payment" className="gap-2">
  <DollarSign className="h-4 w-4" />
  <span className="hidden sm:inline">Ready for Payment</span>
```

---

### 5. Install Shadcn Calendar Component

```bash
npx shadcn-ui@latest add calendar
```

Then update `/src/components/work-calendar.tsx`:

**Replace**:
```tsx
<div className="text-center py-12 text-muted-foreground">
  <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-50" />
  <p className="font-medium">Calendar View Coming Soon</p>
  ...
</div>
```

**With**:
```tsx
import { Calendar } from '@/components/ui/calendar'

// In component:
const [date, setDate] = useState<Date | undefined>(new Date())

// Calendar events
const quoteVisits = quotes.filter(q => q.quote_visit_date)
const jobs = quotes.filter(q => q.job_scheduled_date)

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
  modifiers={{
    quoteVisit: quoteVisits.map(q => new Date(q.quote_visit_date)),
    job: jobs.map(q => new Date(q.job_scheduled_date))
  }}
  modifiersStyles={{
    quoteVisit: { backgroundColor: '#FF6200', color: 'white' },  // Orange
    job: { backgroundColor: '#22c55e', color: 'white' }          // Green
  }}
/>
```

---

### 6. Handle Quote Visit Scheduling

**File**: `/src/app/quotes/new/page.tsx`

**Check for**: `?schedule_visit=true` URL param

**Add UI**:
```tsx
const searchParams = useSearchParams()
const isSchedulingVisit = searchParams.get('schedule_visit') === 'true'

{isSchedulingVisit && (
  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
    <h3 className="font-semibold text-orange-900 mb-2">
      Schedule Quote Visit
    </h3>
    <Label htmlFor="quote_visit_date">Visit Date & Time</Label>
    <Input
      type="datetime-local"
      id="quote_visit_date"
      value={quoteVisitDate}
      onChange={(e) => setQuoteVisitDate(e.target.value)}
    />
  </div>
)}
```

**On Save**:
```typescript
if (quoteVisitDate) {
  await supabase
    .from('quotes')
    .update({
      quote_visit_date: quoteVisitDate,
      lead_status: 'quote_visit_scheduled'
    })
    .eq('id', quoteId)
}
```

---

### 7. Make Calendar Events Clickable

**File**: `/src/components/work-calendar.tsx`

**Add**:
```tsx
const [selectedEvent, setSelectedEvent] = useState<Quote | null>(null)

<Calendar
  // ... existing props
  onDayClick={(day) => {
    // Find quote visit on this day
    const visit = quoteVisits.find(q => 
      isSameDay(new Date(q.quote_visit_date), day)
    )
    
    // Or find job on this day
    const job = jobs.find(q => 
      isSameDay(new Date(q.job_scheduled_date), day)
    )
    
    if (visit || job) {
      setSelectedEvent(visit || job)
    }
  }}
/>

{selectedEvent && (
  <Card className="mt-4">
    <CardHeader>
      <CardTitle>{selectedEvent.customer_name}</CardTitle>
      <CardDescription>
        {selectedEvent.quote_visit_date ? 'Quote Visit' : 'Job'}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <p>Total: ${selectedEvent.total.toLocaleString()}</p>
        {selectedEvent.quote_visit_date && (
          <Button asChild className="w-full">
            <Link href={`/quotes/new?id=${selectedEvent.id}`}>
              Create Quote
            </Link>
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

---

## 🧪 Testing Script

Run this after each implementation step:

### After Migration
```bash
# Test lead creation
1. Click + button
2. Select "New Lead"
3. Fill: Name="Test Lead", Phone="555-1234"
4. Submit
5. Navigate to Leads tab
6. Verify lead appears with "New" badge
```

### After Quote Editor Update
```bash
1. Open lead from Leads tab
2. Click "Create Quote"
3. Generate quote with AI
4. Save quote
5. Navigate to Leads & Quotes
6. Verify lead moved to Quotes tab
7. Badge should show "Quoted"
```

### After SignNow Webhook Update
```bash
1. Create test quote
2. Send to customer (or use test SignNow account)
3. Sign the quote
4. Wait for webhook (check logs)
5. Refresh Work page
6. Verify quote appears in "To Schedule" tab
7. Lead status should be "Signed"
```

### After Calendar Implementation
```bash
1. Create lead with quote visit scheduled
2. Navigate to Work → Calendar
3. Verify orange dot on visit date
4. Sign a quote
5. Verify green dot appears for job
6. Click dots → correct record opens
```

---

## ⚠️ Common Issues & Solutions

### Issue: TypeScript errors after migration
**Solution**: Restart TypeScript server:
```bash
# In VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: lead_status not updating
**Solution**: Check if transaction is committed:
```typescript
const { error } = await supabase...
if (error) {
  console.error('Failed to update lead_status:', error)
  return
}
console.log('✅ Lead status updated!')
```

### Issue: Calendar not showing events
**Solution**: Verify date format:
```typescript
// Make sure dates are valid Date objects
const visitDate = new Date(quote.quote_visit_date)
if (isNaN(visitDate.getTime())) {
  console.error('Invalid date:', quote.quote_visit_date)
}
```

### Issue: Webhook not firing
**Solution**: Check SignNow webhook URL is correct:
```
https://yourdomain.com/api/webhooks/signnow
```

---

## 📋 Checklist Before Going Live

- [ ] Migration executed successfully in Supabase
- [ ] All TypeScript errors resolved
- [ ] Lead creation tested (new → contacted → visit scheduled)
- [ ] Quote creation updates lead_status to 'quoted'
- [ ] SignNow webhook updates lead_status to 'signed'
- [ ] Calendar shows orange events (quote visits)
- [ ] Calendar shows green events (jobs)
- [ ] Work tabs filter correctly
- [ ] All existing features still work (AI, PDF, etc.)
- [ ] Mobile testing completed
- [ ] Desktop testing completed

---

## 🚀 Quick Deploy

```bash
# After all changes made
git add .
git commit -m "feat: complete lead workflow implementation (Phase 2)"
git push origin main

# Monitor deployment
# Check Vercel logs
# Test in production immediately
```

---

## 💪 You Got This!

The hard part (architecture) is done. Phase 2 is just connecting the dots:
1. Run migration ✅
2. Add 3-4 lines to quote save ✅
3. Add 3-4 lines to SignNow webhook ✅
4. Update filtering logic ✅
5. Install calendar component ✅

**Total time: ~2-3 hours of focused work.**

Then you'll have a complete contractor workflow system that actually works the way contractors think! 🎉
