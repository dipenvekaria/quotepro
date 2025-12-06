-- QUOTEPRO UNIFIED SCHEMA MIGRATION
-- Consolidates leads + quotes into single work_items table
-- Run: supabase db push OR apply via Supabase dashboard

-- ============================================================
-- 1. CREATE NEW UNIFIED TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Status: the single source of truth for workflow state
  -- lead → draft → sent → accepted → scheduled → in_progress → completed → paid
  -- Any status can → archived
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN (
    'lead',        -- New inquiry, no quote yet
    'draft',       -- Quote being created  
    'sent',        -- Quote sent to customer
    'accepted',    -- Customer accepted, needs scheduling
    'scheduled',   -- Job scheduled on calendar
    'in_progress', -- Work started
    'completed',   -- Work done, awaiting payment
    'paid',        -- Fully complete
    'archived'     -- Lost/Rejected/Cancelled
  )),
  
  -- Core info
  quote_number TEXT,
  job_name TEXT,
  description TEXT,
  
  -- Pricing
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  
  -- Timestamps for tracking progression
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_reason TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  
  -- Documents
  pdf_url TEXT,
  signed_document_url TEXT,
  customer_signature TEXT,
  
  -- Metadata (for job_type, source, urgency, etc)
  metadata JSONB DEFAULT '{}',
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CREATE INDEXES
-- ============================================================

CREATE INDEX idx_work_items_company ON work_items(company_id);
CREATE INDEX idx_work_items_customer ON work_items(customer_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_assigned_to ON work_items(assigned_to);
CREATE INDEX idx_work_items_scheduled_at ON work_items(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_work_items_created_at ON work_items(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_work_items_leads ON work_items(company_id, status) WHERE status = 'lead';
CREATE INDEX idx_work_items_quotes ON work_items(company_id, status) WHERE status IN ('draft', 'sent', 'accepted');
CREATE INDEX idx_work_items_work ON work_items(company_id, status) WHERE status IN ('scheduled', 'in_progress');

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- Users can only see work items from their company
CREATE POLICY "Users can view own company work items" ON work_items
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own company work items" ON work_items
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own company work items" ON work_items
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own company work items" ON work_items
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- 4. QUOTE ITEMS TABLE (keep separate for line items)
-- ============================================================

-- Keep existing quote_items but rename to work_item_items
-- Or just update foreign key reference

-- First check if quote_items exists and update it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items') THEN
    -- Add column for new table reference
    ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_quote_items_work_item ON quote_items(work_item_id);
  END IF;
END $$;

-- ============================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_work_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_work_items_updated_at();

-- ============================================================
-- 6. MIGRATE EXISTING DATA (optional - run if you want to keep data)
-- ============================================================

-- Migrate leads to work_items
INSERT INTO work_items (
  id, company_id, customer_id, status, description, 
  assigned_to, created_by, metadata, created_at, updated_at,
  archived_at, archived_reason
)
SELECT 
  id, company_id, customer_id, 
  CASE 
    WHEN status = 'archived' THEN 'archived'
    WHEN status = 'quoted' THEN 'draft'  -- Lead that has quote = draft
    ELSE 'lead'
  END,
  description,
  assigned_to, assigned_to, 
  COALESCE(metadata, '{}'),
  created_at, updated_at,
  archived_at, archived_reason
FROM leads
WHERE NOT EXISTS (SELECT 1 FROM work_items WHERE work_items.id = leads.id);

-- Migrate quotes to work_items (these override leads with same lead_id)
INSERT INTO work_items (
  id, company_id, customer_id, status, quote_number, job_name, description,
  subtotal, discount_amount, tax_rate, tax_amount, total, notes,
  sent_at, viewed_at, accepted_at, scheduled_at, started_at, completed_at, paid_at,
  archived_at, archived_reason,
  assigned_to, created_by, pdf_url, signed_document_url, customer_signature,
  metadata, created_at, updated_at
)
SELECT 
  id, company_id, customer_id,
  CASE 
    WHEN status = 'archived' THEN 'archived'
    WHEN status IN ('scheduled', 'completed', 'invoiced', 'paid') THEN status
    WHEN status = 'invoiced' THEN 'completed'
    WHEN status = 'signed' THEN 'accepted'
    WHEN status IN ('accepted', 'rejected', 'expired') THEN 
      CASE WHEN status = 'accepted' THEN 'accepted' ELSE 'archived' END
    WHEN status = 'viewed' THEN 'sent'
    WHEN status = 'sent' THEN 'sent'
    ELSE 'draft'
  END,
  quote_number, job_name, description,
  COALESCE(subtotal, 0), COALESCE(discount_amount, 0), COALESCE(tax_rate, 0), 
  COALESCE(tax_amount, 0), COALESCE(total, 0), notes,
  sent_at, viewed_at, accepted_at, scheduled_at, started_at, completed_at, paid_at,
  archived_at, archived_reason,
  assigned_to, created_by, pdf_url, signed_document_url, customer_signature,
  COALESCE(
    jsonb_build_object('job_type', job_type, 'followup_status', followup_status),
    '{}'
  ),
  created_at, updated_at
FROM quotes
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  quote_number = EXCLUDED.quote_number,
  job_name = EXCLUDED.job_name,
  subtotal = EXCLUDED.subtotal,
  total = EXCLUDED.total;

-- Link quote_items to work_items
UPDATE quote_items 
SET work_item_id = quote_id 
WHERE work_item_id IS NULL AND quote_id IS NOT NULL;

-- ============================================================
-- 7. CLEANUP (OPTIONAL - run after verifying migration)
-- ============================================================

-- Uncomment these after confirming data migrated correctly:
-- DROP TABLE IF EXISTS leads CASCADE;
-- DROP TABLE IF EXISTS quotes CASCADE;

