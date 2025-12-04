"""
Quote repository for managing quotes table
"""
from .base import BaseRepository
from supabase import Client
from typing import List, Dict, Any, Optional


class QuoteRepository(BaseRepository):
    """Repository for quotes table"""
    
    def __init__(self, db: Client):
        super().__init__(db, "quotes")
    
    def find_with_details(self, quote_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        """
        Find quote using quote_details_view (includes customer, items, creator)
        
        Args:
            quote_id: Quote ID
            company_id: Company ID
        
        Returns:
            Quote with full details or None
        """
        result = (
            self.db.table("quote_details_view")
            .select("*")
            .eq("id", quote_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return result.data[0] if result.data else None
    
    def find_by_status(
        self,
        company_id: str,
        status: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Find quotes by status
        
        Args:
            company_id: Company ID
            status: Quote status (draft, sent, accepted, rejected, expired)
            limit: Maximum results
        
        Returns:
            List of quotes
        """
        return self.find_all(
            company_id=company_id,
            filters={"status": status},
            limit=limit,
            order_by="created_at",
            ascending=False
        )
    
    def find_recent(self, company_id: str, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Find recent quotes (using quote_details_view for performance)
        
        Args:
            company_id: Company ID
            days: Number of days to look back
            limit: Maximum results
        
        Returns:
            List of recent quotes with details
        """
        result = (
            self.db.table("quote_details_view")
            .select("*")
            .eq("company_id", company_id)
            .gte("created_at", f"now() - interval '{days} days'")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        
        return result.data
    
    def create_with_items(
        self,
        quote_data: Dict[str, Any],
        items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create quote with line items (transactional)
        
        Args:
            quote_data: Quote fields (quote_number, customer_id, etc)
            items: List of line items
        
        Returns:
            Created quote with items
        """
        # Create quote
        quote = self.create(quote_data)
        
        # Add quote_id to each item
        for item in items:
            item["quote_id"] = quote["id"]
        
        # Insert all items
        self.db.table("quote_items").insert(items).execute()
        
        # Return quote with items using view
        return self.find_with_details(quote["id"], quote_data["company_id"])
    
    def update_status(
        self,
        quote_id: str,
        company_id: str,
        status: str,
        timestamp_field: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update quote status with automatic timestamp
        
        Args:
            quote_id: Quote ID
            company_id: Company ID
            status: New status
            timestamp_field: Field to update (sent_at, viewed_at, accepted_at, rejected_at)
        
        Returns:
            Updated quote
        """
        update_data = {"status": status}
        
        if timestamp_field:
            update_data[timestamp_field] = "now()"
        
        return self.update(quote_id, company_id, update_data)
