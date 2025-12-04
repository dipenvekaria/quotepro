-- Create quote audit log table to track all changes and AI interactions
CREATE TABLE quote_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'ai_generation', 'ai_update', 'manual_edit', 'item_added', 'item_deleted', 'item_modified'
  user_prompt TEXT, -- The prompt/request from user (for AI actions)
  description TEXT, -- Human-readable description of the change
  changes_made JSONB, -- Detailed JSON of what changed
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster quote lookups
CREATE INDEX idx_quote_audit_log_quote_id ON quote_audit_log(quote_id);
CREATE INDEX idx_quote_audit_log_created_at ON quote_audit_log(created_at);

-- RLS Policies for quote_audit_log
ALTER TABLE quote_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for quotes from their company
CREATE POLICY "Users can view audit logs for their company quotes" ON quote_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      WHERE q.id = quote_audit_log.quote_id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = quote_audit_log.quote_id
      AND tm.user_id = auth.uid()
    )
  );

-- Users can insert audit logs for quotes from their company
CREATE POLICY "Users can insert audit logs for their company quotes" ON quote_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      WHERE q.id = quote_audit_log.quote_id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = quote_audit_log.quote_id
      AND tm.user_id = auth.uid()
    )
  );
