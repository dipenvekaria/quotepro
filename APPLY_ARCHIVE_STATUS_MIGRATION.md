# Apply Archive Status Migration

## Quick Fix

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TYPE lead_status_enum ADD VALUE 'archived';
```

## What This Does

Adds `'archived'` as a valid value to the `lead_status_enum` type, allowing leads and quotes to be archived.

## Verification

After applying, verify with:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'lead_status_enum'::regtype 
ORDER BY enumsortorder;
```

Expected output should include: new, contacted, quote_visit_scheduled, quoted, signed, lost, **archived**

## Apply via CLI (Alternative)

```bash
supabase db push
```

This will apply migration `017_add_archived_status.sql`.
