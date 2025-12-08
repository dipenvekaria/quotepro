# python-backend/app/agents/tools/rag_tools.py
"""
RAG (Retrieval Augmented Generation) Tools
These tools retrieve actual data from vector store to ground the agent's responses.
Prevents hallucination by providing real catalog items and past quotes as context.
"""
from app.services.catalog_service import search_products_service
from config.database import get_supabase
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from config.settings import get_settings
from uuid import UUID
import json
from contextvars import ContextVar

# Context variable to store company_id for the current request
_company_id_context: ContextVar[str] = ContextVar('company_id', default=None)

def set_company_id(company_id: str):
    """Set company_id for the current context (call this before running agent)"""
    _company_id_context.set(company_id)


def retrieve_catalog_items(query: str, limit: int = 5) -> str:
    """
    HYBRID RAG Tool: Combines semantic search (embeddings) + keyword search for best coverage.
    Returns ACTUAL catalog items with real prices.
    
    **CRITICAL**: Use ONLY the prices and data from these retrieved items.
    DO NOT make up prices or product details.
    
    **HYBRID APPROACH**:
    1. Semantic Search (vector embeddings) - finds similar items by meaning
    2. Keyword Search (SQL LIKE) - finds exact keyword matches
    3. Combines and deduplicates results for comprehensive coverage
    
    Args:
        query: Description of products/services needed (e.g., "pipe installation", "HVAC repair")
        limit: Maximum number of items to retrieve (default: 5)
        
    Returns:
        JSON array of catalog items with: id, name, description, category, base_price, unit, metadata
        
    Example Output:
        [
          {
            "id": "abc-123",
            "name": "PVC Pipe Installation",
            "description": "Install T-junction on 2-inch PVC pipes",
            "category": "Plumbing",
            "base_price": 125.00,
            "unit": "job"
          }
        ]
    """
    company_id = _company_id_context.get()
    
    if not company_id:
        error_msg = {
            "error": "company_id required", 
            "message": "Cannot retrieve catalog without company_id"
        }
        print(f"❌ Catalog retrieval failed: {error_msg}")
        return json.dumps(error_msg)
    
    try:
        print(f"🔍 HYBRID RAG: Retrieving catalog for query='{query}' company_id='{company_id}' limit={limit}")
        
        # 1. SEMANTIC SEARCH (Vector/Embeddings) - understands meaning
        print(f"   📊 Step 1: Semantic search via embeddings...")
        semantic_results = search_products_service(
            query=query, 
            company_id=UUID(company_id),
            limit=limit
        )
        
        # 2. KEYWORD SEARCH (SQL) - exact matches
        print(f"   📊 Step 2: Keyword search via SQL...")
        from config.database import get_supabase
        db = get_supabase()
        
        # Extract keywords from query
        keywords = [word.lower() for word in query.split() if len(word) > 2]
        
        keyword_results = []
        if keywords:
            # Build OR condition for all keywords
            conditions = []
            for kw in keywords[:3]:  # Limit to first 3 keywords
                conditions.append(f'name.ilike.%{kw}%')
                conditions.append(f'description.ilike.%{kw}%')
            
            keyword_search = db.table('catalog_items')\
                .select('*')\
                .eq('company_id', company_id)\
                .eq('is_active', True)\
                .or_(','.join(conditions))\
                .limit(limit)\
                .execute()
            
            keyword_results = keyword_search.data
        
        # 3. MERGE AND DEDUPLICATE
        print(f"   � Step 3: Merging results...")
        seen_ids = set()
        merged_results = []
        
        # Add semantic results first (higher quality)
        for item in semantic_results:
            if item and item.get('id'):
                item_id = str(item['id'])
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    merged_results.append(item)
        
        # Add keyword results that weren't found semantically
        for item in keyword_results:
            if item and item.get('id'):
                item_id = str(item['id'])
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    # Convert to same format as semantic results
                    merged_results.append(item)
        
        # Limit final results
        final_results = merged_results[:limit]
        
        # Convert UUIDs to strings
        def convert_uuids(obj):
            if isinstance(obj, UUID):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: convert_uuids(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_uuids(item) for item in obj]
            else:
                return obj
        
        serializable_results = convert_uuids(final_results)
        
        print(f"📦 HYBRID RAG: Retrieved {len(serializable_results)} items ({len(semantic_results)} semantic + {len(keyword_results)} keyword)")
        if serializable_results:
            print(f"   └─ Top items: {[item.get('name', 'unnamed')[:30] for item in serializable_results[:3]]}")
        
        return json.dumps(serializable_results, indent=2, default=str)
        
    except Exception as e:
        import traceback
        error_msg = {
            "error": str(e), 
            "message": "Failed to retrieve catalog items",
            "traceback": traceback.format_exc()
        }
        print(f"❌ RAG catalog retrieval error: {error_msg}")
        return json.dumps(error_msg)


def retrieve_similar_quotes(query: str, limit: int = 3) -> str:
    """
    HYBRID RAG Tool: Combines semantic search (embeddings) + keyword search for recent quotes.
    Returns ACTUAL past quotes with real pricing for reference.
    
    **CRITICAL**: Use these for pricing trends and patterns, especially recent quotes.
    
    **HYBRID APPROACH**:
    1. Semantic Search (vector embeddings) - finds similar quotes by job description
    2. Keyword Search (SQL LIKE) - finds exact keyword matches in job names
    3. Recent Filter (created_at DESC) - prioritizes recent pricing data
    4. Combines and deduplicates results for comprehensive coverage
    
    Args:
        query: Job description to find similar quotes (e.g., "HVAC installation", "plumbing repair")
        limit: Maximum number of past quotes to retrieve (default: 3)
        
    Returns:
        JSON array of past quotes with: job_name, line_items, subtotal, total, customer_name, created_at
        
    Example Output:
        [
          {
            "job_name": "HVAC System Installation - 3 Ton",
            "customer_name": "John Smith",
            "line_items": [
              {"name": "Carrier 3-Ton AC Unit", "quantity": 1, "unit_price": 2500.00, "total": 2500.00},
              {"name": "Installation Labor", "quantity": 8, "unit_price": 125.00, "total": 1000.00}
            ],
            "subtotal": 3500.00,
            "total": 3780.00,
            "created_at": "2025-12-01"
          }
        ]
    """
    company_id = _company_id_context.get()
    
    if not company_id:
        error_msg = {
            "error": "company_id required",
            "message": "Cannot retrieve quotes without company_id"
        }
        print(f"❌ Quote retrieval failed: {error_msg}")
        return json.dumps(error_msg)
    
    try:
        print(f"🔍 HYBRID RAG: Retrieving quotes for query='{query}' company_id='{company_id}' limit={limit}")
        
        # 1. SEMANTIC SEARCH (Vector/Embeddings) - understands job similarity
        print(f"   📊 Step 1: Semantic search via embeddings...")
        settings = get_settings()
        supabase_client = get_supabase()
        gemini_client = GeminiClient(api_key=settings.gemini_api_key)
        vector_store = VectorStore(supabase_client, gemini_client)
        
        semantic_results = vector_store.search_similar(
            query_text=query,
            company_id=company_id,
            entity_type="quote",
            limit=limit,
            threshold=0.6
        )
        
        # 2. KEYWORD SEARCH (SQL) - exact job name matches + recent quotes
        print(f"   📊 Step 2: Keyword search via SQL + recent filter...")
        db = get_supabase()
        
        # Extract keywords from query
        keywords = [word.lower() for word in query.split() if len(word) > 2]
        
        keyword_results = []
        if keywords:
            # Build OR condition for all keywords in job_name
            conditions = []
            for kw in keywords[:3]:
                conditions.append(f'job_name.ilike.%{kw}%')
            
            keyword_search = db.table('work_items')\
                .select('*, line_items:quote_items!quote_items_work_item_id_fkey(*)')\
                .eq('company_id', company_id)\
                .in_('status', ['accepted', 'scheduled', 'completed'])\
                .or_(','.join(conditions))\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            keyword_results = keyword_search.data
        
        # Also get recent quotes (last 30 days) regardless of keywords
        print(f"   📊 Step 3: Recent quotes filter...")
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        recent_search = db.table('work_items')\
            .select('*, line_items:quote_items!quote_items_work_item_id_fkey(*)')\
            .eq('company_id', company_id)\
            .in_('status', ['accepted', 'scheduled', 'completed'])\
            .gte('created_at', thirty_days_ago)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        recent_results = recent_search.data
        
        # 3. MERGE AND DEDUPLICATE
        print(f"   🔄 Step 4: Merging results...")
        seen_ids = set()
        merged_results = []
        
        # Add semantic results first (highest quality)
        for item in semantic_results:
            if item and item.get('id'):
                item_id = str(item.get('id'))
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    merged_results.append(item.get('metadata', {}))
        
        # Add keyword results that weren't found semantically
        for item in keyword_results:
            if item and item.get('id'):
                item_id = str(item['id'])
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    # Format for agent
                    formatted = {
                        'id': item_id,
                        'job_name': item.get('job_name'),
                        'customer_name': item.get('customer_name'),
                        'subtotal': float(item.get('subtotal', 0)),
                        'total': float(item.get('total', 0)),
                        'created_at': item.get('created_at'),
                        'line_items': item.get('line_items', [])
                    }
                    merged_results.append(formatted)
        
        # Add recent results for pricing context
        for item in recent_results:
            if item and item.get('id'):
                item_id = str(item['id'])
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    formatted = {
                        'id': item_id,
                        'job_name': item.get('job_name'),
                        'customer_name': item.get('customer_name'),
                        'subtotal': float(item.get('subtotal', 0)),
                        'total': float(item.get('total', 0)),
                        'created_at': item.get('created_at'),
                        'line_items': item.get('line_items', [])
                    }
                    merged_results.append(formatted)
        
        # Limit final results
        final_results = merged_results[:limit]
        
        # Convert UUIDs to strings
        def convert_uuids(obj):
            if isinstance(obj, UUID):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: convert_uuids(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_uuids(item) for item in obj]
            else:
                return obj
        
        serializable_results = convert_uuids(final_results)
        
        print(f"📋 HYBRID RAG: Retrieved {len(serializable_results)} quotes ({len(semantic_results)} semantic + {len(keyword_results)} keyword + {len(recent_results)} recent)")
        if serializable_results:
            jobs = [(r.get('job_name') or 'unnamed')[:40] for r in serializable_results[:3]]
            print(f"   └─ Similar jobs: {jobs}")
        
        return json.dumps(serializable_results, indent=2, default=str)
        
    except Exception as e:
        import traceback
        error_msg = {
            "error": str(e),
            "message": "Failed to retrieve similar quotes",
            "traceback": traceback.format_exc()
        }
        print(f"❌ HYBRID RAG quote retrieval error: {error_msg}")
        return json.dumps(error_msg)
