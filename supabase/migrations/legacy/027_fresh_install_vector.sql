-- ============================================
-- FRESH INSTALL: pgvector RAG (Clean)
-- ============================================
-- Run AFTER nuclear reset

-- 1. Table first
CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('quote', 'job', 'customer', 'catalog_item', 'work_item')),
  entity_id uuid NOT NULL,
  embedding vector(768) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_document_embeddings_embedding_hnsw
  ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_document_embeddings_company_id ON document_embeddings(company_id);
CREATE INDEX idx_document_embeddings_entity_type ON document_embeddings(entity_type);
CREATE INDEX idx_document_embeddings_entity_id ON document_embeddings(entity_id);
CREATE INDEX idx_document_embeddings_company_entity ON document_embeddings(company_id, entity_type);

-- 3. RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's embeddings"
  ON document_embeddings FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert their company's embeddings"
  ON document_embeddings FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Service role has full access"
  ON document_embeddings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 4. Trigger
CREATE FUNCTION update_document_embeddings_updated_at()
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

-- 5. Search function (table exists now)
CREATE FUNCTION match_documents(
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

-- 6. Verify
DO $$
DECLARE
  idx_count int;
BEGIN
  SELECT COUNT(*) INTO idx_count FROM pg_indexes WHERE tablename = 'document_embeddings';
  
  RAISE NOTICE '✅ Table created';
  RAISE NOTICE '✅ Function created';
  RAISE NOTICE '✅ % indexes created', idx_count;
  RAISE NOTICE '✅ RLS enabled';
  RAISE NOTICE '✅ RAG ready';
END $$;
