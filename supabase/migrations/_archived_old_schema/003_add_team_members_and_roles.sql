-- Create role enum
CREATE TYPE user_role AS ENUM ('admin', 'sales');

-- Create team_members table (links users to companies with roles)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sales',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id) -- Prevent duplicate memberships
);

-- Create index for performance
CREATE INDEX idx_team_members_company_id ON team_members(company_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
-- Users can view team members of their company
CREATE POLICY "Users can view their company team members" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = team_members.company_id 
      AND (
        c.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.company_id = c.id 
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Only company owners and admins can insert team members
CREATE POLICY "Admins can invite team members" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = team_members.company_id 
      AND (
        c.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.company_id = c.id 
          AND tm.user_id = auth.uid()
          AND tm.role = 'admin'
        )
      )
    )
  );

-- Only company owners and admins can update team member roles
CREATE POLICY "Admins can update team member roles" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = team_members.company_id 
      AND (
        c.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.company_id = c.id 
          AND tm.user_id = auth.uid()
          AND tm.role = 'admin'
        )
      )
    )
  );

-- Only company owners and admins can remove team members
CREATE POLICY "Admins can remove team members" ON team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = team_members.company_id 
      AND (
        c.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.company_id = c.id 
          AND tm.user_id = auth.uid()
          AND tm.role = 'admin'
        )
      )
    )
  );

-- Update companies RLS to work with team_members
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;

-- Create new policies that work with team members
CREATE POLICY "Team members can view their company" ON companies
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.company_id = companies.id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update company settings
CREATE POLICY "Admins can update company settings" ON companies
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.company_id = companies.id 
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Update pricing_items RLS to work with team_members
DROP POLICY IF EXISTS "Users can view their company pricing items" ON pricing_items;
DROP POLICY IF EXISTS "Users can insert their company pricing items" ON pricing_items;
DROP POLICY IF EXISTS "Users can update their company pricing items" ON pricing_items;
DROP POLICY IF EXISTS "Users can delete their company pricing items" ON pricing_items;

CREATE POLICY "Team members can view pricing items" ON pricing_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = pricing_items.company_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

-- Only admins can manage pricing items
CREATE POLICY "Admins can insert pricing items" ON pricing_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = pricing_items.company_id 
      AND (
        c.user_id = auth.uid() OR 
        (tm.user_id = auth.uid() AND tm.role = 'admin')
      )
    )
  );

CREATE POLICY "Admins can update pricing items" ON pricing_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = pricing_items.company_id 
      AND (
        c.user_id = auth.uid() OR 
        (tm.user_id = auth.uid() AND tm.role = 'admin')
      )
    )
  );

CREATE POLICY "Admins can delete pricing items" ON pricing_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = pricing_items.company_id 
      AND (
        c.user_id = auth.uid() OR 
        (tm.user_id = auth.uid() AND tm.role = 'admin')
      )
    )
  );

-- Update quotes RLS to work with team_members (all team members can create/view quotes)
DROP POLICY IF EXISTS "Users can view their company quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert their company quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update their company quotes" ON quotes;

CREATE POLICY "Team members can view quotes" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = quotes.company_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can create quotes" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = quotes.company_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can update quotes" ON quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies c
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE c.id = quotes.company_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

-- Update quote_items RLS
DROP POLICY IF EXISTS "Users can view their quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can insert their quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can update their quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can delete their quote items" ON quote_items;

CREATE POLICY "Team members can view quote items" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = quote_items.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can insert quote items" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = quote_items.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can update quote items" ON quote_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = quote_items.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can delete quote items" ON quote_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = quote_items.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

-- Update signed_documents RLS
DROP POLICY IF EXISTS "Users can view their signed documents" ON signed_documents;
DROP POLICY IF EXISTS "Users can insert their signed documents" ON signed_documents;
DROP POLICY IF EXISTS "Users can update their signed documents" ON signed_documents;

CREATE POLICY "Team members can view signed documents" ON signed_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = signed_documents.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can insert signed documents" ON signed_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = signed_documents.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can update signed documents" ON signed_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      LEFT JOIN team_members tm ON tm.company_id = c.id
      WHERE q.id = signed_documents.quote_id 
      AND (c.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_company_admin(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies c
    LEFT JOIN team_members tm ON tm.company_id = c.id
    WHERE c.id = company_uuid
    AND (
      c.user_id = auth.uid() OR
      (tm.user_id = auth.uid() AND tm.role = 'admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in a company
CREATE OR REPLACE FUNCTION get_user_role(company_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  -- Check if user is company owner (always admin)
  IF EXISTS (SELECT 1 FROM companies WHERE id = company_uuid AND user_id = auth.uid()) THEN
    RETURN 'admin'::user_role;
  END IF;
  
  -- Check team member role
  SELECT role INTO user_role_result
  FROM team_members
  WHERE company_id = company_uuid AND user_id = auth.uid();
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
