-- Add follow-up status tracking for quotes
-- This tracks the customer follow-up journey separate from the basic status

-- Add new column for follow-up status
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS followup_status TEXT DEFAULT 'draft' 
CHECK (followup_status IN (
  'draft',
  'sent',
  'reminder_1',
  'reminder_2',
  'expired',
  'accepted'
));

-- Add columns to track when reminders were sent
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS reminder_1_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_2_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Add index for filtering by followup status
CREATE INDEX IF NOT EXISTS idx_quotes_followup_status ON quotes(followup_status);

-- Comment for clarity
COMMENT ON COLUMN quotes.followup_status IS 'Tracks customer follow-up journey: draft -> sent -> reminder_1 -> reminder_2 -> expired/accepted';
COMMENT ON COLUMN quotes.reminder_1_sent_at IS 'Timestamp when first reminder was sent';
COMMENT ON COLUMN quotes.reminder_2_sent_at IS 'Timestamp when second reminder was sent';
COMMENT ON COLUMN quotes.accepted_at IS 'Timestamp when customer accepted the quote';
COMMENT ON COLUMN quotes.expired_at IS 'Timestamp when quote was marked as expired';
