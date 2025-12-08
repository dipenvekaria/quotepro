"""
Catalog Indexer - Generate and store embeddings for pricing catalog items
Enables semantic search: "water heater" → finds related plumbing items

Usage:
    python catalog_indexer.py --company-id <uuid>
    python catalog_indexer.py --all  # Index all companies
"""
import asyncio
from supabase import create_client, Client
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from config.settings import get_settings
from typing import List, Dict
import sys


class CatalogIndexer:
    """Index pricing catalog items with embeddings for semantic search"""
    
    def __init__(self):
        """Initialize indexer with database and AI clients"""
        settings = get_settings()
        
        # Initialize clients
        self.db: Client = create_client(
            settings.next_public_supabase_url,
            settings.supabase_service_role_key
        )
        self.gemini = GeminiClient(api_key=settings.gemini_api_key)
        self.vector_store = VectorStore(self.db, self.gemini)
        
        print("✅ Catalog Indexer initialized")
        print(f"   Database: {settings.next_public_supabase_url[:30]}...")
        print(f"   AI Model: {self.gemini.model_name}")
    
    def fetch_catalog_items(self, company_id: str) -> List[Dict]:
        """
        Fetch all pricing items for a company
        
        Args:
            company_id: Company UUID
            
        Returns:
            List of catalog items
        """
        print(f"\n📦 Fetching catalog items for company {company_id}...")
        
        response = self.db.table("catalog_items")\
            .select("*")\
            .eq("company_id", company_id)\
            .eq("is_active", True)\
            .execute()
        
        items = response.data
        print(f"   Found {len(items)} catalog items")
        return items
    
    def build_embedding_content(self, item: Dict) -> str:
        """
        Build rich text content for embedding generation
        Combines name, category, description for better semantic search
        
        Args:
            item: Catalog item dict
            
        Returns:
            Combined text for embedding
            
        Example:
            Input: {name: "Tankless Water Heater", category: "Plumbing", price: 1200}
            Output: "Plumbing: Tankless Water Heater - High-efficiency water heating"
        """
        parts = []
        
        # Category (important for filtering)
        if item.get("category"):
            parts.append(f"{item['category']}:")
        
        # Name (most important)
        parts.append(item["name"])
        
        # Description (if exists)
        if item.get("description"):
            parts.append(f"- {item['description']}")
        
        # Tags (if exists)
        if item.get("tags") and isinstance(item["tags"], list):
            parts.append(f"Tags: {', '.join(item['tags'])}")
        
        content = " ".join(parts)
        return content
    
    def index_item(self, item: Dict, company_id: str) -> bool:
        """
        Generate and store embedding for a single catalog item
        
        Args:
            item: Catalog item dict
            company_id: Company UUID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Build content for embedding
            content = self.build_embedding_content(item)
            
            # Store COMPLETE record in metadata for RAG retrieval
            metadata = {
                "id": str(item["id"]),
                "name": item["name"],
                "description": item.get("description"),
                "category": item.get("category"),
                "subcategory": item.get("subcategory"),
                "base_price": float(item.get("base_price", 0)),
                "unit": item.get("unit", "each"),
                "is_active": item.get("is_active", True),
                "tags": item.get("tags", []),
                "typical_quantity": item.get("typical_quantity"),
                "labor_hours": item.get("labor_hours"),
                "material_cost": item.get("material_cost"),
                "job_type": item.get("job_type")
            }
            
            # Save embedding
            embedding_id = self.vector_store.save_embedding(
                company_id=company_id,
                content=content,
                entity_type="catalog_item",
                entity_id=item["id"],
                metadata=metadata
            )
            
            print(f"   ✓ {item['name'][:40]:<40} | {item.get('category', 'N/A'):<15} | ${item.get('base_price', 0):>8.2f}")
            return True
            
        except Exception as e:
            print(f"   ✗ Error indexing {item['name']}: {str(e)}")
            return False
    
    def index_company_catalog(self, company_id: str):
        """
        Index all catalog items for a company
        
        Args:
            company_id: Company UUID
        """
        print(f"\n{'='*80}")
        print(f"🚀 Starting catalog indexing for company: {company_id}")
        print(f"{'='*80}")
        
        # Fetch items
        items = self.fetch_catalog_items(company_id)
        
        if not items:
            print("   ⚠️  No catalog items found")
            return
        
        # Index each item
        print(f"\n📝 Indexing {len(items)} items...")
        print(f"   {'Item Name':<40} | {'Category':<15} | {'Price':>8}")
        print(f"   {'-'*40} | {'-'*15} | {'-'*8}")
        
        success_count = 0
        for item in items:
            if self.index_item(item, company_id):
                success_count += 1
        
        # Summary
        print(f"\n{'='*80}")
        print(f"✅ Indexing complete!")
        print(f"   Total items: {len(items)}")
        print(f"   Successfully indexed: {success_count}")
        print(f"   Failed: {len(items) - success_count}")
        print(f"{'='*80}\n")
    
    def test_search(self, company_id: str, query: str):
        """
        Test semantic search on indexed catalog
        
        Args:
            company_id: Company UUID
            query: Search query (e.g., "water heater")
        """
        print(f"\n🔍 Testing search: '{query}'")
        print(f"{'='*80}")
        
        results = self.vector_store.search_similar(
            query_text=query,
            company_id=company_id,
            entity_type="catalog_item",
            limit=5
        )
        
        print(f"\n   Top {len(results)} results:")
        print(f"   {'Item Name':<40} | {'Category':<15} | {'Score':>8}")
        print(f"   {'-'*40} | {'-'*15} | {'-'*8}")
        
        for result in results:
            meta = result.get("metadata", {})
            print(f"   {meta.get('name', 'N/A')[:40]:<40} | {meta.get('category', 'N/A'):<15} | {result.get('similarity', 0):>8.3f}")
        
        print(f"{'='*80}\n")


def main():
    """Main entry point for catalog indexing"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Index catalog items with embeddings")
    parser.add_argument("--company-id", help="Company UUID to index")
    parser.add_argument("--all", action="store_true", help="Index all companies")
    parser.add_argument("--test", help="Test search query after indexing")
    
    args = parser.parse_args()
    
    # Initialize indexer
    indexer = CatalogIndexer()
    
    if args.all:
        print("⚠️  --all flag not implemented yet. Use --company-id for now.")
        sys.exit(1)
    
    if not args.company_id:
        print("❌ Error: --company-id required")
        print("\nUsage:")
        print("  python catalog_indexer.py --company-id <uuid>")
        print("  python catalog_indexer.py --company-id <uuid> --test 'water heater'")
        sys.exit(1)
    
    # Index catalog
    indexer.index_company_catalog(args.company_id)
    
    # Run test search if requested
    if args.test:
        indexer.test_search(args.company_id, args.test)


if __name__ == "__main__":
    main()
