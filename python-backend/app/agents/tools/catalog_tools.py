# python-backend/app/agents/tools/catalog_tools.py
from app.services.catalog_service import search_products_service
from uuid import UUID
import json

# Use a default test company ID for now
DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001"

def search_catalog(query: str) -> str:
    """
    Searches the product and service catalog for items matching the query.
    
    Args:
        query: The search term for products or services.
        
    Returns:
        A JSON string of matching catalog items with their names, descriptions, and prices.
    """
    try:
        results = search_products_service(
            query=query, 
            company_id=UUID(DEFAULT_COMPANY_ID)
        )
        return json.dumps(results, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "message": "Could not search catalog"})
