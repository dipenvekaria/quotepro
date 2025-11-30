-- Migration 018: Add customer_signature column to quotes table
-- Stores base64 PNG signature captured on job completion

ALTER TABLE quotes ADD COLUMN customer_signature TEXT;

COMMENT ON COLUMN quotes.customer_signature IS 'Base64-encoded PNG signature captured when job is completed';
