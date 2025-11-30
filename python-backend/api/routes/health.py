"""
Health check and status endpoints
"""
from fastapi import APIRouter
import os

router = APIRouter()


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "QuotePro Python Backend",
        "version": "2.0.0",
        "status": "running"
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "supabase_configured": bool(os.getenv("NEXT_PUBLIC_SUPABASE_URL"))
    }
