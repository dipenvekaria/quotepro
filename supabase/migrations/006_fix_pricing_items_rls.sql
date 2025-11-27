-- Fix pricing_items RLS policy to properly handle users without team_members
-- The LEFT JOIN was causing issues when no team_members exist

DROP POLICY IF EXISTS "Team members can view pricing items" ON pricing_items;

CREATE POLICY "Team members can view pricing items" ON pricing_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = pricing_items.company_id 
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN companies c ON c.id = tm.company_id
      WHERE c.id = pricing_items.company_id 
      AND tm.user_id = auth.uid()
    )
  );
