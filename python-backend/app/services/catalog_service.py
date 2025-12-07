# python-backend/app/services/catalog_service.py
from config.database import get_supabase
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from config.settings import get_settings
from typing import List, Dict

def search_products_service(query: str, company_id: str, limit: int = 10) -> List[Dict]:
    """
    Performs a semantic search across the catalog for a given company.
    
    Args:
        query: The user's search query.
        company_id: The ID of the company to search within.
        limit: The maximum number of results to return.
        
    Returns:
        A list of matching catalog items.
    """
    settings = get_settings()
    supabase_client = get_supabase()
    gemini_client = GeminiClient(api_key=settings.gemini_api_key)
    vector_store = VectorStore(supabase_client, gemini_client)
    
    results = vector_store.search_similar(
        query_text=query,
        company_id=company_id,
        entity_type="catalog_item",
        limit=limit
    )
    
    # The vector store returns a list of dicts with 'metadata' and 'similarity'.
    # We just want to return the metadata.
    return [r.get("metadata", {}) for r in results]

