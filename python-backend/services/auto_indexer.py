"""
Auto-indexing service for catalog items
Automatically generates embeddings when pricing items are created/updated
"""
from supabase import Client
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from typing import Dict, Optional
import asyncio


class AutoIndexer:
    """
    Automatically index catalog items with embeddings
    Runs in background when pricing items change
    """
    
    def __init__(self, db: Client, gemini: GeminiClient):
        """Initialize auto-indexer"""
        self.db = db
        self.gemini = gemini
        self.vector_store = VectorStore(db, gemini)
    
    def build_embedding_content(self, item: Dict) -> str:
        """Build rich text for embedding from pricing item"""
        parts = []
        
        if item.get("category"):
            parts.append(f"{item['category']}:")
        
        parts.append(item["name"])
        
        if item.get("description"):
            parts.append(f"- {item['description']}")
        
        if item.get("tags") and isinstance(item["tags"], list):
            parts.append(f"Tags: {', '.join(item['tags'])}")
        
        return " ".join(parts)
    
    async def index_item(self, item: Dict) -> bool:
        """
        Index a single pricing item
        
        Args:
            item: Pricing item dict (from database)
            
        Returns:
            True if successful
        """
        try:
            content = self.build_embedding_content(item)
            
            metadata = {
                "name": item["name"],
                "category": item.get("category"),
                "price": float(item["price"]),
                "is_default": item.get("is_default", False)
            }
            
            # Check if embedding already exists
            existing = self.db.table("document_embeddings")\
                .select("id")\
                .eq("entity_type", "catalog_item")\
                .eq("entity_id", item["id"])\
                .execute()
            
            if existing.data:
                # Update existing embedding
                print(f"♻️  Updating embedding for: {item['name']}")
                # Delete old, insert new (simpler than update with vector)
                self.db.table("document_embeddings")\
                    .delete()\
                    .eq("id", existing.data[0]["id"])\
                    .execute()
            else:
                print(f"✨ Creating new embedding for: {item['name']}")
            
            # Create new embedding
            self.vector_store.save_embedding(
                company_id=item["company_id"],
                content=content,
                entity_type="catalog_item",
                entity_id=item["id"],
                metadata=metadata
            )
            
            return True
            
        except Exception as e:
            print(f"❌ Error indexing {item.get('name', 'unknown')}: {str(e)}")
            return False
    
    async def index_company_catalog(self, company_id: str) -> Dict:
        """
        Index all catalog items for a company
        Used for bulk indexing (e.g., first time setup)
        
        Args:
            company_id: Company UUID
            
        Returns:
            Summary dict with counts
        """
        print(f"🚀 Auto-indexing catalog for company: {company_id}")
        
        # Fetch all pricing items
        response = self.db.table("pricing_items")\
            .select("*")\
            .eq("company_id", company_id)\
            .execute()
        
        items = response.data
        print(f"   Found {len(items)} items to index")
        
        # Index each item
        success_count = 0
        for item in items:
            if await self.index_item(item):
                success_count += 1
        
        result = {
            "total": len(items),
            "indexed": success_count,
            "failed": len(items) - success_count
        }
        
        print(f"✅ Indexed {success_count}/{len(items)} items")
        return result
    
    async def delete_item_embedding(self, item_id: str) -> bool:
        """
        Delete embedding when pricing item is deleted
        
        Args:
            item_id: Pricing item UUID
            
        Returns:
            True if successful
        """
        try:
            self.db.table("document_embeddings")\
                .delete()\
                .eq("entity_type", "catalog_item")\
                .eq("entity_id", item_id)\
                .execute()
            
            print(f"🗑️  Deleted embedding for item: {item_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error deleting embedding: {str(e)}")
            return False


# Singleton instance (initialized in API routes)
_auto_indexer: Optional[AutoIndexer] = None


def get_auto_indexer(db: Client, gemini: GeminiClient) -> AutoIndexer:
    """Get or create AutoIndexer singleton"""
    global _auto_indexer
    if _auto_indexer is None:
        _auto_indexer = AutoIndexer(db, gemini)
    return _auto_indexer
