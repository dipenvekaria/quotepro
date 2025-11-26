-- Add default quote settings columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_terms TEXT,
ADD COLUMN IF NOT EXISTS default_notes TEXT,
ADD COLUMN IF NOT EXISTS default_valid_days INTEGER DEFAULT 30;
