-- Add lead workflow columns to quotes table
-- This enables the Leads → Quote Visit → Quote → Job → Payment workflow

-- Create enum type for lead status
CREATE TYPE lead_status_enum AS ENUM (
  'new',
  'contacted', 
  'quote_visit_scheduled',
  'quoted',
  'signed',
  'lost'
);

-- Add lead_status column (default to 'quoted' for existing quotes)
ALTER TABLE quotes 
ADD COLUMN lead_status lead_status_enum DEFAULT 'quoted';

-- Add quote_visit_date column for scheduling quote visits
ALTER TABLE quotes
ADD COLUMN quote_visit_date timestamptz;

-- Add job_scheduled_date column for actual job scheduling
ALTER TABLE quotes
ADD COLUMN job_scheduled_date timestamptz;

-- Add payment_status column for Ready for Payment workflow
ALTER TABLE quotes
ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'sent', 'received'));

-- Add job_status column for Work tab filtering
ALTER TABLE quotes
ADD COLUMN job_status text CHECK (job_status IN ('to_schedule', 'in_progress', 'completed'));

-- Update existing quotes based on their current status
-- If status is 'signed', set lead_status to 'signed'
UPDATE quotes 
SET lead_status = 'signed'
WHERE status = 'signed';

-- Create indexes for faster filtering
CREATE INDEX idx_quotes_lead_status ON quotes(lead_status);
CREATE INDEX idx_quotes_quote_visit_date ON quotes(quote_visit_date) WHERE quote_visit_date IS NOT NULL;
CREATE INDEX idx_quotes_job_scheduled_date ON quotes(job_scheduled_date) WHERE job_scheduled_date IS NOT NULL;
CREATE INDEX idx_quotes_job_status ON quotes(job_status) WHERE job_status IS NOT NULL;

-- Add comment explaining the workflow
COMMENT ON COLUMN quotes.lead_status IS 'Tracks the lead through: new → contacted → quote_visit_scheduled → quoted → signed → lost';
COMMENT ON COLUMN quotes.quote_visit_date IS 'When the quote visit is scheduled (shows as orange event on calendar)';
COMMENT ON COLUMN quotes.job_scheduled_date IS 'When the actual job is scheduled (shows as green event on calendar)';
COMMENT ON COLUMN quotes.job_status IS 'Current status of the job: to_schedule, in_progress, completed';
COMMENT ON COLUMN quotes.payment_status IS 'Payment status: pending, sent, received';
