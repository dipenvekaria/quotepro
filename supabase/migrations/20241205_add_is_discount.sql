-- Add missing is_discount column to quote_items if it doesn't exist
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS is_discount BOOLEAN DEFAULT false;
