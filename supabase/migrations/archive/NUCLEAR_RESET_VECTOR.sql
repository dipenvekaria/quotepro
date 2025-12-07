-- ============================================
-- NUCLEAR RESET: Complete pgvector cleanup
-- ============================================
-- Run this FIRST to clean everything

-- 1. Drop any existing functions (all versions)
DROP FUNCTION IF EXISTS match_documents(vector(1536), uuid, text, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_documents(vector(768), uuid, text, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_documents CASCADE;

-- 2. Drop table if exists
DROP TABLE IF EXISTS document_embeddings CASCADE;

-- 3. Drop any orphaned indexes
DROP INDEX IF EXISTS idx_document_embeddings_embedding_hnsw CASCADE;
DROP INDEX IF EXISTS idx_document_embeddings_company_id CASCADE;
DROP INDEX IF EXISTS idx_document_embeddings_entity_type CASCADE;
DROP INDEX IF EXISTS idx_document_embeddings_entity_id CASCADE;
DROP INDEX IF EXISTS idx_document_embeddings_company_entity CASCADE;

-- 4. Verify everything is gone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_documents') THEN
    RAISE EXCEPTION 'match_documents still exists!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'document_embeddings') THEN
    RAISE EXCEPTION 'document_embeddings table still exists!';
  END IF;
  
  RAISE NOTICE '✅ All vector components removed';
  RAISE NOTICE '✅ Ready for fresh install';
END $$;
