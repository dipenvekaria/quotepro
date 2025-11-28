-- Migration 015: Add payment tracking
-- Adds paid_at column for tracking when invoices are paid

-- Add paid_at column to quotes table
ALTER TABLE quotes ADD COLUMN paid_at TIMESTAMP;

-- Create index for filtering paid/unpaid invoices
CREATE INDEX idx_quotes_payment_status ON quotes(completed_at, paid_at);

-- Add comment to explain the column
COMMENT ON COLUMN quotes.paid_at IS 'Timestamp when the invoice was marked as paid';
