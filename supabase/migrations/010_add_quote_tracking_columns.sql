-- Add tracking columns for quote viewing and signing

-- Add viewed_at timestamp
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Add signed_at timestamp  
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_viewed_at 
ON quotes(viewed_at) 
WHERE viewed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_signed_at 
ON quotes(signed_at) 
WHERE signed_at IS NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_quotes_status 
ON quotes(status);

-- Add comments
COMMENT ON COLUMN quotes.viewed_at IS 'Timestamp when customer first viewed the quote on /q/{id} page';
COMMENT ON COLUMN quotes.signed_at IS 'Timestamp when customer signed the quote via SignNow';
