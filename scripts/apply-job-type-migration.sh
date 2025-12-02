#!/bin/bash

# Apply job_type column migration
# Run this to add the missing job_type column to the quotes table

echo "🔧 Adding job_type column to quotes table..."
echo ""
echo "Option 1: Use Supabase Dashboard (Recommended)"
echo "=============================================="
echo "1. Go to: https://ajljduisjyutbgjeucig.supabase.co/project/ajljduisjyutbgjeucig/sql/new"
echo "2. Paste this SQL:"
echo ""
cat supabase/migrations/20251202_add_job_type_column.sql
echo ""
echo ""
echo "Option 2: Use psql (if you have database URL)"
echo "=============================================="
echo "If you have SUPABASE_DB_URL in .env.local, run:"
echo "psql \$SUPABASE_DB_URL -f supabase/migrations/20251202_add_job_type_column.sql"
