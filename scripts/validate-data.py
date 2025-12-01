#!/usr/bin/env python3
"""
Data Validation Script
Validates existing quote data, pricing items, and catalog indexing
"""

import os
import sys
from typing import Dict, List
from supabase import create_client, Client
from datetime import datetime

def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Missing Supabase credentials")
        sys.exit(1)
    
    return create_client(url, key)

def validate_quotes(supabase: Client) -> Dict:
    """Validate quote data integrity"""
    print("\n📝 Validating Quotes...")
    
    issues = []
    stats = {}
    
    try:
        # Get all quotes
        quotes = supabase.table("quotes").select("*").execute()
        stats["total_quotes"] = len(quotes.data)
        
        # Check for required fields
        missing_fields = []
        for quote in quotes.data:
            if not quote.get("company_id"):
                missing_fields.append(f"Quote {quote['id']}: missing company_id")
            if not quote.get("customer_name"):
                missing_fields.append(f"Quote {quote['id']}: missing customer_name")
            if quote.get("total") is None:
                missing_fields.append(f"Quote {quote['id']}: missing total")
        
        if missing_fields:
            issues.extend(missing_fields[:10])  # Show first 10
            if len(missing_fields) > 10:
                issues.append(f"... and {len(missing_fields) - 10} more")
        
        # Check status distribution
        statuses = {}
        for quote in quotes.data:
            status = quote.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        
        stats["status_distribution"] = statuses
        
        # Check for orphaned quotes (no line items)
        quotes_with_items = set()
        line_items = supabase.table("line_items").select("quote_id").execute()
        for item in line_items.data:
            quotes_with_items.add(item["quote_id"])
        
        orphaned = [q["id"] for q in quotes.data if q["id"] not in quotes_with_items]
        if orphaned:
            stats["orphaned_quotes"] = len(orphaned)
            issues.append(f"⚠️  {len(orphaned)} quotes have no line items")
        
        print(f"  ✅ Total quotes: {stats['total_quotes']}")
        print(f"  ℹ️  Status distribution: {statuses}")
        if orphaned:
            print(f"  ⚠️  Orphaned quotes: {len(orphaned)}")
        
    except Exception as e:
        issues.append(f"❌ Quote validation failed: {str(e)}")
        print(f"  ❌ Error: {str(e)}")
    
    return {"stats": stats, "issues": issues}

def validate_pricing_items(supabase: Client) -> Dict:
    """Validate pricing items catalog"""
    print("\n💰 Validating Pricing Items...")
    
    issues = []
    stats = {}
    
    try:
        # Get all pricing items
        items = supabase.table("pricing_items").select("*").execute()
        stats["total_items"] = len(items.data)
        
        # Check for required fields
        missing_fields = []
        invalid_prices = []
        
        for item in items.data:
            if not item.get("name"):
                missing_fields.append(f"Item {item['id']}: missing name")
            if not item.get("company_id"):
                missing_fields.append(f"Item {item['id']}: missing company_id")
            
            # Validate price
            price = item.get("price")
            if price is None:
                missing_fields.append(f"Item {item['id']}: missing price")
            elif price < 0:
                invalid_prices.append(f"Item {item['id']}: negative price (${price})")
        
        if missing_fields:
            issues.extend(missing_fields[:10])
        if invalid_prices:
            issues.extend(invalid_prices[:10])
        
        # Category distribution
        categories = {}
        for item in items.data:
            cat = item.get("category", "Uncategorized")
            categories[cat] = categories.get(cat, 0) + 1
        
        stats["category_distribution"] = categories
        
        print(f"  ✅ Total items: {stats['total_items']}")
        print(f"  ℹ️  Categories: {list(categories.keys())}")
        if missing_fields:
            print(f"  ⚠️  Items with missing fields: {len(missing_fields)}")
        if invalid_prices:
            print(f"  ⚠️  Items with invalid prices: {len(invalid_prices)}")
        
    except Exception as e:
        issues.append(f"❌ Pricing item validation failed: {str(e)}")
        print(f"  ❌ Error: {str(e)}")
    
    return {"stats": stats, "issues": issues}

def validate_catalog_indexing(supabase: Client) -> Dict:
    """Validate catalog embedding coverage"""
    print("\n🔍 Validating Catalog Indexing...")
    
    issues = []
    stats = {}
    
    try:
        # Get pricing items count
        items = supabase.table("pricing_items").select("id", count="exact").execute()
        total_items = items.count
        
        # Get embeddings count
        embeddings = supabase.table("document_embeddings").select("id,metadata", count="exact").execute()
        total_embeddings = embeddings.count
        
        # Count catalog-type embeddings
        catalog_embeddings = [e for e in embeddings.data if e.get("metadata", {}).get("type") == "catalog_item"]
        catalog_count = len(catalog_embeddings)
        
        stats["total_pricing_items"] = total_items
        stats["total_embeddings"] = total_embeddings
        stats["catalog_embeddings"] = catalog_count
        
        if total_items > 0:
            coverage = (catalog_count / total_items) * 100
            stats["coverage_percent"] = round(coverage, 1)
            
            print(f"  ✅ Pricing items: {total_items}")
            print(f"  ✅ Catalog embeddings: {catalog_count}")
            print(f"  ℹ️  Coverage: {coverage:.1f}%")
            
            if coverage < 100:
                missing = total_items - catalog_count
                issues.append(f"⚠️  {missing} pricing items not indexed ({100-coverage:.1f}% missing)")
                print(f"  ⚠️  Missing: {missing} items ({100-coverage:.1f}%)")
                print(f"     Run: POST /api/catalog/index to re-index")
        else:
            print(f"  ℹ️  No pricing items to index")
        
    except Exception as e:
        issues.append(f"❌ Catalog indexing check failed: {str(e)}")
        print(f"  ❌ Error: {str(e)}")
    
    return {"stats": stats, "issues": issues}

def validate_ai_analytics(supabase: Client) -> Dict:
    """Validate AI analytics tracking"""
    print("\n🤖 Validating AI Analytics...")
    
    issues = []
    stats = {}
    
    try:
        # Check if table exists
        analytics = supabase.table("ai_quote_analysis").select("*", count="exact").execute()
        stats["total_records"] = analytics.count
        
        if analytics.count > 0:
            # Analysis type distribution
            types = {}
            for record in analytics.data:
                atype = record.get("analysis_type", "unknown")
                types[atype] = types.get(atype, 0) + 1
            
            stats["analysis_types"] = types
            print(f"  ✅ AI analytics records: {analytics.count}")
            print(f"  ℹ️  Types: {types}")
        else:
            print(f"  ℹ️  No AI analytics data yet (table exists)")
            issues.append("ℹ️  No AI usage tracked yet - start using AI features!")
        
    except Exception as e:
        issues.append(f"❌ AI analytics table not found - migration not applied!")
        print(f"  ❌ Migration needed: Run scripts/apply-ai-migration.sh")
    
    return {"stats": stats, "issues": issues}

def print_summary(results: Dict):
    """Print validation summary"""
    print("\n" + "="*60)
    print("📊 DATA VALIDATION SUMMARY")
    print("="*60)
    
    all_issues = []
    for section, data in results.items():
        issues = data.get("issues", [])
        if issues:
            all_issues.extend(issues)
    
    if not all_issues:
        print("🎉 No data quality issues found! Everything looks good.")
    else:
        print(f"⚠️  Found {len(all_issues)} issue(s):\n")
        for issue in all_issues:
            print(f"  • {issue}")
    
    print("\n" + "="*60)
    
    # Print stats summary
    print("\n📈 Quick Stats:")
    for section, data in results.items():
        stats = data.get("stats", {})
        if stats:
            print(f"\n{section.upper()}:")
            for key, value in stats.items():
                print(f"  • {key}: {value}")
    
    print("\n" + "="*60)

def main():
    """Run all validation checks"""
    print("🔍 QuotePro Data Validation")
    print("="*60)
    
    supabase = get_supabase_client()
    
    results = {}
    
    # Run validations
    results["Quotes"] = validate_quotes(supabase)
    results["Pricing Items"] = validate_pricing_items(supabase)
    results["Catalog Indexing"] = validate_catalog_indexing(supabase)
    results["AI Analytics"] = validate_ai_analytics(supabase)
    
    # Print summary
    print_summary(results)
    
    # Exit with error if critical issues
    critical_issues = sum(1 for r in results.values() for i in r.get("issues", []) if i.startswith("❌"))
    if critical_issues > 0:
        sys.exit(1)
    
    sys.exit(0)

if __name__ == "__main__":
    main()
