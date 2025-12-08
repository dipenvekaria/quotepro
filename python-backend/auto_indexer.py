"""
Background Worker - Auto-index work items when status changes
Listens to PostgreSQL NOTIFY events and indexes work items in real-time

Usage:
    python auto_indexer.py --company-id <uuid>  # Single company
    python auto_indexer.py --all                # All companies
"""
import asyncio
import json
from supabase import create_client, Client
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from config.settings import get_settings
from typing import Dict
import sys


class AutoIndexer:
    """Background worker that auto-indexes work items via database notifications"""
    
    def __init__(self, company_id: str = None):
        """Initialize auto-indexer with database and AI clients"""
        settings = get_settings()
        
        # Initialize clients
        self.db: Client = create_client(
            settings.next_public_supabase_url,
            settings.supabase_service_role_key
        )
        self.gemini = GeminiClient(api_key=settings.gemini_api_key)
        self.vector_store = VectorStore(self.db, self.gemini)
        self.company_id = company_id
        
        print("✅ Auto-Indexer initialized")
        print(f"   Database: {settings.next_public_supabase_url[:30]}...")
        print(f"   AI Model: {self.gemini.model_name}")
        if company_id:
            print(f"   Company Filter: {company_id}")
        else:
            print(f"   Company Filter: ALL")
    
    def index_work_item(self, work_item_id: str, company_id: str) -> bool:
        """
        Index a single work item
        
        Args:
            work_item_id: Work item UUID
            company_id: Company UUID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            print(f"\n📝 Indexing work item {work_item_id[:8]}...")
            
            # Fetch work item with line items
            response = self.db.table("work_items")\
                .select("*, line_items:quote_items!quote_items_work_item_id_fkey(*)")\
                .eq("id", work_item_id)\
                .single()\
                .execute()
            
            work_item = response.data
            
            if not work_item:
                print(f"   ❌ Work item not found")
                return False
            
            # Build content for embedding
            parts = []
            
            if work_item.get("job_name"):
                parts.append(work_item["job_name"])
            
            if not parts and work_item.get("description"):
                parts.append(work_item["description"])
            
            if work_item.get("customer_name"):
                parts.append(f"Customer: {work_item['customer_name']}")
            
            line_items = work_item.get("line_items", [])
            if line_items:
                item_names = [item.get("name", "") for item in line_items if item.get("name")]
                if item_names:
                    parts.append(f"Items: {', '.join(item_names[:5])}")
            
            if not parts:
                quote_num = work_item.get("quote_number") or f"Quote {work_item.get('id', 'unknown')[:8]}"
                parts.append(quote_num)
            
            content = " ".join(parts)
            
            # Prepare metadata
            metadata = {
                "id": str(work_item["id"]),
                "job_name": work_item.get("job_name"),
                "customer_name": work_item.get("customer_name"),
                "subtotal": float(work_item.get("subtotal", 0)),
                "total": float(work_item.get("total", 0)),
                "tax_amount": float(work_item.get("tax_amount", 0)),
                "discount_amount": float(work_item.get("discount_amount", 0)),
                "status": work_item.get("status"),
                "created_at": work_item.get("created_at"),
                "line_items": line_items
            }
            
            # Save embedding
            self.vector_store.save_embedding(
                company_id=company_id,
                content=content,
                entity_type="quote",
                entity_id=str(work_item["id"]),
                metadata=metadata
            )
            
            print(f"   ✅ Indexed: {work_item.get('job_name') or 'Unnamed'}")
            return True
            
        except Exception as e:
            print(f"   ❌ Error indexing work item: {e}")
            return False
    
    async def listen(self):
        """
        Listen to database notifications and auto-index work items
        Note: Supabase doesn't support LISTEN/NOTIFY in Python client yet
        This is a polling fallback - check for new items every 30 seconds
        """
        print("\n🎧 Starting auto-indexer (polling mode)...")
        print("   Checking for new work items every 30 seconds")
        print("   Press Ctrl+C to stop\n")
        
        last_checked = None
        
        try:
            while True:
                # Query for recently updated work items
                query = self.db.table("work_items")\
                    .select("id, company_id, job_name, status, updated_at")\
                    .in_("status", ["accepted", "scheduled", "completed"])
                
                if self.company_id:
                    query = query.eq("company_id", self.company_id)
                
                if last_checked:
                    query = query.gte("updated_at", last_checked)
                
                response = query.order("updated_at", desc=True).limit(10).execute()
                
                work_items = response.data
                
                if work_items:
                    print(f"📦 Found {len(work_items)} work items to index")
                    for item in work_items:
                        self.index_work_item(item["id"], item["company_id"])
                
                # Update last checked timestamp
                from datetime import datetime
                last_checked = datetime.now().isoformat()
                
                # Wait 30 seconds
                await asyncio.sleep(30)
                
        except KeyboardInterrupt:
            print("\n\n⏹️  Auto-indexer stopped")


def main():
    """Main entry point"""
    # Parse command line arguments
    company_id = None
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--company-id" and len(sys.argv) == 3:
            company_id = sys.argv[2]
        elif sys.argv[1] == "--all":
            company_id = None
        else:
            print("\n❌ Usage:")
            print("   python auto_indexer.py --company-id <uuid>")
            print("   python auto_indexer.py --all")
            sys.exit(1)
    
    indexer = AutoIndexer(company_id=company_id)
    asyncio.run(indexer.listen())


if __name__ == "__main__":
    main()
