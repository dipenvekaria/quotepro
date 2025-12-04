-- Create role enum (if not exists)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'sales');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sales',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members RLS policies
DROP POLICY IF EXISTS "Users can view their company team members" ON team_members;
CREATE POLICY "Users can view their company team members" ON team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = team_members.company_id AND c.user_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can invite team members" ON team_members;
CREATE POLICY "Admins can invite team members" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = team_members.company_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update team member roles" ON team_members;
CREATE POLICY "Admins can update team member roles" ON team_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = team_members.company_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can remove team members" ON team_members;
CREATE POLICY "Admins can remove team members" ON team_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = team_members.company_id AND c.user_id = auth.uid())
  );

-- Update quotes policies to work with team members
DROP POLICY IF EXISTS "Users can view their company quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert their company quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update their company quotes" ON quotes;
DROP POLICY IF EXISTS "Team members can view quotes" ON quotes;
DROP POLICY IF EXISTS "Team members can create quotes" ON quotes;
DROP POLICY IF EXISTS "Team members can update quotes" ON quotes;

CREATE POLICY "Team members can view quotes" ON quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = quotes.company_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.company_id = quotes.company_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can create quotes" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = quotes.company_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.company_id = quotes.company_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can update quotes" ON quotes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = quotes.company_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.company_id = quotes.company_id AND tm.user_id = auth.uid())
  );

-- Update quote_items policies
DROP POLICY IF EXISTS "Users can view their quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can insert their quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can update their quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can delete their quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can view quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can create quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can update quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can delete quote items" ON quote_items;

CREATE POLICY "Team members can view quote items" ON quote_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM quotes q JOIN companies c ON c.id = q.company_id WHERE q.id = quote_items.quote_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quotes q JOIN team_members tm ON tm.company_id = q.company_id WHERE q.id = quote_items.quote_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can create quote items" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quotes q JOIN companies c ON c.id = q.company_id WHERE q.id = quote_items.quote_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quotes q JOIN team_members tm ON tm.company_id = q.company_id WHERE q.id = quote_items.quote_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can update quote items" ON quote_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM quotes q JOIN companies c ON c.id = q.company_id WHERE q.id = quote_items.quote_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quotes q JOIN team_members tm ON tm.company_id = q.company_id WHERE q.id = quote_items.quote_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can delete quote items" ON quote_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM quotes q JOIN companies c ON c.id = q.company_id WHERE q.id = quote_items.quote_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quotes q JOIN team_members tm ON tm.company_id = q.company_id WHERE q.id = quote_items.quote_id AND tm.user_id = auth.uid())
  );
