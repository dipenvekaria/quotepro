"""
Retriever for finding relevant documents using RAG
Specialized retrieval methods for different use cases
"""
from supabase import Client
from services.rag.vector_store import VectorStore
from typing import List, Dict, Any, Optional


class Retriever:
    """
    High-level retrieval service for RAG
    Provides domain-specific retrieval methods
    """
    
    def __init__(self, db: Client, vector_store: VectorStore):
        """
        Initialize retriever
        
        Args:
            db: Supabase client
            vector_store: Vector store for similarity search
        """
        self.db = db
        self.vector_store = vector_store
    
    def retrieve_similar_quotes(
        self,
        query: str,
        company_id: str,
        limit: int = 10,
        min_total: Optional[float] = None,
        max_total: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar past quotes for reference
        
        Args:
            query: Query text (e.g., "tankless water heater")
            company_id: Company ID
            limit: Maximum results
            min_total: Optional minimum quote total filter
            max_total: Optional maximum quote total filter
        
        Returns:
            List of similar quotes with full details
        
        Example:
            quotes = retriever.retrieve_similar_quotes(
                query="HVAC system 2-story house",
                company_id="abc-123",
                limit=5
            )
        """
        # Search embeddings
        similar_docs = self.vector_store.search_similar(
            query_text=query,
            company_id=company_id,
            entity_type="quote",
            limit=limit * 2  # Get extra, then filter
        )
        
        # Extract quote IDs
        quote_ids = [doc["entity_id"] for doc in similar_docs]
        
        if not quote_ids:
            return []
        
        # Fetch full quote details using quote_details_view
        query_builder = (
            self.db.table("quote_details_view")
            .select("*")
            .in_("id", quote_ids)
            .eq("company_id", company_id)
        )
        
        # Apply price filters if provided
        if min_total is not None:
            query_builder = query_builder.gte("total", min_total)
        if max_total is not None:
            query_builder = query_builder.lte("total", max_total)
        
        result = query_builder.limit(limit).execute()
        
        # Add similarity scores
        similarity_map = {doc["entity_id"]: doc.get("similarity", 0) for doc in similar_docs}
        for quote in result.data:
            quote["similarity_score"] = similarity_map.get(quote["id"], 0)
        
        # Sort by similarity
        result.data.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        return result.data
    
    def retrieve_customer_history(
        self,
        customer_id: str,
        company_id: str,
        include_embeddings: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieve all historical data for a customer
        
        Args:
            customer_id: Customer ID
            company_id: Company ID
            include_embeddings: Whether to include text embeddings search
        
        Returns:
            Customer history with quotes, jobs, notes
        """
        history = {}
        
        # Get customer overview (from view)
        customer_result = (
            self.db.table("customer_overview_view")
            .select("*")
            .eq("id", customer_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        if customer_result.data:
            history["customer"] = customer_result.data[0]
        
        # Get past quotes
        quotes_result = (
            self.db.table("quote_details_view")
            .select("*")
            .eq("customer_id", customer_id)
            .eq("company_id", company_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        history["past_quotes"] = quotes_result.data
        
        # Get past jobs
        jobs_result = (
            self.db.table("job_schedule_view")
            .select("*")
            .eq("customer_id", customer_id)
            .eq("company_id", company_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        history["past_jobs"] = jobs_result.data
        
        # Get relevant embeddings (notes, special requests, etc)
        if include_embeddings:
            embeddings_result = (
                self.db.table("document_embeddings")
                .select("content, metadata, created_at")
                .eq("company_id", company_id)
                .contains("metadata", {"customer_id": customer_id})
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
            history["notes_and_context"] = embeddings_result.data
        
        return history
    
    def retrieve_catalog_matches(
        self,
        description: str,
        company_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Find catalog items matching a description
        Uses both vector search and keyword matching
        
        Args:
            description: Item description (e.g., "water heater")
            company_id: Company ID
            limit: Maximum results
        
        Returns:
            List of matching catalog items
        """
        # Vector search on catalog embeddings
        similar_docs = self.vector_store.search_similar(
            query_text=description,
            company_id=company_id,
            entity_type="catalog_item",
            limit=limit
        )
        
        catalog_ids = [doc["entity_id"] for doc in similar_docs]
        
        if not catalog_ids:
            # Fallback to keyword search
            return self._keyword_catalog_search(description, company_id, limit)
        
        # Fetch full catalog items
        result = (
            self.db.table("catalog_items")
            .select("*")
            .in_("id", catalog_ids)
            .eq("company_id", company_id)
            .eq("is_active", True)
            .execute()
        )
        
        # Add similarity scores
        similarity_map = {doc["entity_id"]: doc.get("similarity", 0) for doc in similar_docs}
        for item in result.data:
            item["similarity_score"] = similarity_map.get(item["id"], 0)
        
        # Sort by similarity
        result.data.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        return result.data[:limit]
    
    def retrieve_upsell_suggestions(
        self,
        quote_items: List[Dict[str, Any]],
        company_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Suggest upsells based on quote items
        Finds items commonly purchased together
        
        Args:
            quote_items: Current quote items
            company_id: Company ID
            limit: Maximum suggestions
        
        Returns:
            List of suggested catalog items
        """
        # Build query from current items
        item_names = [item.get("name", "") for item in quote_items]
        query = f"Common additions to: {', '.join(item_names)}"
        
        # Search for similar quotes
        similar_quotes = self.retrieve_similar_quotes(
            query=query,
            company_id=company_id,
            limit=20
        )
        
        # Find items that appear in similar quotes but not in current quote
        current_item_names = set(item_names)
        suggested_items = {}
        
        for quote in similar_quotes:
            if not quote.get("items"):
                continue
            
            for item in quote["items"]:
                item_name = item.get("name", "")
                if item_name not in current_item_names and item_name:
                    # Count frequency
                    if item_name not in suggested_items:
                        suggested_items[item_name] = {
                            "name": item_name,
                            "frequency": 0,
                            "avg_price": 0,
                            "prices": []
                        }
                    
                    suggested_items[item_name]["frequency"] += 1
                    suggested_items[item_name]["prices"].append(item.get("unit_price", 0))
        
        # Calculate average prices
        for item in suggested_items.values():
            if item["prices"]:
                item["avg_price"] = sum(item["prices"]) / len(item["prices"])
            del item["prices"]  # Remove raw prices
        
        # Sort by frequency (most common first)
        suggestions = sorted(
            suggested_items.values(),
            key=lambda x: x["frequency"],
            reverse=True
        )
        
        return suggestions[:limit]
    
    def _keyword_catalog_search(
        self,
        description: str,
        company_id: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Fallback keyword search for catalog
        Uses trigram similarity (already indexed)
        """
        result = (
            self.db.table("catalog_items")
            .select("*")
            .eq("company_id", company_id)
            .eq("is_active", True)
            .ilike("name", f"%{description}%")
            .limit(limit)
            .execute()
        )
        
        return result.data
