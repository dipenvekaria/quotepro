-- ============================================
-- MIGRATION 020: Enable pgvector Extension
-- ============================================
-- Purpose: Enable pgvector for AI embeddings and semantic search
-- Created: 2024-11-30
-- Phase: 1 - Database Schema Redesign
-- Risk: LOW (safe extension installation)
-- ============================================

-- Enable pgvector extension for vector similarity search
-- This is required for RAG (Retrieval Augmented Generation)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE EXCEPTION 'pgvector extension installation failed';
  END IF;
  
  RAISE NOTICE '✅ pgvector extension enabled successfully';
END $$;

-- Test vector operations to ensure everything works
DO $$
DECLARE
  test_vector vector(3);
  test_result float;
BEGIN
  -- Create test vector
  test_vector := '[1,2,3]'::vector;
  
  -- Test cosine similarity (used for semantic search)
  -- Cosine distance: 1 - cosine_similarity
  -- Result should be a valid float
  test_result := test_vector <=> '[1,2,3]'::vector;
  
  IF test_result IS NULL THEN
    RAISE EXCEPTION 'Vector operations not working';
  END IF;
  
  RAISE NOTICE '✅ Vector operations tested successfully';
  RAISE NOTICE 'Test cosine distance: %', test_result;
END $$;

-- Display pgvector version
SELECT 
  extname AS extension_name,
  extversion AS version,
  '✅ Ready for AI embeddings' AS status
FROM pg_extension 
WHERE extname = 'vector';

-- ============================================
-- NOTES FOR FUTURE REFERENCE
-- ============================================
-- 
-- Vector Operations Available:
-- - <-> : Euclidean distance (L2 distance)
-- - <#> : Negative inner product
-- - <=> : Cosine distance (1 - cosine similarity)
--
-- We'll primarily use cosine distance (<=>) for semantic search
-- because it's best for text embeddings from Gemini/OpenAI
--
-- Index types available:
-- - ivfflat: Good for <1M vectors
-- - hnsw: Better for >1M vectors (more memory)
--
-- Embedding dimensions:
-- - Gemini text-embedding-004: 768 or 1536 dimensions
-- - OpenAI text-embedding-3: 1536 dimensions
--
-- Next migration (021) will create document_embeddings table
-- ============================================
