# 🚨 URGENT: Apply Database Migration

## Problem
`job_type` column is missing from the `quotes` table, causing Save Lead to fail.

## Quick Fix (Choose One)

### Option 1: Supabase Dashboard (Easiest) ⭐

1. Go to: https://ajljduisjyutbgjeucig.supabase.co/project/ajljduisjyutbgjeucig/sql/new
2. Paste this SQL and click "Run":

```sql
-- Add job_type column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS job_type TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_job_type ON quotes(job_type);

-- Add comment
COMMENT ON COLUMN quotes.job_type IS 'AI-generated job type/category for the lead/quote';
```

3. Done! Refresh your app.

### Option 2: Using psql

If you have `psql` installed and `SUPABASE_DB_URL` in `.env.local`:

```bash
./scripts/apply-job-type-migration.sh
```

## After Migration

- Refresh your app
- Click "Save Lead" - should work now
- The `job_type` field will store AI-generated job categories

## What This Does

Adds a new `job_type` TEXT column to the `quotes` table to store AI-generated job categories like "Deck Repair", "Fence Installation", etc.
