-- ============================================
-- FIX: Add missing foreign key relationship
-- ============================================

-- Check if foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'team_members_company_id_fkey'
    AND table_name = 'team_members'
  ) THEN
    -- Add foreign key if it doesn't exist
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key: team_members.company_id → companies.id';
  ELSE
    RAISE NOTICE 'ℹ️ Foreign key already exists';
  END IF;
END $$;

-- Also verify the column exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'team_members'
AND column_name IN ('id', 'company_id', 'user_id', 'role')
ORDER BY ordinal_position;
