-- Add archive columns to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Add index for filtering archived quotes
CREATE INDEX IF NOT EXISTS idx_quotes_archived_at ON quotes(archived_at) WHERE archived_at IS NOT NULL;
