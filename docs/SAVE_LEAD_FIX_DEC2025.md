# Save Lead Fix + Database Migration - Dec 2025

## Issues Fixed

### 1. Save Lead Button Not Visible ✅
**Problem:** Button hidden when editing existing leads  
**Fix:** Changed condition from `!savedQuoteId && !quoteId && !generatedQuote` to just `!generatedQuote`  
**Result:** Button now shows for both new and existing leads

### 2. Save Lead Doesn't Redirect ✅
**Problem:** After saving, stayed on form  
**Fix:** Added `router.push('/leads-and-quotes/leads')` after both create and update  
**Result:** Saves and returns to leads list with fresh data

### 3. Missing job_type Column ❌ REQUIRES MIGRATION
**Problem:** Database error: `Could not find the 'job_type' column of 'quotes' in the schema cache`  
**Fix:** Created migration to add column  
**Action Required:** Apply migration (see below)

## 🚨 APPLY THIS MIGRATION NOW

Go to Supabase SQL Editor and run:

```sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS job_type TEXT;
CREATE INDEX IF NOT EXISTS idx_quotes_job_type ON quotes(job_type);
COMMENT ON COLUMN quotes.job_type IS 'AI-generated job type/category for the lead/quote';
```

**Link:** https://ajljduisjyutbgjeucig.supabase.co/project/ajljduisjyutbgjeucig/sql/new

## Files Changed

- `src/app/(dashboard)/leads/new/page.tsx` - Fixed button visibility and redirect
- `supabase/migrations/20251202_add_job_type_column.sql` - Migration file
- `APPLY_JOB_TYPE_MIGRATION.md` - Migration instructions

## After Migration

1. Refresh app
2. Create or edit a lead
3. Fill in customer name and description
4. Click "Save Lead"
5. Should save and redirect to leads list ✅

## Cleanup Scripts Created

Also created scripts to clean work items:
- `scripts/clean-work-items.sql` - SQL to delete all quotes/leads
- `scripts/clean-work-items.sh` - Interactive cleanup script
- `scripts/README.md` - Usage instructions

Run `./scripts/clean-work-items.sh` to reset all work items while preserving companies.
