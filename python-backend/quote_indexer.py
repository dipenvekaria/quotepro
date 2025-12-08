"""
Work Item Indexer - Generate and store embeddings for past work items (quotes/jobs)
Enables semantic search: "HVAC installation" → finds similar past jobs with pricing

Usage:
    python quote_indexer.py --company-id <uuid>
    python quote_indexer.py --all  # Index all companies
"""
import asyncio
from supabase import create_client, Client
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from config.settings import get_settings
from typing import List, Dict
import sys
import json


class QuoteIndexer:
    """Index past work items (quotes/jobs) with embeddings for semantic search"""
    
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
        
        print("✅ Work Item Indexer initialized")
        print(f"   Database: {settings.next_public_supabase_url[:30]}...")
        print(f"   AI Model: {self.gemini.model_name}")
    
    def fetch_quotes(self, company_id: str) -> List[Dict]:
        """
        Fetch work items for indexing
        Includes ONLY: accepted, scheduled, completed
        Excludes: draft, archived
        
        Args:
            company_id: Company UUID
            
        Returns:
            List of work items with quote options (line items)
        """
        print(f"\n📋 Fetching work items for company {company_id}...")
        
        response = self.db.table("work_items")\
            .select("*, line_items:quote_items!quote_items_work_item_id_fkey(*)")\
            .eq("company_id", company_id)\
            .in_("status", ["accepted", "scheduled", "completed"])\
            .order("created_at", desc=True)\
            .limit(100)\
            .execute()
        
        quotes = response.data
        print(f"   Found {len(quotes)} work items (accepted, scheduled, completed)")
        return quotes
    
    def build_embedding_content(self, quote: Dict) -> str:
        """
        Build rich text content for embedding generation
        Combines job name, line items, and details for semantic search
        
        Args:
            quote: Quote dict with line_items
            
        Returns:
            Combined text for embedding
            
        Example:
            Input: {job_name: "HVAC Repair", line_items: [{name: "AC Unit"}, ...]}
            Output: "HVAC Repair - Line items: AC Unit, Installation Labor, ..."
        """
        parts = []
        
        # Job name (most important)
        if quote.get("job_name"):
            parts.append(quote["job_name"])
        
        # Description fallback
        if not parts and quote.get("description"):
            parts.append(quote["description"])
        
        # Customer name (for context)
        if quote.get("customer_name"):
            parts.append(f"Customer: {quote['customer_name']}")
        
        # Line items (what was quoted)
        line_items = quote.get("line_items", [])
        if line_items:
            item_names = [item.get("name", "") for item in line_items if item.get("name")]
            if item_names:
                parts.append(f"Items: {', '.join(item_names[:5])}")  # Limit to first 5
        
        # If still empty, use quote number or ID as last resort
        if not parts:
            quote_num = quote.get("quote_number") or f"Quote {quote.get('id', 'unknown')[:8]}"
            parts.append(quote_num)
        
        content = " ".join(parts)
        return content
    
    def index_quote(self, quote: Dict, company_id: str) -> bool:
        """
        Generate and store embedding for a single quote
        
        Args:
            quote: Quote dict
            company_id: Company UUID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Build content for embedding
            content = self.build_embedding_content(quote)
            
            # Prepare metadata
            metadata = {
                "id": str(quote["id"]),
                "job_name": quote.get("job_name"),
                "customer_name": quote.get("customer_name"),
                "subtotal": float(quote.get("subtotal", 0)),
                "total": float(quote.get("total", 0)),
                "tax": float(quote.get("tax", 0)),
                "discount": float(quote.get("discount", 0)),
                "status": quote.get("status"),
                "created_at": quote.get("created_at"),
                "line_items": quote.get("line_items", [])
            }
            
            # Generate and store embedding
            self.vector_store.save_embedding(
                company_id=company_id,
                content=content,
                entity_type="quote",
                entity_id=str(quote["id"]),
                metadata=metadata
            )
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error indexing quote {quote.get('id')}: {e}")
            return False
    
    def index_company_quotes(self, company_id: str):
        """
        Index all quotes for a company
        
        Args:
            company_id: Company UUID
        """
        print(f"\n{'='*80}")
        print(f"🚀 Starting quote indexing for company: {company_id}")
        print(f"{'='*80}")
        
        # Fetch quotes
        quotes = self.fetch_quotes(company_id)
        
        if not quotes:
            print("⚠️  No quotes found for this company")
            return
        
        # Index each quote
        print(f"\n📝 Indexing {len(quotes)} quotes...")
        success_count = 0
        
        for i, quote in enumerate(quotes, 1):
            quote_name = quote.get("job_name") or "Unnamed"
            print(f"   [{i}/{len(quotes)}] {quote_name[:50]}...", end=" ")
            
            if self.index_quote(quote, company_id):
                success_count += 1
                print("✅")
            else:
                print("❌")
        
        # Summary
        print(f"\n{'='*80}")
        print(f"✅ Indexing complete!")
        print(f"   Successful: {success_count}/{len(quotes)}")
        print(f"   Failed: {len(quotes) - success_count}/{len(quotes)}")
        print(f"{'='*80}\n")
    
    def index_all_companies(self):
        """Index quotes for all companies"""
        print("\n🌍 Fetching all companies...")
        
        response = self.db.table("companies")\
            .select("id, name")\
            .execute()
        
        companies = response.data
        print(f"   Found {len(companies)} companies\n")
        
        for company in companies:
            company_id = str(company["id"])
            company_name = company.get("name", "Unknown")
            print(f"\n📍 Company: {company_name} ({company_id})")
            self.index_company_quotes(company_id)


def main():
    """Main entry point"""
    indexer = QuoteIndexer()
    
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("\n❌ Usage:")
        print("   python quote_indexer.py --company-id <uuid>")
        print("   python quote_indexer.py --all")
        sys.exit(1)
    
    if sys.argv[1] == "--all":
        indexer.index_all_companies()
    elif sys.argv[1] == "--company-id" and len(sys.argv) == 3:
        company_id = sys.argv[2]
        indexer.index_company_quotes(company_id)
    else:
        print("\n❌ Invalid arguments")
        print("   Usage: python quote_indexer.py --company-id <uuid>")
        print("          python quote_indexer.py --all")
        sys.exit(1)


if __name__ == "__main__":
    main()
