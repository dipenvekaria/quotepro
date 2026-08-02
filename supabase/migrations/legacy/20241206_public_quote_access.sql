-- Add public access policy for work_items (for /q/{id} public quote viewer)
-- Allows anonymous users to view quotes that have been sent (status not 'lead' or 'draft')

-- Public can view sent quotes by ID
CREATE POLICY "Public can view sent quotes" ON work_items
  FOR SELECT USING (
    status NOT IN ('lead', 'draft')
  );

-- Also need public access to quote_items for the same quotes
CREATE POLICY "Public can view quote items for sent quotes" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM work_items w 
      WHERE w.id = quote_items.quote_id 
      AND w.status NOT IN ('lead', 'draft')
    )
  );

-- Public access to companies (for logo and info on public quote page)
CREATE POLICY "Public can view companies" ON companies
  FOR SELECT USING (true);

-- Public access to customers for quotes they're viewing
CREATE POLICY "Public can view customers for sent quotes" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM work_items w 
      WHERE w.customer_id = customers.id 
      AND w.status NOT IN ('lead', 'draft')
    )
  );

-- Public access to customer addresses
CREATE POLICY "Public can view addresses for sent quotes" ON customer_addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM work_items w 
      WHERE w.customer_id = customer_addresses.customer_id 
      AND w.status NOT IN ('lead', 'draft')
    )
  );
