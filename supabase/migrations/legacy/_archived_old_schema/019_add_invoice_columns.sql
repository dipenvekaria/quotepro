-- Migration 019: Add invoice and payment columns to quotes table
-- Supports automated invoice generation and payment tracking

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_link_url TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create unique constraint on invoice_number
CREATE UNIQUE INDEX IF NOT EXISTS quotes_invoice_number_unique 
  ON quotes(invoice_number) 
  WHERE invoice_number IS NOT NULL;

COMMENT ON COLUMN quotes.invoice_number IS 'Unique invoice number (e.g., INV-2025-0001)';
COMMENT ON COLUMN quotes.invoice_pdf_url IS 'Supabase storage URL for generated invoice PDF';
COMMENT ON COLUMN quotes.invoice_sent_at IS 'Timestamp when invoice email was sent to customer';
COMMENT ON COLUMN quotes.payment_link_url IS 'URL to payment page (Stripe or demo)';
COMMENT ON COLUMN quotes.payment_method IS 'Payment method used: stripe, cash, check, etc.';
