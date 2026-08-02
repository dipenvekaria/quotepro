-- Add PDF URL column to quotes table

-- Add column for storing the generated PDF URL
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_pdf_url 
ON quotes(pdf_url) 
WHERE pdf_url IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN quotes.pdf_url IS 'Public URL to the generated PDF in Supabase Storage (quotes/{quote_id}/quote.pdf)';
