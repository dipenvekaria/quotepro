#!/bin/bash

# Script to delete all work items whilecho "📊 Current couecho "📊 Final counts:"
psql "$DB_URL" -c "SELECT 'Quotes:' as item, COUNT(*)::text as count FROM quotes
                    UNION ALL SELECT 'Quote Items:', COUNT(*)::text FROM quote_items
                    UNION ALL SELECT 'Audit Logs:', COUNT(*)::text FROM quote_audit_log;" -t

echo ""
echo "✨ Done! Your companies and user accounts are preserved."ore deletion):"
psql "$DB_URL" -c "SELECT 'Quotes:' as item, COUNT(*)::text as count FROM quotes
                    UNION ALL SELECT 'Quote Items:', COUNT(*)::text FROM quote_items
                    UNION ALL SELECT 'Audit Logs:', COUNT(*)::text FROM quote_audit_log;" -tserving product pricing metadata
# Usage: ./scripts/clean-work-items.sh

set -e

echo "🧹 QuotePro Work Items Cleanup Script"
echo "======================================"
echo ""
echo "This will DELETE:"
echo "  ❌ All quotes"
echo "  ❌ All leads"
echo "  ❌ All quote items"
echo "  ❌ All audit trail logs"
echo ""
echo "This will PRESERVE:"
echo "  ✅ Companies"
echo "  ✅ User accounts"
echo ""

# Safety confirmation
read -p "Are you sure you want to delete ALL work items? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

echo ""
echo "🔑 Fetching Supabase credentials..."

# Get Supabase credentials from .env.local
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    exit 1
fi

# Extract database URL
DB_URL=$(grep SUPABASE_DB_URL .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL not found in .env.local"
    echo "Please add SUPABASE_DB_URL to .env.local"
    echo "Format: postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
    exit 1
fi

echo "✅ Found database connection"
echo ""

# Backup count before deletion
echo "📊 Current counts (before deletion):"
psql "$DB_URL" -c "SELECT 'Quotes:' as item, COUNT(*)::text as count FROM quotes
                    UNION ALL SELECT 'Quote Items:', COUNT(*)::text FROM quote_items
                    UNION ALL SELECT 'Audit Logs:', COUNT(*)::text FROM quote_audit_log
                    UNION ALL SELECT 'Products:', COUNT(*)::text FROM products;" -t

echo ""
read -p "Press Enter to execute deletion or Ctrl+C to cancel..."
echo ""

# Execute cleanup SQL
echo "🗑️  Deleting work items..."
psql "$DB_URL" -f scripts/clean-work-items.sql

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Final counts:"
psql "$DB_URL" -c "SELECT 'Quotes:' as item, COUNT(*)::text as count FROM quotes
                    UNION ALL SELECT 'Quote Items:', COUNT(*)::text FROM quote_items
                    UNION ALL SELECT 'Audit Logs:', COUNT(*)::text FROM quote_audit_log
                    UNION ALL SELECT 'Products:', COUNT(*)::text FROM products;" -t

echo ""
echo "✨ Done! Your product pricing is preserved."
