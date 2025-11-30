"""
Customer repository for managing customers_new table
"""
from .base import BaseRepository
from supabase import Client
from typing import List, Dict, Any, Optional


class CustomerRepository(BaseRepository):
    """Repository for customers_new table"""
    
    def __init__(self, db: Client):
        super().__init__(db, "customers_new")
    
    def find_by_email(self, email: str, company_id: str) -> Optional[Dict[str, Any]]:
        """
        Find customer by email
        
        Args:
            email: Customer email
            company_id: Company ID
        
        Returns:
            Customer or None
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("email", email.lower())
            .eq("company_id", company_id)
            .execute()
        )
        
        return result.data[0] if result.data else None
    
    def find_with_overview(self, customer_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        """
        Find customer using customer_overview_view (includes stats)
        
        Args:
            customer_id: Customer ID
            company_id: Company ID
        
        Returns:
            Customer with aggregated stats or None
        """
        result = (
            self.db.table("customer_overview_view")
            .select("*")
            .eq("id", customer_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return result.data[0] if result.data else None
    
    def search_by_name(
        self,
        company_id: str,
        search_term: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search customers by name (uses trigram index for fuzzy matching)
        
        Args:
            company_id: Company ID
            search_term: Name to search for
            limit: Maximum results
        
        Returns:
            List of matching customers
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("company_id", company_id)
            .ilike("name", f"%{search_term}%")
            .limit(limit)
            .execute()
        )
        
        return result.data
    
    def create_with_address(
        self,
        customer_data: Dict[str, Any],
        address_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create customer with optional primary address
        
        Args:
            customer_data: Customer fields
            address_data: Optional address fields
        
        Returns:
            Created customer
        """
        # Create customer
        customer = self.create(customer_data)
        
        # Add address if provided
        if address_data:
            address_data["customer_id"] = customer["id"]
            address_data["is_primary"] = True
            self.db.table("customer_addresses").insert(address_data).execute()
        
        return customer
