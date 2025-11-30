# PHASE 4: AI ENHANCEMENTS & RAG - TECH SPEC

**Status:** 📋 Planning  
**Duration:** 2 weeks  
**Risk Level:** 🟢 LOW (Additive features, no breaking changes)  
**Dependencies:** Phase 1 & 2 complete  

---

## 📋 OBJECTIVE

Enhance AI capabilities with RAG (Retrieval Augmented Generation), embeddings, semantic search, and intelligent agents. Make QuotePro AI-first with context-aware responses using company knowledge base.

**Key Goals:**
1. Implement RAG pipeline (embed → store → retrieve → generate)
2. Create vector search for catalog, policies, FAQs
3. Build intelligent agents for specific tasks
4. Add AI conversation tracking and analytics
5. Enable company-specific knowledge customization
6. Improve quote accuracy with historical context

---

## 🎯 SUCCESS CRITERIA

- ✅ RAG retrieval working (<500ms)
- ✅ Quote generation uses relevant catalog context automatically
- ✅ Agents can answer company-specific questions
- ✅ Embedding generation pipeline operational
- ✅ Vector search returns relevant results (>80% accuracy)
- ✅ AI costs tracked per company
- ✅ Conversation history preserved for context

---

## 🏗️ RAG ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG PIPELINE FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. INDEXING (One-time or periodic)
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │   Documents  │───▶│  Chunking    │───▶│  Embedding   │
   │ (Catalog,    │    │  (500 chars) │    │  (Gemini)    │
   │  Policies)   │    │              │    │              │
   └──────────────┘    └──────────────┘    └──────────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │  Vector Store    │
                                          │  (pgvector)      │
                                          └──────────────────┘

2. RETRIEVAL (During quote generation)
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ User Query   │───▶│  Embed Query │───▶│ Vector Search│
   │ "Install AC" │    │              │    │ (similarity) │
   └──────────────┘    └──────────────┘    └──────────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │ Top 5 Relevant   │
                                          │ Documents        │
                                          └──────────────────┘

3. AUGMENTATION (Add context to prompt)
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ Retrieved    │───▶│ Build Prompt │───▶│ Generate     │
   │ Docs         │    │ with Context │    │ Quote        │
   └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 📦 NEW FEATURES

### **Feature 1: Catalog Embeddings**

**What:** Automatically embed all catalog items for semantic search

**Why:** AI can find relevant products even with vague descriptions
- User says "air conditioner" → Finds "HVAC Cooling Unit 3-Ton"
- User says "fix leak" → Finds "Pipe Repair Service", "Leak Detection"

**Implementation:**

```python
# services/ai/embeddings.py
from google import generativeai as genai
from typing import List
import structlog

logger = structlog.get_logger()

class EmbeddingService:
    """Generate embeddings using Gemini"""
    
    def __init__(self, model: str = "text-embedding-004"):
        self.model = model
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text
        
        Args:
            text: Input text to embed
        
        Returns:
            Vector of 1536 dimensions
        """
        try:
            result = genai.embed_content(
                model=f"models/{self.model}",
                content=text,
                task_type="retrieval_document"
            )
            
            embedding = result['embedding']
            
            logger.info("embedding_generated",
                       text_length=len(text),
                       dimensions=len(embedding))
            
            return embedding
            
        except Exception as e:
            logger.error("embedding_failed", error=str(e))
            raise
    
    async def generate_embeddings_batch(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently"""
        embeddings = []
        
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)
        
        logger.info("batch_embeddings_generated", count=len(texts))
        return embeddings
```

```python
# db/repositories/embeddings.py
from typing import List, Dict, Any
from sqlalchemy import select, text
from db.session import AsyncSession
from models.database import DocumentEmbedding

class EmbeddingRepository:
    """Manage document embeddings with vector search"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def upsert_embedding(
        self,
        company_id: str,
        document_type: str,
        title: str,
        content: str,
        embedding: List[float],
        metadata: Dict[str, Any] = None
    ):
        """Insert or update document embedding"""
        
        # Check if exists
        existing = await self.session.execute(
            select(DocumentEmbedding).where(
                DocumentEmbedding.company_id == company_id,
                DocumentEmbedding.title == title,
                DocumentEmbedding.document_type == document_type
            )
        )
        doc = existing.scalar_one_or_none()
        
        if doc:
            # Update existing
            doc.content = content
            doc.embedding = embedding
            doc.metadata = metadata or {}
        else:
            # Create new
            doc = DocumentEmbedding(
                company_id=company_id,
                document_type=document_type,
                title=title,
                content=content,
                embedding=embedding,
                metadata=metadata or {}
            )
            self.session.add(doc)
        
        await self.session.commit()
        return doc
    
    async def similarity_search(
        self,
        company_id: str,
        embedding: List[float],
        limit: int = 5,
        document_types: List[str] = None,
        min_similarity: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Find similar documents using cosine similarity
        
        Args:
            company_id: Company UUID
            embedding: Query embedding vector
            limit: Max results
            document_types: Filter by types (catalog, policy, faq)
            min_similarity: Minimum similarity threshold (0-1)
        
        Returns:
            List of documents with similarity scores
        """
        
        # Build query with vector similarity
        query = """
        SELECT
            id,
            document_type,
            title,
            content,
            metadata,
            1 - (embedding <=> :query_embedding) as similarity
        FROM document_embeddings
        WHERE company_id = :company_id
        """
        
        # Add document type filter
        if document_types:
            placeholders = ','.join([f"'{t}'" for t in document_types])
            query += f" AND document_type IN ({placeholders})"
        
        # Add similarity threshold and ordering
        query += """
            AND 1 - (embedding <=> :query_embedding) >= :min_similarity
        ORDER BY embedding <=> :query_embedding
        LIMIT :limit
        """
        
        result = await self.session.execute(
            text(query),
            {
                "query_embedding": str(embedding),
                "company_id": company_id,
                "min_similarity": min_similarity,
                "limit": limit
            }
        )
        
        documents = []
        for row in result:
            documents.append({
                "id": row.id,
                "document_type": row.document_type,
                "title": row.title,
                "content": row.content,
                "metadata": row.metadata,
                "similarity": row.similarity
            })
        
        return documents
```

**Catalog Indexing Script:**

```python
# scripts/index_catalog.py
"""Index all catalog items into vector database"""
import asyncio
from services.ai.embeddings import EmbeddingService
from db.repositories.embeddings import EmbeddingRepository
from db.repositories.catalog import CatalogRepository

async def index_catalog_items(company_id: str):
    """Embed all catalog items for semantic search"""
    
    embedding_service = EmbeddingService()
    embedding_repo = EmbeddingRepository()
    catalog_repo = CatalogRepository()
    
    # Get all active catalog items
    items = await catalog_repo.get_all(
        filters={"company_id": company_id, "is_active": True}
    )
    
    print(f"Indexing {len(items)} catalog items...")
    
    for item in items:
        # Create searchable text
        text = f"""
        {item.name}
        {item.description}
        Category: {item.category}
        Subcategory: {item.subcategory}
        Price: ${item.base_price}
        Tags: {', '.join(item.tags)}
        """
        
        # Generate embedding
        embedding = await embedding_service.generate_embedding(text)
        
        # Store in vector DB
        await embedding_repo.upsert_embedding(
            company_id=company_id,
            document_type="catalog",
            title=item.name,
            content=text,
            embedding=embedding,
            metadata={
                "catalog_item_id": item.id,
                "category": item.category,
                "price": float(item.base_price),
                "tags": item.tags
            }
        )
        
        print(f"✅ Indexed: {item.name}")
    
    print(f"\n🎉 Indexing complete! {len(items)} items embedded.")

if __name__ == "__main__":
    asyncio.run(index_catalog_items("YOUR_COMPANY_ID"))
```

---

### **Feature 2: RAG-Enhanced Quote Generation**

**What:** Quote generation uses RAG to find relevant catalog items automatically

**Before (without RAG):**
- AI gets entire catalog (500+ items) in prompt
- Slow, expensive, context limit issues
- May miss relevant items

**After (with RAG):**
- AI gets only top 5-10 most relevant items
- Fast, cheap, better accuracy
- Finds items even with vague descriptions

**Implementation:**

```python
# services/ai/quote_generator.py (enhanced)
from services.rag.retriever import RAGRetriever

class QuoteGeneratorAI:
    """AI quote generation with RAG enhancement"""
    
    def __init__(
        self,
        rag_retriever: RAGRetriever,
        gemini_client: GeminiClient
    ):
        self.rag = rag_retriever
        self.gemini = gemini_client
    
    async def generate(
        self,
        company_id: str,
        customer_name: str,
        description: str,
        system_prompt: str
    ) -> Dict[str, Any]:
        """Generate quote with RAG context"""
        
        # 1. Retrieve relevant catalog items via RAG
        relevant_items = await self.rag.retrieve_catalog_items(
            company_id=company_id,
            query=description,
            limit=10  # Only top 10 most relevant
        )
        
        # 2. Format catalog context
        catalog_context = "\n".join([
            f"- {item['title']}: ${item['metadata']['price']} - {item['content'][:100]}"
            for item in relevant_items
        ])
        
        # 3. Build user prompt with RAG context
        user_prompt = f"""
        Customer: {customer_name}
        Request: {description}
        
        Relevant Products/Services (from our catalog):
        {catalog_context}
        
        Generate a quote using ONLY items from the catalog above.
        """
        
        # 4. Generate with AI
        result = await self.gemini.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.1
        )
        
        return result
```

---

### **Feature 3: Intelligent Agents**

**What:** Specialized AI agents for different tasks

**Agents:**
1. **Quote Agent** - Generate quotes, handle multi-turn conversations
2. **Scheduler Agent** - Suggest optimal job scheduling
3. **Customer Support Agent** - Answer policy questions
4. **Upsell Agent** - Suggest relevant add-ons

**Implementation:**

```python
# services/agents/upsell_agent.py
from google.adk import Agent, Tool
from typing import List, Dict, Any

class UpsellAgent:
    """AI Agent that suggests relevant upsells"""
    
    def __init__(self, rag_retriever: RAGRetriever):
        self.rag = rag_retriever
        
        self.agent = Agent(
            model="gemini-2.0-flash",
            tools=[
                Tool(
                    name="search_complementary_items",
                    description="Find products that complement current quote items",
                    function=self._search_complementary
                ),
                Tool(
                    name="get_historical_upsells",
                    description="Get successful upsells from similar past quotes",
                    function=self._get_historical_upsells
                )
            ],
            system_instruction="""
            You are an upsell specialist.
            
            Your job:
            1. Analyze current quote items
            2. Find complementary products/services
            3. Suggest 2-3 relevant upsells with clear value proposition
            4. Be subtle - don't oversell
            
            Focus on customer value, not just higher price.
            """
        )
    
    async def suggest_upsells(
        self,
        company_id: str,
        current_items: List[Dict[str, Any]],
        customer_context: str
    ) -> List[Dict[str, Any]]:
        """
        Suggest upsells for current quote
        
        Args:
            company_id: Company UUID
            current_items: Items already in quote
            customer_context: Customer needs/description
        
        Returns:
            List of suggested upsells with reasoning
        """
        
        # Build context
        items_summary = "\n".join([
            f"- {item['name']} (${item['unit_price']})"
            for item in current_items
        ])
        
        prompt = f"""
        Current Quote Items:
        {items_summary}
        
        Customer Context:
        {customer_context}
        
        Suggest 2-3 complementary products/services that would add value.
        """
        
        response = await self.agent.send_message(
            message=prompt,
            context={"company_id": company_id}
        )
        
        return response
    
    async def _search_complementary(
        self,
        item_name: str,
        company_id: str
    ) -> List[Dict[str, Any]]:
        """Tool: Search for complementary items"""
        return await self.rag.retrieve_catalog_items(
            company_id=company_id,
            query=f"products that complement {item_name}",
            limit=5
        )
    
    async def _get_historical_upsells(
        self,
        item_name: str,
        company_id: str
    ) -> List[Dict[str, Any]]:
        """Tool: Get successful upsells from history"""
        # Query past quotes with this item
        # Find common upsells
        # Return top patterns
        pass
```

---

### **Feature 4: AI Conversation Tracking**

**What:** Track all AI interactions for analytics and debugging

**Benefits:**
- See what prompts work best
- Track AI costs per company
- Debug quote generation issues
- Audit AI decisions

**Implementation:**

```python
# db/repositories/conversations.py
from models.database import AIConversation

class ConversationRepository:
    """Track AI conversations"""
    
    async def log_conversation(
        self,
        company_id: str,
        user_id: str,
        entity_type: str,  # quote, lead, invoice
        entity_id: str,
        model: str,
        purpose: str,
        messages: List[Dict[str, str]],
        tokens_used: int,
        cost_usd: float,
        metadata: Dict[str, Any] = None
    ):
        """Log AI conversation for analytics"""
        
        conversation = AIConversation(
            company_id=company_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            model=model,
            purpose=purpose,
            messages=messages,
            tokens_used=tokens_used,
            cost_usd=cost_usd,
            metadata=metadata or {}
        )
        
        self.session.add(conversation)
        await self.session.commit()
        
        return conversation
    
    async def get_company_ai_usage(
        self,
        company_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get AI usage analytics for company"""
        
        result = await self.session.execute(
            select(
                func.count(AIConversation.id).label('total_conversations'),
                func.sum(AIConversation.tokens_used).label('total_tokens'),
                func.sum(AIConversation.cost_usd).label('total_cost'),
                func.avg(AIConversation.cost_usd).label('avg_cost_per_conversation')
            )
            .where(
                AIConversation.company_id == company_id,
                AIConversation.created_at.between(start_date, end_date)
            )
        )
        
        stats = result.one()
        
        return {
            "total_conversations": stats.total_conversations,
            "total_tokens": stats.total_tokens,
            "total_cost_usd": float(stats.total_cost or 0),
            "avg_cost_per_conversation": float(stats.avg_cost_per_conversation or 0)
        }
```

---

### **Feature 5: Company Knowledge Base**

**What:** Allow companies to upload custom documents for RAG

**Use Cases:**
- Upload company policies → AI answers policy questions
- Upload past successful quotes → AI learns pricing patterns
- Upload FAQs → AI can answer customer questions
- Upload product specs → AI provides accurate technical details

**API Endpoint:**

```python
# api/routes/knowledge.py
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/knowledge/upload")
async def upload_document(
    company_id: str,
    document_type: str,  # policy, faq, spec, quote_template
    file: UploadFile = File(...),
    embedding_service: EmbeddingService = Depends()
):
    """Upload document to company knowledge base"""
    
    # 1. Extract text from file
    content = await extract_text(file)
    
    # 2. Chunk into smaller pieces (500 chars)
    chunks = chunk_text(content, max_length=500)
    
    # 3. Generate embeddings for each chunk
    for i, chunk in enumerate(chunks):
        embedding = await embedding_service.generate_embedding(chunk)
        
        await embedding_repo.upsert_embedding(
            company_id=company_id,
            document_type=document_type,
            title=f"{file.filename} (Part {i+1})",
            content=chunk,
            embedding=embedding,
            metadata={
                "filename": file.filename,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
        )
    
    return {
        "success": True,
        "chunks_indexed": len(chunks),
        "message": f"Indexed {file.filename} successfully"
    }
```

---

## 📊 AI ANALYTICS DASHBOARD

**New UI Component:** AI Usage Dashboard

```tsx
// /app/(dashboard)/ai-analytics/page.tsx
'use client';

import { useAIAnalytics } from '@/lib/hooks/useAIAnalytics';

export default function AIAnalyticsPage() {
  const { data: analytics } = useAIAnalytics();
  
  return (
    <div className="space-y-6">
      <h1>AI Usage Analytics</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>Total Conversations</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.total_conversations}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>Total Cost</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${analytics.total_cost_usd.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>Avg Cost/Quote</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${analytics.avg_cost_per_conversation.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart: Cost over time */}
      {/* Chart: Tokens used by purpose */}
      {/* Table: Recent conversations */}
    </div>
  );
}
```

---

## ✅ SUCCESS METRICS

- ✅ RAG retrieval <500ms
- ✅ Quote accuracy improved (fewer manual edits needed)
- ✅ AI costs tracked per company
- ✅ Catalog fully indexed with embeddings
- ✅ Agents can answer company-specific questions
- ✅ Vector search >80% relevance accuracy

---

## ⏱️ ESTIMATED TIME

- **Embedding Service:** 1 day
- **RAG Retrieval:** 2 days
- **Catalog Indexing:** 1 day
- **Enhanced Quote Generation:** 2 days
- **Intelligent Agents:** 3 days
- **Conversation Tracking:** 1 day
- **Knowledge Base Upload:** 2 days
- **Analytics Dashboard:** 2 days
- **Testing:** 2 days
- **Total:** ~2 weeks

---

## 🔜 NEXT STEPS

After Phase 4:
- **Phase 5:** Data migration and optimization
- Full production rollout

---

**Ready to proceed with Phase 4 implementation?**
