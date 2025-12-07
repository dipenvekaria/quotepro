# Database Migration Required

## Migration 016: Add job_name field

A new database migration has been created to add the `job_name` field to the quotes table.

### File Location
`supabase/migrations/016_add_job_name.sql`

### To Apply Migration

#### Option 1: Using Supabase CLI (Recommended)
```bash
supabase db push
```

#### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/016_add_job_name.sql`
4. Copy and paste the SQL content
5. Click **Run**

#### Option 3: Manual SQL Execution
Execute the following SQL in your database:

```sql
-- Add job_name column to quotes table
ALTER TABLE quotes ADD COLUMN job_name TEXT;

-- Create index for searching by job name
CREATE INDEX idx_quotes_job_name ON quotes(job_name);

-- Add comment to explain the column
COMMENT ON COLUMN quotes.job_name IS 'AI-generated job name that is auto-populated on save but remains editable throughout the work item lifecycle';
```

### What This Migration Does
- Adds a new `job_name` column to the `quotes` table
- The column is nullable (TEXT type)
- Creates an index for efficient searching by job name
- This field will be auto-populated by AI when saving a lead but remains fully editable

### Features That Depend On This Migration
1. **Job Name Display**: Shows on mobile cards for leads and quotes
2. **AI Auto-population**: Generates concise job names from descriptions when saving leads
3. **Manual Editing**: Users can edit the job name at any time in the lead/quote form
4. **Work Item Journey**: Job name persists through all phases (lead → quote → scheduled → completed → paid)

### Verification
After applying the migration, verify by running:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'quotes' AND column_name = 'job_name';
```

Expected result:
```
column_name | data_type | is_nullable
------------|-----------|------------
job_name    | text      | YES
```
