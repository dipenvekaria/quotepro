#!/bin/bash
# Apply pgvector RAG infrastructure fix

set -e

echo "🔧 Applying pgvector RAG fix migration..."

# Check if migration file exists
if [ ! -f "supabase/migrations/20251206_fix_pgvector_rag.sql" ]; then
    echo "❌ Migration file not found!"
    exit 1
fi

echo "📝 Migration file found"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo ""
echo "1. Go to your Supabase dashboard: https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to 'SQL Editor'"
echo "4. Click 'New query'"
echo "5. Copy and paste the contents of:"
echo "   supabase/migrations/20251206_fix_pgvector_rag.sql"
echo "6. Click 'Run' (or press Cmd+Enter)"
echo ""
echo "OR use Supabase CLI:"
echo ""
echo "  npx supabase db push"
echo ""
echo "After applying, restart the backend to test!"

# Display first few lines of migration
echo ""
echo "Migration preview:"
echo "─────────────────────────────────────"
head -20 supabase/migrations/20251206_fix_pgvector_rag.sql
echo "..."
echo "─────────────────────────────────────"
