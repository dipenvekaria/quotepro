# python-backend/app/agents/tools/catalog_tools.py
from app.services.catalog_service import search_products_service
from uuid import UUID
import json
from contextvars import ContextVar

# Context variable to store company_id for the current request
_company_id_context: ContextVar[str] = ContextVar('company_id', default=None)

def set_company_id(company_id: str):
    """Set company_id for the current context (call this before running agent)"""
    _company_id_context.set(company_id)

def search_catalog(query: str) -> str:
    """
    Searches the product and service catalog for items matching the query.
    
    Args:
        query: The search term for products or services.
        
    Returns:
        A JSON string of matching catalog items with their names, descriptions, and prices.
    """
    # Get company_id from context
    company_id = _company_id_context.get()
    
    if not company_id:
        error_msg = {"error": "company_id required", "message": "Cannot search catalog without company_id. Company ID must be set in context."}
        print(f"❌ Catalog search failed: {error_msg}")
        return json.dumps(error_msg)
    
    try:
        print(f"🔍 Searching catalog for query='{query}' company_id='{company_id}'")
        results = search_products_service(
            query=query, 
            company_id=UUID(company_id)
        )
        print(f"📦 Catalog search returned {len(results)} items")
        print(f"🔧 DEBUG: First result type: {type(results[0]) if results else 'empty'}")
        
        # Convert any UUID objects to strings for JSON serialization
        def convert_uuids(obj):
            """Recursively convert UUID objects to strings"""
            if isinstance(obj, UUID):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: convert_uuids(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_uuids(item) for item in obj]
            else:
                return obj
        
        serializable_results = convert_uuids(results)
        
        if serializable_results:
            print(f"   First item: {serializable_results[0].get('name', 'unnamed')}")
        
        return json.dumps(serializable_results, indent=2, default=str)  # default=str as fallback
    except Exception as e:
        import traceback
        error_msg = {"error": str(e), "message": "Could not search catalog", "traceback": traceback.format_exc()}
        print(f"❌ Catalog search error: {error_msg}")
        return json.dumps(error_msg)
