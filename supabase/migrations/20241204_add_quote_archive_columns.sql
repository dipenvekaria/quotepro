-- Add archive columns to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Add scheduling/work columns to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_to UUID,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_signature TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add archive columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Update the quotes status constraint to include archived and other statuses
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS valid_quote_status;
ALTER TABLE quotes ADD CONSTRAINT valid_quote_status CHECK (status IN (
  'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 
  'signed', 'scheduled', 'completed', 'invoiced', 'paid', 'archived'
));

-- Update the leads status constraint to include all existing statuses
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_lead_status;
ALTER TABLE leads ADD CONSTRAINT valid_lead_status CHECK (status IN (
  'new', 'contacted', 'qualified', 'quoted', 'quote_sent', 'won', 'lost', 'archived'
));

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_quotes_archived_at ON quotes(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_scheduled_at ON quotes(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON leads(archived_at) WHERE archived_at IS NOT NULL;
