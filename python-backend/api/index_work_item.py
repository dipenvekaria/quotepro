"""
Auto-indexing API endpoint
Call this after creating/updating work items to keep RAG index fresh
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore
from config.database import get_supabase
from config.settings import get_settings
from typing import Optional

router = APIRouter()


class IndexWorkItemRequest(BaseModel):
    work_item_id: str
    company_id: str


class IndexWorkItemResponse(BaseModel):
    success: bool
    message: str
    work_item_id: str


@router.post("/api/index-work-item", response_model=IndexWorkItemResponse)
async def index_work_item(request: IndexWorkItemRequest):
    """
    Index a work item for RAG search
    Call this endpoint after creating/updating work items with status: accepted, scheduled, completed
    
    Example:
        POST /api/index-work-item
        {
            "work_item_id": "abc-123",
            "company_id": "company-456"
        }
    """
    try:
        db = get_supabase()
        settings = get_settings()
        
        # Fetch work item
        response = db.table("work_items")\
            .select("*, line_items:quote_items!quote_items_work_item_id_fkey(*)")\
            .eq("id", request.work_item_id)\
            .single()\
            .execute()
        
        work_item = response.data
        
        if not work_item:
            raise HTTPException(status_code=404, detail="Work item not found")
        
        # Only index if status is accepted, scheduled, or completed
        if work_item.get("status") not in ["accepted", "scheduled", "completed"]:
            return IndexWorkItemResponse(
                success=False,
                message=f"Work item status '{work_item.get('status')}' not eligible for indexing",
                work_item_id=request.work_item_id
            )
        
        # Build content
        parts = []
        
        if work_item.get("job_name"):
            parts.append(work_item["job_name"])
        
        if not parts and work_item.get("description"):
            parts.append(work_item["description"])
        
        if work_item.get("customer_name"):
            parts.append(f"Customer: {work_item['customer_name']}")
        
        line_items = work_item.get("line_items", [])
        if line_items:
            item_names = [item.get("name", "") for item in line_items if item.get("name")]
            if item_names:
                parts.append(f"Items: {', '.join(item_names[:5])}")
        
        if not parts:
            quote_num = work_item.get("quote_number") or f"Quote {work_item.get('id', 'unknown')[:8]}"
            parts.append(quote_num)
        
        content = " ".join(parts)
        
        # Prepare metadata
        metadata = {
            "id": str(work_item["id"]),
            "job_name": work_item.get("job_name"),
            "customer_name": work_item.get("customer_name"),
            "subtotal": float(work_item.get("subtotal", 0)),
            "total": float(work_item.get("total", 0)),
            "tax_amount": float(work_item.get("tax_amount", 0)),
            "discount_amount": float(work_item.get("discount_amount", 0)),
            "status": work_item.get("status"),
            "created_at": work_item.get("created_at"),
            "line_items": line_items
        }
        
        # Index
        gemini = GeminiClient(api_key=settings.gemini_api_key)
        vector_store = VectorStore(db, gemini)
        
        vector_store.save_embedding(
            company_id=request.company_id,
            content=content,
            entity_type="quote",
            entity_id=str(work_item["id"]),
            metadata=metadata
        )
        
        return IndexWorkItemResponse(
            success=True,
            message=f"Successfully indexed work item: {work_item.get('job_name') or 'Unnamed'}",
            work_item_id=request.work_item_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")
