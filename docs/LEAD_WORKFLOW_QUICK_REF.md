# Lead Workflow - Quick Reference

## 📊 What Changed

### Before (Prospects)
```
Single page with all quotes mixed together
No lead tracking before quote created
Manual workflow management
```

### After (Leads & Quotes)
```
Leads tab → Everything before quote (new/contacted/visit scheduled)
Quotes tab → Everything after quote (quoted/signed/lost)
Automated workflow: Lead → Visit → Quote → Job → Payment
```

---

## 🎯 New Workflow

```
Phone Call → "+ New Lead" → Lead captured (status: new)
           ↓
       "Schedule Visit" → Visit scheduled (status: quote_visit_scheduled)
           ↓                                    ↓
       Calendar shows ORANGE event    Field tech clicks event
           ↓
     "Create Quote" → Quote saved (status: quoted)
           ↓
     Customer signs → Job created (status: signed)
           ↓
     Calendar shows GREEN event → Work tabs (to schedule/in progress/completed)
```

---

## 🗂️ Database Schema (New Columns)

| Column | Type | Values | Purpose |
|--------|------|--------|---------|
| `lead_status` | enum | new, contacted, quote_visit_scheduled, quoted, signed, lost | Tracks lead through pipeline |
| `quote_visit_date` | timestamptz | Date/time | When to visit customer (orange calendar event) |
| `job_scheduled_date` | timestamptz | Date/time | When job starts (green calendar event) |
| `job_status` | text | to_schedule, in_progress, completed | Current job stage |
| `payment_status` | text | pending, sent, received | Payment tracking |

---

## 🎨 New Components

### NewLeadDialog
- **Path**: `/src/components/new-lead-dialog.tsx`
- **Purpose**: Quick lead capture from phone calls
- **Fields**: Name*, Phone*, Email, Address, Notes
- **Creates**: Quote record with `lead_status='new'`

### LeadsAndQuotes
- **Path**: `/src/components/leads-and-quotes.tsx`
- **Purpose**: Split view of leads vs quotes
- **Tabs**: Leads | Quotes
- **Features**: Status badges, action buttons, smart filtering

### NewActionMenu
- **Path**: `/src/components/new-action-menu.tsx`
- **Purpose**: Replace single "+ New Quote" button
- **Options**: New Lead | Schedule Visit | Create Quote
- **Responsive**: Mobile FAB + Desktop sidebar

---

## 📁 File Changes

### Created (7 files)
```
supabase/migrations/011_add_lead_workflow.sql
src/app/(dashboard)/leads/page.tsx
src/components/new-lead-dialog.tsx
src/components/leads-and-quotes.tsx
src/components/new-action-menu.tsx
docs/LEAD_WORKFLOW_REFACTOR.md
docs/LEAD_WORKFLOW_PHASE_2.md
```

### Modified (4 files)
```
src/app/(dashboard)/layout.tsx          # Pass companyId
src/app/(dashboard)/prospects/page.tsx  # Redirect to /leads
src/app/page.tsx                        # OAuth → /leads
src/components/dashboard-navigation.tsx # "Leads & Quotes" + menu
```

---

## ✅ Phase 1 Complete

- [x] Database migration created
- [x] New Lead capture form
- [x] Leads & Quotes split view
- [x] New Action Menu (3 options)
- [x] Navigation updates (/leads route)
- [x] Backward compatibility (/prospects redirect)
- [x] Documentation (2 comprehensive guides)

---

## 🚧 Phase 2 TODO

### Critical Path (Do in Order):

1. **Run Migration** (5 min)
   - Open Supabase SQL Editor
   - Execute `011_add_lead_workflow.sql`
   - Verify: `SELECT lead_status, COUNT(*) FROM quotes GROUP BY lead_status;`

2. **Quote Editor** (30 min)
   - Auto-set `lead_status='quoted'` on save
   - Handle `?schedule_visit=true` param
   - Pre-fill customer info from `?lead_id` param

3. **SignNow Webhook** (15 min)
   - Set `lead_status='signed'` when customer signs
   - Set `job_status='to_schedule'` if no date
   - Auto-create job events

4. **Calendar Component** (1 hour)
   - Install: `npx shadcn-ui@latest add calendar`
   - Show orange events (quote visits)
   - Show green events (jobs)
   - Make events clickable

5. **Work Tabs** (30 min)
   - Update filtering logic (use `job_status`)
   - Rename tabs (add "Ready for Payment")
   - Test all filters

---

## 🧪 Quick Test

```bash
# After Phase 1 (can test now)
1. Click + button → Menu appears ✅
2. Select "New Lead" → Dialog opens ✅
3. Navigate /leads → Page loads ✅
4. Navigate /prospects → Redirects to /leads ✅

# After Phase 2 (requires migration)
1. Create lead → Appears in Leads tab
2. Schedule visit → Shows on calendar (orange)
3. Create quote → Moves to Quotes tab
4. Customer signs → Job appears (green)
5. Move job → In Progress → Completed → Payment
```

---

## 🎯 Success Criteria

### The New Reality
- Lead captured in 30 seconds (down from never tracked)
- Every phone call logged (0% lost leads)
- Auto calendar events (no manual entry)
- Clear pipeline visibility (Leads vs Quotes)
- Natural contractor workflow (matches their thinking)

---

## 📚 Full Documentation

- **Complete Guide**: `/docs/LEAD_WORKFLOW_REFACTOR.md`
- **Implementation Steps**: `/docs/LEAD_WORKFLOW_PHASE_2.md`
- **This Quick Ref**: `/docs/LEAD_WORKFLOW_QUICK_REF.md`

---

## 🚀 Next Action

**Option A** (Ready to go live):
```bash
# Run migration in Supabase
# Then complete Phase 2 tasks (2-3 hours)
```

**Option B** (Test Phase 1 first):
```bash
npm run dev
# Navigate to http://localhost:3000/leads
# Test: Create lead (will error - expected)
# Test: Navigation, menu, UI components
```

---

**Built for contractors, by developers who listen.** 🛠️
