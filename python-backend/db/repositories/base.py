"""
Base repository with common CRUD operations
"""
from supabase import Client
from typing import List, Dict, Any, Optional


class BaseRepository:
    """
    Base repository class with common database operations
    All repositories inherit from this class
    """
    
    def __init__(self, db: Client, table_name: str):
        """
        Initialize repository
        
        Args:
            db: Supabase client
            table_name: Name of the database table
        """
        self.db = db
        self.table_name = table_name
    
    def find_all(
        self,
        company_id: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        order_by: str = "created_at",
        ascending: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Find all records for a company with optional filters
        
        Args:
            company_id: Company ID for multi-tenant isolation
            filters: Additional filters (e.g., {"status": "active"})
            limit: Maximum number of records
            order_by: Column to sort by
            ascending: Sort direction
        
        Returns:
            List of records
        """
        query = self.db.table(self.table_name).select("*").eq("company_id", company_id)
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        query = query.order(order_by, desc=not ascending).limit(limit)
        
        result = query.execute()
        return result.data
    
    def find_by_id(self, record_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        """
        Find a single record by ID (with company isolation)
        
        Args:
            record_id: Record ID
            company_id: Company ID for security
        
        Returns:
            Record dict or None if not found
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("id", record_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return result.data[0] if result.data else None
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new record
        
        Args:
            data: Record data (must include company_id)
        
        Returns:
            Created record
        """
        result = self.db.table(self.table_name).insert(data).execute()
        return result.data[0]
    
    def update(
        self,
        record_id: str,
        company_id: str,
        data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a record by ID
        
        Args:
            record_id: Record ID
            company_id: Company ID for security
            data: Fields to update
        
        Returns:
            Updated record or None if not found
        """
        result = (
            self.db.table(self.table_name)
            .update(data)
            .eq("id", record_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return result.data[0] if result.data else None
    
    def delete(self, record_id: str, company_id: str) -> bool:
        """
        Delete a record by ID
        
        Args:
            record_id: Record ID
            company_id: Company ID for security
        
        Returns:
            True if deleted, False if not found
        """
        result = (
            self.db.table(self.table_name)
            .delete()
            .eq("id", record_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return len(result.data) > 0
    
    def count(self, company_id: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records for a company
        
        Args:
            company_id: Company ID
            filters: Additional filters
        
        Returns:
            Record count
        """
        query = self.db.table(self.table_name).select("*", count="exact").eq("company_id", company_id)
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        result = query.execute()
        return result.count
