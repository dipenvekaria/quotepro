-- Fix RLS policies for quotes to properly allow both company owners and team members
-- The issue is with the LEFT JOIN not working correctly for company owners without team_members records

-- Drop existing policies
DROP POLICY IF EXISTS "Team members can create quotes" ON quotes;
DROP POLICY IF EXISTS "Team members can view quotes" ON quotes;
DROP POLICY IF EXISTS "Team members can update quotes" ON quotes;

-- Create fixed policies that check company ownership OR team membership separately
CREATE POLICY "Team members can view quotes" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = quotes.company_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.company_id = quotes.company_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create quotes" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = quotes.company_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.company_id = quotes.company_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quotes" ON quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = quotes.company_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.company_id = quotes.company_id 
      AND tm.user_id = auth.uid()
    )
  );

-- Also fix quote_items policies
DROP POLICY IF EXISTS "Team members can view quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can create quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can update quote items" ON quote_items;
DROP POLICY IF EXISTS "Team members can delete quote items" ON quote_items;

CREATE POLICY "Team members can view quote items" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN team_members tm ON tm.company_id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create quote items" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN team_members tm ON tm.company_id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quote items" ON quote_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN team_members tm ON tm.company_id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete quote items" ON quote_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN companies c ON c.id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN team_members tm ON tm.company_id = q.company_id
      WHERE q.id = quote_items.quote_id 
      AND tm.user_id = auth.uid()
    )
  );
