-- ============================================
-- MIGRATION: Fix pgvector RAG Infrastructure
-- ============================================
-- Purpose: Create missing document_embeddings table and optimize indexes
-- Created: 2024-12-06
-- Phase: RAG Fix
-- Risk: LOW (creating new table, no data modification)
-- ============================================

-- ============================================
-- 1. CREATE document_embeddings TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('quote', 'job', 'customer', 'catalog_item', 'work_item')),
  entity_id uuid NOT NULL,
  embedding vector(768) NOT NULL,  -- Gemini text-embedding-004 (768 dimensions)
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- ============================================
-- 2. CREATE OPTIMIZED INDEXES
-- ============================================

-- HNSW index for vector similarity search (faster than ivfflat)
-- m=16, ef_construction=64 are good defaults for most use cases
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding_hnsw
  ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- B-tree indexes for filtering
CREATE INDEX IF NOT EXISTS idx_document_embeddings_company_id 
  ON document_embeddings(company_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_entity_type 
  ON document_embeddings(entity_type);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_entity_id 
  ON document_embeddings(entity_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_document_embeddings_company_entity 
  ON document_embeddings(company_id, entity_type);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access embeddings from their company
CREATE POLICY "Users can view their company's embeddings"
  ON document_embeddings
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can do anything (for backend operations)
CREATE POLICY "Service role has full access"
  ON document_embeddings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 4. UPDATE TRIGGER (auto-update updated_at)
-- ============================================

CREATE OR REPLACE FUNCTION update_document_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_document_embeddings_updated_at
  BEFORE UPDATE ON document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_document_embeddings_updated_at();

-- ============================================
-- 5. CREATE match_documents FUNCTION
-- ============================================
-- Creating AFTER table/indexes exist so validation passes

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_company_id uuid,
  match_entity_type text DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.entity_type,
    document_embeddings.entity_id,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity,
    document_embeddings.created_at
  FROM document_embeddings
  WHERE document_embeddings.company_id = match_company_id
    AND (match_entity_type IS NULL OR document_embeddings.entity_type = match_entity_type)
    AND 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents IS 'Find similar documents using vector similarity search for RAG';

-- ============================================
-- 6. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON TABLE document_embeddings IS 'Stores vector embeddings for RAG (Retrieval Augmented Generation)';
COMMENT ON COLUMN document_embeddings.embedding IS 'Gemini text-embedding-004 vector (768 dimensions)';
COMMENT ON COLUMN document_embeddings.entity_type IS 'Type of entity: quote, job, customer, catalog_item, work_item';
COMMENT ON COLUMN document_embeddings.metadata IS 'Additional metadata (customer name, price, tags, etc)';

-- ============================================
-- 7. VERIFICATION
-- ============================================

DO $$
DECLARE
  table_exists boolean;
  index_count int;
  function_exists boolean;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'document_embeddings'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'document_embeddings table creation failed';
  END IF;
  
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'match_documents'
  ) INTO function_exists;
  
  IF NOT function_exists THEN
    RAISE EXCEPTION 'match_documents() function creation failed';
  END IF;
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'document_embeddings';
  
  RAISE NOTICE '✅ document_embeddings table created';
  RAISE NOTICE '✅ match_documents() function created';
  RAISE NOTICE '✅ % indexes created', index_count;
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ RAG infrastructure ready';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Generate embeddings for catalog items';
  RAISE NOTICE '2. Generate embeddings for past quotes';
  RAISE NOTICE '3. Test vector search with match_documents()';
END $$;

-- ============================================
-- NOTES
-- ============================================
-- 
-- ✅ HNSW index for fast similarity search
-- ✅ Multi-tenant isolation (company_id)
-- ✅ RLS policies for security
-- ✅ Optimized for Gemini embeddings (768 dims)
-- ✅ Supports quote, job, customer, catalog_item, work_item
--
-- Performance expectations:
-- - <10ms queries for 10K vectors
-- - <50ms queries for 100K vectors
-- - <200ms queries for 1M vectors
--
-- Index parameters (can tune later):
-- - m=16: connections per layer (higher = better recall, more memory)
-- - ef_construction=64: build quality (higher = better index, slower build)
--
-- To change embedding dimensions (if needed):
-- ALTER TABLE document_embeddings ALTER COLUMN embedding TYPE vector(1536);
-- ============================================
