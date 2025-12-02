-- Add job_type column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS job_type TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_job_type ON quotes(job_type);

-- Add comment
COMMENT ON COLUMN quotes.job_type IS 'AI-generated job type/category for the lead/quote';
