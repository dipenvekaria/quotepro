-- ============================================
-- ROLLBACK MIGRATION 026
-- ============================================
-- Purpose: Remove broken match_documents function before recreating
-- This allows us to fix the entity_type error
-- ============================================

DROP FUNCTION IF EXISTS match_documents(vector(1536), uuid, text, float, int) CASCADE;
DROP FUNCTION IF EXISTS match_documents CASCADE;

-- Verify it's gone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_documents') THEN
    RAISE EXCEPTION 'Failed to drop match_documents function';
  ELSE
    RAISE NOTICE '✅ match_documents function removed';
    RAISE NOTICE '✅ Ready to apply new migration';
  END IF;
END $$;
