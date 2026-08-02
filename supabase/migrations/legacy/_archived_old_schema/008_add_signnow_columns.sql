-- Update signed_documents table for SignNow integration

-- Add new columns for SignNow
ALTER TABLE signed_documents
ADD COLUMN IF NOT EXISTS signnow_document_id TEXT,
ADD COLUMN IF NOT EXISTS signnow_invite_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signed_documents_signnow_doc_id 
ON signed_documents(signnow_document_id);

CREATE INDEX IF NOT EXISTS idx_signed_documents_signnow_invite_id 
ON signed_documents(signnow_invite_id);

-- Add comment explaining the migration
COMMENT ON COLUMN signed_documents.signnow_document_id IS 'SignNow document ID for the uploaded PDF';
COMMENT ON COLUMN signed_documents.signnow_invite_id IS 'SignNow invitation ID for signature request';
COMMENT ON COLUMN signed_documents.dropbox_signature_request_id IS 'Legacy Dropbox Sign ID (deprecated, kept for historical data)';
