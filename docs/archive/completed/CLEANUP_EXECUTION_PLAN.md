# QUOTEPRO DATABASE CLEANUP - EXECUTION PLAN

## 🚨 DO NOT RUN SQL YET - FIX CODE FIRST

---

## **CURRENT STATE ANALYSIS**

### ✅ **SAFE - Already Using work_items:**
- `work_items` table exists with proper RLS policies
- `quote_items` table has correct FK to `work_items.id`
- Most of codebase migrated successfully

### ❌ **DEPRECATED TABLES STILL IN DATABASE:**
```
leads          (has 5 RLS policies, referenced by quotes FK)
quotes         (has 4 RLS policies, referenced by jobs FK, quote_options FK)
jobs           (has 4 RLS policies, referenced by invoices FK)
invoices       (has 4 RLS policies, referenced by payments FK)
payments       (has 2 RLS policies, references invoices FK)
quote_options  (has 2 RLS policies, references quotes FK)
```

### ❌ **BROKEN VIEWS (reference old tables):**
```
activity_feed_view       → uses leads, quotes, jobs, invoices
customer_overview_view   → uses leads, quotes, jobs, invoices
invoice_summary_view     → uses jobs, invoices, payments
job_schedule_view        → uses jobs, quotes
quote_details_view       → uses quotes, leads, quote_items
```

### ❌ **CODE STILL USING OLD TABLES (MUST FIX FIRST):**

**File 1: `src/hooks/useLeadsQueue.ts`**
- Line 75: `.from('leads')`
- Line 82: `.from('leads')`
- **Fix**: Change to `.from('work_items').eq('status', 'lead')`

**File 2: `src/app/api/quotes/[id]/generate-pdf/route.ts`**
- Line 166: `.from('quotes')`
- Line 179: `.from('quotes')`
- Line 185: `.from('quotes')`
- **Fix**: Change to `.from('work_items')`

**File 3: `src/lib/dashboard-context.tsx`**
- Line 123: `.from('quotes')`
- **Fix**: Change to `.from('work_items')`

**File 4: `src/app/(dashboard)/layout.tsx`**
- Line 57: `.from('quotes')`
- **Fix**: Change to `.from('work_items')`

**Python Backend: ALL VIEWS BROKEN**
- `python-backend/services/rag/retriever.py` uses:
  - `quote_details_view` (lines 71, 128)
  - `customer_overview_view` (line 116)
  - `job_schedule_view` (line 140)
- **These will work AFTER running SQL (views get recreated)**

---

## **EXECUTION SEQUENCE**

### **PHASE 1: FIX CODE (DO THIS FIRST)**

1. ✅ Fix `useLeadsQueue.ts` → change `leads` to `work_items`
2. ✅ Fix `generate-pdf/route.ts` → change `quotes` to `work_items`
3. ✅ Fix `dashboard-context.tsx` → change `quotes` to `work_items`
4. ✅ Fix `layout.tsx` → change `quotes` to `work_items`
5. ✅ Test frontend to ensure no errors

### **PHASE 2: RUN SQL CLEANUP**

1. ⚠️ **BACKUP DATABASE FIRST** (Supabase → Database → Backups)
2. ✅ Run `SCHEMA_CLEANUP_PLAN.sql` in Supabase SQL Editor
3. ✅ Verify queries at end of SQL file show:
   - 0 rows for old tables check
   - Count > 0 for work_items
   - 4 views exist (activity_feed_view, ai_analytics_summary, customer_overview_view, quote_details_view)

### **PHASE 3: TEST EVERYTHING**

1. ✅ Test leads page (should still load leads from work_items)
2. ✅ Test quotes page (should still load quotes from work_items)
3. ✅ Test PDF generation (should work with work_items)
4. ✅ Test Python backend AI features (views should work)

---

## **WHAT GETS DELETED**

### **Tables (6):**
- `leads` - replaced by `work_items` (status = 'lead')
- `quotes` - replaced by `work_items` (status IN 'draft','sent','accepted')
- `jobs` - replaced by `work_items` (status IN 'scheduled','in_progress','completed')
- `invoices` - **NOT IMPLEMENTED in current code** (feature removed)
- `payments` - **NOT IMPLEMENTED in current code** (feature removed)
- `quote_options` - **NOT USED in current code**

### **Views (2 dropped, 3 recreated, 1 kept):**
- ❌ `invoice_summary_view` - DROPPED (invoices feature removed)
- ❌ `job_schedule_view` - DROPPED (uses old jobs table structure)
- ✅ `activity_feed_view` - RECREATED (using work_items)
- ✅ `customer_overview_view` - RECREATED (using work_items)
- ✅ `quote_details_view` - RECREATED (using work_items)
- ✅ `ai_analytics_summary` - KEPT AS-IS (doesn't use old tables)

---

## **IMPACT ASSESSMENT**

### **✅ SAFE - No data loss:**
- All active data is in `work_items` table (migrated Dec 5)
- Old tables `leads`, `quotes`, `jobs` are empty or contain stale data
- Code already using `work_items` for all CRUD operations

### **⚠️ FEATURES PERMANENTLY REMOVED:**
- Invoices/Payments system (not in current codebase)
- Job-specific scheduling views (work_items handles this)
- Quote options/tiers (not used in current UI)

### **✅ FEATURES PRESERVED:**
- All lead management (work_items status='lead')
- All quote generation (work_items status='draft'/'sent'/'accepted')
- All job scheduling (work_items status='scheduled'/'in_progress'/'completed')
- AI quote generation and RAG search
- Customer management
- Activity logging

---

## **READY TO PROCEED?**

**Next step**: Say "fix code now" and I'll update the 4 TypeScript files.
**After code fixes**: Say "run sql cleanup" and I'll guide you through database changes.
