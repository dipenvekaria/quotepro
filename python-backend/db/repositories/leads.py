"""
Lead repository for managing leads_new table
"""
from .base import BaseRepository
from supabase import Client
from typing import List, Dict, Any


class LeadRepository(BaseRepository):
    """Repository for leads_new table"""
    
    def __init__(self, db: Client):
        super().__init__(db, "leads_new")
    
    def find_by_status(
        self,
        company_id: str,
        status: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Find leads by status
        
        Args:
            company_id: Company ID
            status: Lead status (new, contacted, qualified, won, lost)
            limit: Maximum results
        
        Returns:
            List of leads
        """
        return self.find_all(
            company_id=company_id,
            filters={"status": status},
            limit=limit,
            order_by="created_at",
            ascending=False
        )
    
    def find_by_urgency(
        self,
        company_id: str,
        urgency: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Find leads by urgency level
        
        Args:
            company_id: Company ID
            urgency: Urgency level (low, medium, high, urgent)
            limit: Maximum results
        
        Returns:
            List of leads
        """
        return self.find_all(
            company_id=company_id,
            filters={"urgency": urgency},
            limit=limit,
            order_by="created_at",
            ascending=False
        )
    
    def find_active_pipeline(self, company_id: str) -> List[Dict[str, Any]]:
        """
        Find active leads in the pipeline (new, contacted, qualified)
        
        Args:
            company_id: Company ID
        
        Returns:
            List of active leads
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("company_id", company_id)
            .in_("status", ["new", "contacted", "qualified"])
            .order("urgency", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data
