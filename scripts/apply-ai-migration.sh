#!/bin/bash
# Apply AI Analytics Migration
# Run this to add ai_quote_analysis table and analytics views

set -e

echo "🚀 Applying AI Analytics Migration..."
echo "Migration: 20250101000007_ai_analytics_tracking.sql"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Not linked to Supabase project."
    echo "Run: npx supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Or apply migration manually via Supabase Dashboard:"
    echo "1. Go to Database → Migrations"
    echo "2. Upload: supabase/migrations/20250101000007_ai_analytics_tracking.sql"
    echo "3. Click 'Run migration'"
    exit 1
fi

# Apply migration
echo "Applying migration..."
npx supabase db push

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "Next steps:"
echo "1. Run health check: python scripts/db-health-check.py"
echo "2. Verify tables: Check Supabase Dashboard → Database → Tables"
echo "3. Test analytics API: POST /api/ai-analytics/summary"
