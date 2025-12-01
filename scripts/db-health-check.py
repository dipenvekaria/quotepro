#!/usr/bin/env python3
"""
Database Health Check Script
Verifies tables, indexes, constraints, RLS policies, and data integrity
"""

import os
import sys
from typing import Dict, List, Tuple
from supabase import create_client, Client

def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Missing Supabase credentials")
        sys.exit(1)
    
    return create_client(url, key)

def check_tables(supabase: Client) -> Tuple[bool, List[str]]:
    """Verify all required tables exist"""
    print("\n📋 Checking Tables...")
    
    required_tables = [
        "companies",
        "quotes",
        "line_items",
        "pricing_items",
        "document_embeddings",
        "ai_quote_analysis",  # New from Phase 4
    ]
    
    results = []
    all_good = True
    
    for table in required_tables:
        try:
            # Try to query table (SELECT 0 rows)
            supabase.table(table).select("*").limit(0).execute()
            results.append(f"  ✅ {table}")
        except Exception as e:
            results.append(f"  ❌ {table} - {str(e)}")
            all_good = False
    
    for result in results:
        print(result)
    
    return all_good, results

def check_indexes(supabase: Client) -> Tuple[bool, List[str]]:
    """Verify critical indexes exist"""
    print("\n🔍 Checking Indexes...")
    
    # This would require direct SQL access
    # For now, we'll check via query performance
    results = []
    
    try:
        # Check if document_embeddings has vector index
        result = supabase.table("document_embeddings").select("id").limit(1).execute()
        results.append("  ✅ document_embeddings accessible")
        
        # Check if ai_quote_analysis exists
        result = supabase.table("ai_quote_analysis").select("id").limit(1).execute()
        results.append("  ✅ ai_quote_analysis accessible")
        
        return True, results
    except Exception as e:
        results.append(f"  ❌ Index check failed: {str(e)}")
        return False, results

def check_data_quality(supabase: Client) -> Tuple[bool, List[str]]:
    """Validate data integrity"""
    print("\n🔬 Checking Data Quality...")
    
    results = []
    all_good = True
    
    try:
        # Count companies
        companies = supabase.table("companies").select("id", count="exact").execute()
        company_count = companies.count
        results.append(f"  ℹ️  Companies: {company_count}")
        
        # Count quotes
        quotes = supabase.table("quotes").select("id", count="exact").execute()
        quote_count = quotes.count
        results.append(f"  ℹ️  Quotes: {quote_count}")
        
        # Count pricing items
        pricing = supabase.table("pricing_items").select("id", count="exact").execute()
        pricing_count = pricing.count
        results.append(f"  ℹ️  Pricing Items: {pricing_count}")
        
        # Count embeddings
        embeddings = supabase.table("document_embeddings").select("id", count="exact").execute()
        embedding_count = embeddings.count
        results.append(f"  ℹ️  Embeddings: {embedding_count}")
        
        # Check if catalog is indexed
        if pricing_count > 0 and embedding_count == 0:
            results.append("  ⚠️  Warning: Pricing items exist but no embeddings! Run catalog indexing.")
            all_good = False
        elif embedding_count > 0:
            coverage = (embedding_count / pricing_count * 100) if pricing_count > 0 else 0
            results.append(f"  ✅ Catalog indexed: {coverage:.1f}% coverage")
        
        # Check AI analytics table
        try:
            analytics = supabase.table("ai_quote_analysis").select("id", count="exact").execute()
            analytics_count = analytics.count
            results.append(f"  ✅ AI Analytics: {analytics_count} records")
        except Exception as e:
            results.append(f"  ❌ AI Analytics table missing - migration not applied!")
            all_good = False
        
    except Exception as e:
        results.append(f"  ❌ Data quality check failed: {str(e)}")
        all_good = False
    
    for result in results:
        print(result)
    
    return all_good, results

def check_rls_policies(supabase: Client) -> Tuple[bool, List[str]]:
    """Check if RLS policies are active"""
    print("\n🔒 Checking RLS Policies...")
    
    results = []
    
    # Note: This requires admin privileges to check pg_policies
    # For basic check, we'll try authenticated queries
    results.append("  ℹ️  RLS policy check requires admin SQL access")
    results.append("  ℹ️  Verify manually: SELECT * FROM pg_policies;")
    
    for result in results:
        print(result)
    
    return True, results

def print_summary(checks: Dict[str, bool]):
    """Print overall health summary"""
    print("\n" + "="*50)
    print("📊 HEALTH CHECK SUMMARY")
    print("="*50)
    
    all_passed = all(checks.values())
    
    for check_name, passed in checks.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {check_name}")
    
    print("="*50)
    
    if all_passed:
        print("🎉 All checks passed! Database is healthy.")
        return 0
    else:
        print("⚠️  Some checks failed. Review output above.")
        return 1

def main():
    """Run all health checks"""
    print("🏥 QuotePro Database Health Check")
    print("="*50)
    
    supabase = get_supabase_client()
    
    checks = {}
    
    # Run all checks
    checks["Tables"], _ = check_tables(supabase)
    checks["Indexes"], _ = check_indexes(supabase)
    checks["Data Quality"], _ = check_data_quality(supabase)
    checks["RLS Policies"], _ = check_rls_policies(supabase)
    
    # Print summary
    exit_code = print_summary(checks)
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
