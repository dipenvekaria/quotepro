-- Migration 016: Add job_name field for work items
-- This field will be auto-populated by AI when saving a lead, but remains editable

-- Add job_name column to quotes table
ALTER TABLE quotes ADD COLUMN job_name TEXT;

-- Create index for searching by job name
CREATE INDEX idx_quotes_job_name ON quotes(job_name);

-- Add comment to explain the column
COMMENT ON COLUMN quotes.job_name IS 'AI-generated job name that is auto-populated on save but remains editable throughout the work item lifecycle';
