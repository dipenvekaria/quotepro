"""Quick script to check pricing items in database"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"🔗 Connecting to: {supabase_url}")
print(f"🔑 Using key: {supabase_key[:20]}...")

supabase = create_client(supabase_url, supabase_key)

# Query pricing items
company_id = "6cdae47e-3582-4c91-ad23-7909369ed54a"
result = supabase.table('pricing_items').select('*').eq('company_id', company_id).execute()

print(f"\n📊 Found {len(result.data)} pricing items in database")

if result.data:
    print("\n🔍 First 3 items:")
    for item in result.data[:3]:
        print(f"  - {item['name']}: ${item['price']} ({item['category']})")
    
    # Group by category
    categories = {}
    for item in result.data:
        cat = item['category']
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
    
    print(f"\n📁 Items by category:")
    for cat, count in sorted(categories.items()):
        print(f"  - {cat}: {count} items")
else:
    print("❌ No items found!")
