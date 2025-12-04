-- Add new quote statuses and scheduling timestamps
-- Migration: 014_add_acceptance_and_scheduling

-- Step 1: Add new timestamp columns for tracking acceptance, scheduling, and completion
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update the status CHECK constraint to include 'accepted' and 'declined'
-- First, drop the existing constraint if it exists
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

-- Add new constraint with all status values
ALTER TABLE quotes 
ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'sent', 'accepted', 'signed', 'declined'));

-- Step 3: Create indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_quotes_accepted_at ON quotes(accepted_at);
CREATE INDEX IF NOT EXISTS idx_quotes_scheduled_at ON quotes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_quotes_completed_at ON quotes(completed_at);

-- Step 4: Add index for filtering jobs to be scheduled (accepted or signed, but no scheduled_at)
CREATE INDEX IF NOT EXISTS idx_quotes_to_be_scheduled 
ON quotes(status, scheduled_at) 
WHERE status IN ('accepted', 'signed') AND scheduled_at IS NULL;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN quotes.accepted_at IS 'Timestamp when customer accepted the quote (without signature fallback)';
COMMENT ON COLUMN quotes.scheduled_at IS 'Timestamp when the job was scheduled with a specific date/time';
COMMENT ON COLUMN quotes.completed_at IS 'Timestamp when the job was completed';

-- Step 6: Backfill accepted_at for existing 'signed' quotes (they were implicitly accepted)
UPDATE quotes 
SET accepted_at = signed_at 
WHERE status = 'signed' AND accepted_at IS NULL AND signed_at IS NOT NULL;

