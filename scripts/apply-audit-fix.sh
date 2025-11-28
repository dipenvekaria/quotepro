#!/bin/bash

# Quick Fix Script for Audit Trail Issues
# This script will help you apply the profiles table migration

echo "🔧 QuotePro Audit Trail Fix"
echo "=============================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found."
    echo ""
    echo "Option 1: Install Supabase CLI"
    echo "  npm install -g supabase"
    echo ""
    echo "Option 2: Apply migration manually"
    echo "  1. Open your Supabase Dashboard"
    echo "  2. Go to SQL Editor"
    echo "  3. Copy and paste the contents of:"
    echo "     supabase/migrations/012_add_profiles_table.sql"
    echo "  4. Click 'Run'"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📁 In correct directory"
echo ""

# Check if migration file exists
if [ ! -f "supabase/migrations/012_add_profiles_table.sql" ]; then
    echo "❌ Error: Migration file not found"
    echo "Expected: supabase/migrations/012_add_profiles_table.sql"
    exit 1
fi

echo "📄 Migration file found"
echo ""

# Show what the migration will do
echo "This migration will:"
echo "  ✅ Create profiles table for user metadata"
echo "  ✅ Set up Row Level Security policies"
echo "  ✅ Create trigger to auto-populate profiles on signup"
echo "  ✅ Backfill existing users"
echo ""

read -p "Apply migration? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Applying migration..."
    npx supabase db push
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "Next steps:"
        echo "  1. Reload your browser"
        echo "  2. Try saving internal notes"
        echo "  3. Make an AI update to a quote"
        echo "  4. Check the Audit Trail - should now show user details and AI instructions"
        echo ""
    else
        echo ""
        echo "❌ Migration failed"
        echo ""
        echo "Manual steps:"
        echo "  1. Open Supabase Dashboard → SQL Editor"
        echo "  2. Copy contents of supabase/migrations/012_add_profiles_table.sql"
        echo "  3. Paste and click 'Run'"
        echo ""
    fi
else
    echo ""
    echo "❌ Migration cancelled"
    echo ""
    echo "To apply later, run:"
    echo "  npx supabase db push"
    echo ""
fi
