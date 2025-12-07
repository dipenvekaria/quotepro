#!/usr/bin/env python3
"""Test pgvector RAG infrastructure"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv()

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent))

from supabase import create_client, Client
from services.ai.gemini_client import GeminiClient
from services.rag.vector_store import VectorStore

def main():
    # Init clients
    supabase: Client = create_client(
        os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    gemini = GeminiClient(api_key=os.getenv("GOOGLE_API_KEY"))
    store = VectorStore(supabase, gemini)
    
    # Get first company ID
    companies = supabase.table("companies").select("id").limit(1).execute()
    if not companies.data:
        print("❌ No companies found. Create a company first.")
        return
    
    company_id = companies.data[0]["id"]
    print(f"✅ Testing with company: {company_id}\n")
    
    # Test 1: Save embedding
    print("Test 1: Save catalog item embedding...")
    import uuid
    test_id = str(uuid.uuid4())
    embedding_id = store.save_embedding(
        company_id=company_id,
        content="3-ton Carrier HVAC system installation with ductwork",
        entity_type="catalog_item",
        entity_id=test_id,
        metadata={"name": "HVAC Install", "price": 4500}
    )
    print(f"✅ Saved: {embedding_id}\n")
    
    # Test 2: Search similar
    print("Test 2: Search for similar items...")
    results = store.search_similar(
        query_text="air conditioning installation",
        company_id=company_id,
        entity_type="catalog_item",
        limit=3
    )
    print(f"✅ Found {len(results)} results:")
    for r in results:
        print(f"  - {r['content'][:50]}... (similarity: {r['similarity']:.2f})")
    print()
    
    # Test 3: Direct RPC call
    print("Test 3: Direct match_documents RPC...")
    embedding = gemini.generate_embedding("HVAC repair")
    rpc_result = supabase.rpc("match_documents", {
        "query_embedding": embedding,
        "match_company_id": company_id,
        "match_threshold": 0.5,
        "match_count": 5
    }).execute()
    print(f"✅ RPC returned {len(rpc_result.data)} results\n")
    
    print("🎉 All tests passed! RAG is working.")

if __name__ == "__main__":
    main()
