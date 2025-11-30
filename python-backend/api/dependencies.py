"""
FastAPI dependencies for dependency injection
Provides database sessions, auth, etc.
"""
from fastapi import Depends
from supabase import Client
from config.database import get_db_session
from services.ai.gemini_client import get_gemini_client, GeminiClient
from services.rag.vector_store import VectorStore
from services.rag.retriever import Retriever


def get_vector_store(
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
) -> VectorStore:
    """Get VectorStore instance"""
    return VectorStore(db, gemini)


def get_retriever(
    db: Client = Depends(get_db_session),
    vector_store: VectorStore = Depends(get_vector_store)
) -> Retriever:
    """Get Retriever instance"""
    return Retriever(db, vector_store)
