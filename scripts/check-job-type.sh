#!/bin/bash

# Debug script to check if job_type column exists and has data

echo "🔍 Checking job_type column status..."
echo ""

# Check .env.local for Supabase URL
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
PROJECT_ID=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')

echo "📊 To check your database, visit:"
echo "https://supabase.com/dashboard/project/$PROJECT_ID/editor"
echo ""
echo "Run this SQL query:"
echo "-------------------"
cat << 'SQL'
-- Check if job_type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quotes' AND column_name = 'job_type';

-- Show sample data
SELECT id, customer_name, job_type, description, lead_status 
FROM quotes 
ORDER BY created_at DESC 
LIMIT 10;
SQL

echo ""
echo "-------------------"
echo ""
echo "✅ If you see job_type column → Migration applied"
echo "❌ If no results → Run migration from APPLY_JOB_TYPE_MIGRATION.md"
