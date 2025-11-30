"""
Catalog repository for managing catalog_items table
"""
from .base import BaseRepository
from supabase import Client
from typing import List, Dict, Any, Optional


class CatalogRepository(BaseRepository):
    """Repository for catalog_items table"""
    
    def __init__(self, db: Client):
        super().__init__(db, "catalog_items")
    
    def find_all_active(self, company_id: str) -> List[Dict[str, Any]]:
        """
        Find all active catalog items for a company
        
        Args:
            company_id: Company ID
        
        Returns:
            List of active catalog items
        """
        return self.find_all(
            company_id=company_id,
            filters={"is_active": True},
            limit=1000,  # Catalogs can be large
            order_by="category",
            ascending=True
        )
    
    def find_by_category(
        self,
        company_id: str,
        category: str,
        subcategory: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Find catalog items by category/subcategory
        
        Args:
            company_id: Company ID
            category: Category name (e.g., "HVAC", "Plumbing")
            subcategory: Optional subcategory (e.g., "Air Conditioning")
        
        Returns:
            List of catalog items
        """
        filters = {"category": category, "is_active": True}
        if subcategory:
            filters["subcategory"] = subcategory
        
        return self.find_all(
            company_id=company_id,
            filters=filters,
            limit=500,
            order_by="name",
            ascending=True
        )
    
    def search_by_name(
        self,
        company_id: str,
        search_term: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search catalog items by name (uses trigram index for fuzzy matching)
        
        Args:
            company_id: Company ID
            search_term: Name to search for
            limit: Maximum results
        
        Returns:
            List of matching catalog items
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("company_id", company_id)
            .eq("is_active", True)
            .ilike("name", f"%{search_term}%")
            .limit(limit)
            .execute()
        )
        
        return result.data
    
    def search_by_tags(
        self,
        company_id: str,
        tags: List[str],
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search catalog items by tags (uses GIN array index)
        
        Args:
            company_id: Company ID
            tags: List of tags to search for
            limit: Maximum results
        
        Returns:
            List of matching catalog items
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("company_id", company_id)
            .eq("is_active", True)
            .contains("tags", tags)
            .limit(limit)
            .execute()
        )
        
        return result.data
    
    def bulk_create(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Bulk insert catalog items (for CSV imports)
        
        Args:
            items: List of catalog item dicts
        
        Returns:
            List of created items
        """
        result = self.db.table(self.table_name).insert(items).execute()
        return result.data
