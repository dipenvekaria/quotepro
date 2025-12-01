"""
API routes for catalog indexing
Provides endpoints to trigger and monitor catalog embedding generation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from config.settings import get_settings
from db.supabase_client import get_supabase_client
from services.ai.gemini_client import GeminiClient
from services.auto_indexer import get_auto_indexer

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

# Request/Response models
class IndexRequest(BaseModel):
    company_id: str
    force_reindex: bool = False  # Re-index even if embeddings exist

class IndexResponse(BaseModel):
    status: str
    message: str
    total: int
    indexed: int
    failed: int


@router.post("/index", response_model=IndexResponse)
async def index_catalog(request: IndexRequest, background_tasks: BackgroundTasks):
    """
    Index all pricing catalog items for a company
    Generates embeddings for semantic search
    
    Can be triggered:
    1. Manually from Settings page
    2. Automatically on first company setup
    3. On-demand via API
    
    Example:
        POST /api/catalog/index
        {
            "company_id": "abc-123",
            "force_reindex": false
        }
    """
    try:
        settings = get_settings()
        db = get_supabase_client()
        gemini = GeminiClient(api_key=settings.GEMINI_API_KEY)
        indexer = get_auto_indexer(db, gemini)
        
        # Run indexing
        result = await indexer.index_company_catalog(request.company_id)
        
        return IndexResponse(
            status="success",
            message=f"Indexed {result['indexed']} of {result['total']} catalog items",
            total=result["total"],
            indexed=result["indexed"],
            failed=result["failed"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class IndexItemRequest(BaseModel):
    item_id: str
    company_id: str
    name: str
    category: Optional[str] = None
    price: float
    description: Optional[str] = None
    tags: Optional[list] = None
    is_default: bool = False


@router.post("/index-item")
async def index_single_item(request: IndexItemRequest):
    """
    Index a single pricing item
    Called automatically when pricing item is created/updated
    
    Example:
        POST /api/catalog/index-item
        {
            "item_id": "item-uuid",
            "company_id": "company-uuid",
            "name": "Water Heater Installation",
            "category": "Plumbing",
            "price": 1200.00,
            "description": "Standard 40-gallon water heater"
        }
    """
    try:
        settings = get_settings()
        db = get_supabase_client()
        gemini = GeminiClient(api_key=settings.GEMINI_API_KEY)
        indexer = get_auto_indexer(db, gemini)
        
        # Convert request to dict for indexer
        item_dict = {
            "id": request.item_id,
            "company_id": request.company_id,
            "name": request.name,
            "category": request.category,
            "price": request.price,
            "description": request.description,
            "tags": request.tags,
            "is_default": request.is_default
        }
        
        success = await indexer.index_item(item_dict)
        
        if success:
            return {"status": "success", "message": f"Indexed item: {request.name}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to index item")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/index-item/{item_id}")
async def delete_item_embedding(item_id: str):
    """
    Delete embedding when pricing item is deleted
    Called automatically from frontend when item is deleted
    
    Example:
        DELETE /api/catalog/index-item/{item-uuid}
    """
    try:
        settings = get_settings()
        db = get_supabase_client()
        gemini = GeminiClient(api_key=settings.GEMINI_API_KEY)
        indexer = get_auto_indexer(db, gemini)
        
        success = await indexer.delete_item_embedding(item_id)
        
        if success:
            return {"status": "success", "message": f"Deleted embedding for item: {item_id}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete embedding")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class IndexStatusResponse(BaseModel):
    total_items: int
    indexed_items: int
    pending_items: int
    index_percentage: float
    is_complete: bool


@router.get("/index-status/{company_id}", response_model=IndexStatusResponse)
async def get_index_status(company_id: str):
    """
    Check indexing status for a company
    Shows how many items have embeddings vs total items
    
    Example:
        GET /api/catalog/index-status/abc-123
        
        Response:
        {
            "total_items": 47,
            "indexed_items": 47,
            "pending_items": 0,
            "index_percentage": 100.0,
            "is_complete": true
        }
    """
    try:
        db = get_supabase_client()
        
        # Count total pricing items
        total_response = db.table("pricing_items")\
            .select("id", count="exact")\
            .eq("company_id", company_id)\
            .execute()
        
        total = total_response.count or 0
        
        # Count indexed items (have embeddings)
        indexed_response = db.table("document_embeddings")\
            .select("id", count="exact")\
            .eq("company_id", company_id)\
            .eq("entity_type", "catalog_item")\
            .execute()
        
        indexed = indexed_response.count or 0
        pending = total - indexed
        percentage = (indexed / total * 100) if total > 0 else 0
        
        return IndexStatusResponse(
            total_items=total,
            indexed_items=indexed,
            pending_items=pending,
            index_percentage=round(percentage, 1),
            is_complete=(pending == 0 and total > 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
