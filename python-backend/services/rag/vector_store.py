"""
Vector Store for managing embeddings in PostgreSQL + pgvector
Handles CRUD operations for document_embeddings table
"""
from supabase import Client
from services.ai.gemini_client import GeminiClient
from typing import List, Dict, Any, Optional
import json


class VectorStore:
    """
    Service for storing and searching vector embeddings
    Uses document_embeddings table with pgvector extension
    """
    
    def __init__(self, db: Client, gemini: GeminiClient):
        """
        Initialize vector store
        
        Args:
            db: Supabase client
            gemini: Gemini client for embedding generation
        """
        self.db = db
        self.gemini = gemini
        self.table = "document_embeddings"
    
    def save_embedding(
        self,
        company_id: str,
        content: str,
        entity_type: str,
        entity_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate and save embedding for a document
        
        Args:
            company_id: Company ID (for multi-tenant isolation)
            content: Text content to embed
            entity_type: Type of entity (quote, job, customer, catalog_item)
            entity_id: ID of the entity
            metadata: Optional metadata (customer name, tags, etc)
        
        Returns:
            Embedding ID
        
        Example:
            store.save_embedding(
                company_id="abc-123",
                content="HVAC system installation 3-ton Carrier",
                entity_type="quote",
                entity_id="quote-uuid-here",
                metadata={"customer": "John Smith", "total": 4500}
            )
        """
        # Generate embedding vector
        embedding = self.gemini.generate_embedding(content)
        
        # Prepare data
        data = {
            "company_id": company_id,
            "content": content,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "embedding": embedding,  # pgvector handles list[float] → vector
            "metadata": metadata or {}
        }
        
        # Insert into database
        result = self.db.table(self.table).insert(data).execute()
        
        print(f"✅ Saved embedding for {entity_type} {entity_id}")
        return result.data[0]["id"]
    
    def search_similar(
        self,
        query_text: str,
        company_id: str,
        entity_type: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity
        
        Args:
            query_text: Text to search for
            company_id: Company ID (security isolation)
            entity_type: Optional filter by entity type
            limit: Maximum results
            threshold: Similarity threshold (0-1, higher = more similar)
        
        Returns:
            List of similar documents with similarity scores
        
        Example:
            results = store.search_similar(
                query_text="tankless water heater",
                company_id="abc-123",
                entity_type="quote",
                limit=5
            )
            # Returns: [
            #   {"content": "...", "similarity": 0.92, "metadata": {...}},
            #   {"content": "...", "similarity": 0.88, "metadata": {...}}
            # ]
        """
        # Generate embedding for query
        query_embedding = self.gemini.generate_embedding(query_text)
        
        # Build RPC call for vector search
        # Using Supabase RPC to call custom PostgreSQL function
        params = {
            "query_embedding": query_embedding,
            "match_company_id": company_id,
            "match_entity_type": entity_type,
            "match_threshold": threshold,
            "match_count": limit
        }
        
        # Call the vector search function (we'll create this in migration)
        result = self.db.rpc("match_documents", params).execute()
        
        return result.data
    
    def update_embedding(
        self,
        embedding_id: str,
        company_id: str,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update existing embedding
        
        Args:
            embedding_id: Embedding ID
            company_id: Company ID (security)
            content: New content (will regenerate embedding)
            metadata: New metadata
        
        Returns:
            True if updated
        """
        update_data = {}
        
        if content:
            # Regenerate embedding
            embedding = self.gemini.generate_embedding(content)
            update_data["content"] = content
            update_data["embedding"] = embedding
        
        if metadata:
            update_data["metadata"] = metadata
        
        if not update_data:
            return False
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", embedding_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return len(result.data) > 0
    
    def delete_embedding(self, embedding_id: str, company_id: str) -> bool:
        """
        Delete embedding
        
        Args:
            embedding_id: Embedding ID
            company_id: Company ID (security)
        
        Returns:
            True if deleted
        """
        result = (
            self.db.table(self.table)
            .delete()
            .eq("id", embedding_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return len(result.data) > 0
    
    def delete_by_entity(
        self,
        entity_type: str,
        entity_id: str,
        company_id: str
    ) -> int:
        """
        Delete all embeddings for an entity (e.g., when quote is deleted)
        
        Args:
            entity_type: Entity type
            entity_id: Entity ID
            company_id: Company ID
        
        Returns:
            Number of embeddings deleted
        """
        result = (
            self.db.table(self.table)
            .delete()
            .eq("entity_type", entity_type)
            .eq("entity_id", entity_id)
            .eq("company_id", company_id)
            .execute()
        )
        
        return len(result.data)
    
    def bulk_create_embeddings(
        self,
        documents: List[Dict[str, Any]],
        company_id: str
    ) -> List[str]:
        """
        Bulk create embeddings for multiple documents
        Useful for initial data migration or batch processing
        
        Args:
            documents: List of docs with {content, entity_type, entity_id, metadata}
            company_id: Company ID
        
        Returns:
            List of created embedding IDs
        """
        embeddings_data = []
        
        for doc in documents:
            embedding = self.gemini.generate_embedding(doc["content"])
            embeddings_data.append({
                "company_id": company_id,
                "content": doc["content"],
                "entity_type": doc["entity_type"],
                "entity_id": doc["entity_id"],
                "embedding": embedding,
                "metadata": doc.get("metadata", {})
            })
        
        result = self.db.table(self.table).insert(embeddings_data).execute()
        
        print(f"✅ Created {len(result.data)} embeddings in bulk")
        return [item["id"] for item in result.data]
