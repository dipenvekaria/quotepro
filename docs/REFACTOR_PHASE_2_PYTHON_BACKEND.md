# PHASE 2: PYTHON BACKEND REFACTOR - TECH SPEC

**Status:** 📋 Planning  
**Duration:** 2 weeks  
**Risk Level:** 🟡 MEDIUM (Refactor existing code, backward compatibility required)  
**Dependencies:** Phase 1 complete  

---

## 📋 OBJECTIVE

Restructure Python backend from monolithic `main.py` into modular architecture with services, repositories, and proper separation of concerns. Prepare for AI-first features (RAG, Agents, Google ADK).

**Key Goals:**
1. Split monolithic file into logical modules
2. Create service layer for AI operations
3. Implement repository pattern for database access
4. Add RAG infrastructure (embeddings, vector search)
5. Integrate Google AI Development Kit (ADK)
6. Maintain 100% backward compatibility with existing API endpoints

---

## 🎯 SUCCESS CRITERIA

- ✅ All existing API endpoints continue working
- ✅ Response formats unchanged (frontend keeps working)
- ✅ New repository layer uses new schema tables
- ✅ RAG service operational with vector search
- ✅ Agent framework integrated (Google ADK)
- ✅ Code coverage >80% with tests
- ✅ API response time <500ms (improved)

---

## 📁 NEW FOLDER STRUCTURE

```
/python-backend/
├── main.py                      # FastAPI app setup only (50 lines)
├── requirements.txt             # Updated dependencies
├── .env.example                 # Environment variables template
├── config/
│   ├── __init__.py
│   ├── settings.py              # Pydantic Settings
│   └── database.py              # Database connection pool
├── api/
│   ├── __init__.py
│   ├── dependencies.py          # FastAPI dependencies (auth, db session)
│   └── routes/
│       ├── __init__.py
│       ├── quotes.py            # Quote generation/update endpoints
│       ├── jobs.py              # Job-related endpoints
│       ├── ai.py                # AI-specific endpoints
│       └── health.py            # Health check
├── models/
│   ├── __init__.py
│   ├── database.py              # SQLAlchemy/Pydantic models (quotes, jobs, etc.)
│   ├── schemas.py               # Request/response schemas
│   └── enums.py                 # Status enums, constants
├── db/
│   ├── __init__.py
│   ├── session.py               # Database session management
│   └── repositories/
│       ├── __init__.py
│       ├── base.py              # BaseRepository with common CRUD
│       ├── quotes.py            # QuoteRepository
│       ├── customers.py         # CustomerRepository
│       ├── leads.py             # LeadRepository
│       ├── jobs.py              # JobRepository
│       ├── invoices.py          # InvoiceRepository
│       ├── catalog.py           # CatalogRepository
│       ├── embeddings.py        # EmbeddingRepository (vector search)
│       └── prompts.py           # PromptRepository
├── services/
│   ├── __init__.py
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── gemini_client.py    # Gemini API wrapper
│   │   ├── quote_generator.py  # Quote generation logic
│   │   ├── job_namer.py        # Job name generation
│   │   └── embeddings.py       # Generate embeddings for RAG
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base_agent.py       # Base agent class
│   │   ├── quote_agent.py      # Quote generation agent
│   │   └── scheduler_agent.py  # Scheduling assistant agent
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── vector_store.py     # Vector database operations
│   │   ├── retriever.py        # Document retrieval logic
│   │   └── context_builder.py  # Build context from retrieved docs
│   ├── business/
│   │   ├── __init__.py
│   │   ├── quote_service.py    # Business logic for quotes
│   │   ├── job_service.py      # Business logic for jobs
│   │   └── invoice_service.py  # Business logic for invoices
│   └── prompts/
│       ├── __init__.py
│       └── prompt_loader.py    # Load/manage prompt templates
├── utils/
│   ├── __init__.py
│   ├── logging.py               # Structured logging
│   ├── formatting.py            # Number formatting, currency
│   └── validators.py            # Input validation
└── tests/
    ├── __init__.py
    ├── conftest.py              # Pytest fixtures
    ├── test_routes/
    │   ├── test_quotes.py
    │   └── test_ai.py
    ├── test_services/
    │   ├── test_quote_generator.py
    │   └── test_rag.py
    └── test_repositories/
        └── test_quotes.py
```

---

## 📦 UPDATED DEPENDENCIES

### **requirements.txt**

```txt
# Web Framework
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-multipart==0.0.12

# Google AI (Gemini)
google-generativeai==0.8.3
google-adk==0.2.0  # Google Agent Development Kit

# Database
psycopg2-binary==2.9.10
sqlalchemy==2.0.36
asyncpg==0.30.0  # Async PostgreSQL

# Vector Database
pgvector==0.3.6

# Pydantic for validation/settings
pydantic==2.10.3
pydantic-settings==2.6.1

# Environment variables
python-dotenv==1.0.1

# Logging
structlog==24.4.0

# Testing
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1  # For testing FastAPI

# Utilities
python-dateutil==2.9.0
tenacity==9.0.0  # Retry logic
```

---

## 🔧 KEY FILES IMPLEMENTATION

### **1. main.py** (Minimal app setup)

```python
"""QuotePro FastAPI Application - Clean entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config.settings import settings
from config.database import init_db
from api.routes import quotes, jobs, ai, health
from utils.logging import setup_logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events"""
    # Startup
    setup_logging()
    await init_db()
    yield
    # Shutdown (if needed)

app = FastAPI(
    title="QuotePro API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(quotes.router, prefix="/api", tags=["quotes"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(ai.router, prefix="/api", tags=["ai"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### **2. config/settings.py** (Centralized config)

```python
"""Application settings using Pydantic"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """Global application settings"""
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://quotepro.vercel.app"
    ]
    
    # Google AI
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_TEMPERATURE: float = 0.1
    GEMINI_MAX_TOKENS: int = 2000
    
    # RAG
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSION: int = 1536
    VECTOR_SEARCH_LIMIT: int = 5
    
    # Prompts
    PROMPTS_DIR: str = "./prompts"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
```

### **3. api/routes/quotes.py** (Quote endpoints)

```python
"""Quote generation and management endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from models.schemas import QuoteGenerateRequest, QuoteUpdateRequest, QuoteResponse
from services.business.quote_service import QuoteService
from api.dependencies import get_quote_service

router = APIRouter()

@router.post("/generate-quote", response_model=QuoteResponse)
async def generate_quote(
    request: QuoteGenerateRequest,
    service: QuoteService = Depends(get_quote_service)
):
    """Generate new quote from description"""
    try:
        result = await service.generate_quote(
            company_id=request.company_id,
            customer_name=request.customer_name,
            description=request.description,
            catalog=request.catalog,
            existing_items=request.existing_items
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-quote-with-ai", response_model=QuoteResponse)
async def update_quote_with_ai(
    request: QuoteUpdateRequest,
    service: QuoteService = Depends(get_quote_service)
):
    """Update quote with AI conversation"""
    try:
        result = await service.update_quote(
            company_id=request.company_id,
            customer_name=request.customer_name,
            user_prompt=request.user_prompt,
            existing_items=request.existing_items
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-job-name")
async def generate_job_name(
    request: Dict[str, str],
    service: QuoteService = Depends(get_quote_service)
):
    """Generate concise job name from description"""
    try:
        job_name = await service.generate_job_name(
            description=request["description"]
        )
        return {"job_name": job_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### **4. services/business/quote_service.py** (Business logic)

```python
"""Quote business logic and orchestration"""
from typing import List, Dict, Any, Optional
import structlog

from services.ai.quote_generator import QuoteGeneratorAI
from services.ai.job_namer import JobNamerAI
from services.rag.retriever import RAGRetriever
from db.repositories.quotes import QuoteRepository
from db.repositories.customers import CustomerRepository
from db.repositories.prompts import PromptRepository

logger = structlog.get_logger()

class QuoteService:
    """Orchestrates quote generation with AI and database"""
    
    def __init__(
        self,
        quote_repo: QuoteRepository,
        customer_repo: CustomerRepository,
        prompt_repo: PromptRepository,
        quote_ai: QuoteGeneratorAI,
        job_namer: JobNamerAI,
        rag_retriever: RAGRetriever
    ):
        self.quote_repo = quote_repo
        self.customer_repo = customer_repo
        self.prompt_repo = prompt_repo
        self.quote_ai = quote_ai
        self.job_namer = job_namer
        self.rag_retriever = rag_retriever
    
    async def generate_quote(
        self,
        company_id: str,
        customer_name: str,
        description: str,
        catalog: List[Dict[str, Any]],
        existing_items: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate new quote with AI + RAG"""
        
        logger.info("quote_generation_started", 
                   company_id=company_id,
                   customer_name=customer_name)
        
        # 1. Load company-specific prompts
        system_prompt = await self.prompt_repo.load_system_prompt(
            company_id=company_id,
            prompt_type="quote_generation"
        )
        
        # 2. Retrieve relevant context via RAG
        rag_context = await self.rag_retriever.retrieve_context(
            company_id=company_id,
            query=description,
            limit=5
        )
        
        # 3. Generate quote with AI
        result = await self.quote_ai.generate(
            system_prompt=system_prompt,
            customer_name=customer_name,
            description=description,
            catalog=catalog,
            existing_items=existing_items or [],
            rag_context=rag_context
        )
        
        logger.info("quote_generation_completed",
                   items_count=len(result.get("items", [])))
        
        return result
    
    async def update_quote(
        self,
        company_id: str,
        customer_name: str,
        user_prompt: str,
        existing_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Update existing quote with conversational AI"""
        
        logger.info("quote_update_started",
                   company_id=company_id,
                   prompt_length=len(user_prompt))
        
        # Load prompts
        system_prompt = await self.prompt_repo.load_system_prompt(
            company_id=company_id,
            prompt_type="quote_update"
        )
        
        # Update with AI
        result = await self.quote_ai.update(
            system_prompt=system_prompt,
            customer_name=customer_name,
            user_prompt=user_prompt,
            existing_items=existing_items
        )
        
        logger.info("quote_update_completed")
        return result
    
    async def generate_job_name(self, description: str) -> str:
        """Generate concise job name"""
        return await self.job_namer.generate(description)
```

### **5. services/rag/retriever.py** (RAG implementation)

```python
"""RAG retrieval service for context-aware AI responses"""
from typing import List, Dict, Any
import structlog

from db.repositories.embeddings import EmbeddingRepository
from services.ai.embeddings import EmbeddingService

logger = structlog.get_logger()

class RAGRetriever:
    """Retrieve relevant documents using vector similarity search"""
    
    def __init__(
        self,
        embedding_repo: EmbeddingRepository,
        embedding_service: EmbeddingService
    ):
        self.embedding_repo = embedding_repo
        self.embedding_service = embedding_service
    
    async def retrieve_context(
        self,
        company_id: str,
        query: str,
        limit: int = 5,
        document_types: List[str] = None
    ) -> str:
        """
        Retrieve relevant documents and format as context string
        
        Args:
            company_id: Company UUID
            query: User's query/description
            limit: Max documents to retrieve
            document_types: Filter by types (catalog, policy, faq)
        
        Returns:
            Formatted context string for AI prompt
        """
        
        # 1. Generate embedding for query
        query_embedding = await self.embedding_service.generate_embedding(query)
        
        # 2. Search vector database
        documents = await self.embedding_repo.similarity_search(
            company_id=company_id,
            embedding=query_embedding,
            limit=limit,
            document_types=document_types
        )
        
        if not documents:
            logger.info("rag_no_results", query=query[:50])
            return ""
        
        # 3. Format context
        context_parts = []
        for doc in documents:
            context_parts.append(
                f"--- {doc['title']} ({doc['document_type']}) ---\n"
                f"{doc['content']}\n"
            )
        
        context = "\n".join(context_parts)
        
        logger.info("rag_retrieved",
                   query=query[:50],
                   docs_count=len(documents),
                   context_length=len(context))
        
        return context
```

### **6. services/agents/quote_agent.py** (Google ADK Agent)

```python
"""Quote Generation Agent using Google ADK"""
from google.adk import Agent, Tool
from typing import Dict, Any, List
import structlog

from services.business.quote_service import QuoteService

logger = structlog.get_logger()

class QuoteAgent:
    """AI Agent for interactive quote generation"""
    
    def __init__(self, quote_service: QuoteService):
        self.quote_service = quote_service
        
        # Define tools for agent
        self.tools = [
            Tool(
                name="generate_quote",
                description="Generate a new quote from customer description",
                function=self._generate_quote_tool
            ),
            Tool(
                name="update_quote",
                description="Update existing quote based on customer feedback",
                function=self._update_quote_tool
            ),
            Tool(
                name="search_catalog",
                description="Search product/service catalog",
                function=self._search_catalog_tool
            )
        ]
        
        # Create agent
        self.agent = Agent(
            model="gemini-2.0-flash",
            tools=self.tools,
            system_instruction=self._get_system_instruction()
        )
    
    def _get_system_instruction(self) -> str:
        """Agent behavior instructions"""
        return """
        You are a professional quote generation assistant.
        
        Your job is to:
        1. Understand customer needs from their description
        2. Search the catalog for appropriate products/services
        3. Generate accurate quotes with pricing
        4. Suggest upsells when appropriate
        5. Handle customer questions and quote modifications
        
        Always be professional, accurate, and helpful.
        Only use items from the provided catalog - never invent products.
        """
    
    async def _generate_quote_tool(self, **kwargs) -> Dict[str, Any]:
        """Tool: Generate new quote"""
        return await self.quote_service.generate_quote(**kwargs)
    
    async def _update_quote_tool(self, **kwargs) -> Dict[str, Any]:
        """Tool: Update existing quote"""
        return await self.quote_service.update_quote(**kwargs)
    
    async def _search_catalog_tool(self, query: str) -> List[Dict[str, Any]]:
        """Tool: Search catalog (could use RAG here)"""
        # Implementation depends on catalog structure
        pass
    
    async def chat(self, message: str, context: Dict[str, Any]) -> str:
        """
        Multi-turn conversation with agent
        
        Args:
            message: User's message
            context: Conversation context (company_id, customer_id, etc.)
        
        Returns:
            Agent's response
        """
        response = await self.agent.send_message(
            message=message,
            context=context
        )
        
        logger.info("agent_response",
                   message_length=len(message),
                   response_length=len(response))
        
        return response
```

### **7. db/repositories/base.py** (Base Repository Pattern)

```python
"""Base repository with common CRUD operations"""
from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import DeclarativeMeta

ModelType = TypeVar("ModelType", bound=DeclarativeMeta)

class BaseRepository(Generic[ModelType]):
    """Generic repository for database operations"""
    
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session
    
    async def get_by_id(self, id: str) -> Optional[ModelType]:
        """Get single record by ID"""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()
    
    async def get_all(
        self,
        filters: Dict[str, Any] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[ModelType]:
        """Get multiple records with optional filters"""
        query = select(self.model)
        
        if filters:
            for key, value in filters.items():
                query = query.where(getattr(self.model, key) == value)
        
        query = query.limit(limit).offset(offset)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def create(self, data: Dict[str, Any]) -> ModelType:
        """Create new record"""
        instance = self.model(**data)
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance
    
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[ModelType]:
        """Update existing record"""
        await self.session.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**data)
        )
        await self.session.commit()
        return await self.get_by_id(id)
    
    async def delete(self, id: str) -> bool:
        """Delete record"""
        result = await self.session.execute(
            delete(self.model).where(self.model.id == id)
        )
        await self.session.commit()
        return result.rowcount > 0
```

---

## 🔄 MIGRATION STRATEGY

### **Backward Compatibility Approach**

```python
# OLD API (keep working during transition)
@router.post("/generate-quote")
async def generate_quote_legacy(request: dict):
    """Legacy endpoint - routes to new service"""
    # Transform old request format → new format
    new_request = transform_legacy_request(request)
    
    # Call new service
    result = await new_quote_service.generate_quote(**new_request)
    
    # Transform new response → old format
    legacy_response = transform_to_legacy_response(result)
    
    return legacy_response

# NEW API (cleaner, better typed)
@router.post("/v2/quotes/generate")
async def generate_quote_v2(request: QuoteGenerateRequest):
    """New endpoint with proper types"""
    return await quote_service.generate_quote(**request.dict())
```

---

## ✅ TESTING STRATEGY

### **Unit Tests**

```python
# tests/test_services/test_quote_generator.py
import pytest
from services.ai.quote_generator import QuoteGeneratorAI

@pytest.mark.asyncio
async def test_generate_quote_basic():
    """Test basic quote generation"""
    generator = QuoteGeneratorAI()
    
    result = await generator.generate(
        system_prompt="Test prompt",
        customer_name="John Doe",
        description="Install new HVAC system",
        catalog=[{"name": "HVAC Unit", "price": 5000}],
        existing_items=[]
    )
    
    assert "items" in result
    assert len(result["items"]) > 0
    assert result["total"] > 0
```

### **Integration Tests**

```python
# tests/test_routes/test_quotes.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_generate_quote_endpoint(client: AsyncClient):
    """Test full quote generation flow"""
    response = await client.post("/api/generate-quote", json={
        "company_id": "test-uuid",
        "customer_name": "Test Customer",
        "description": "Need new AC unit",
        "catalog": [{"name": "AC Unit", "price": 3000}]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
```

---

## 📊 SUCCESS METRICS

- ✅ All existing endpoints return same responses
- ✅ New endpoints available at `/v2/*`
- ✅ RAG retrieval working (<500ms)
- ✅ Agent conversations functional
- ✅ Test coverage >80%
- ✅ API latency <500ms (p95)
- ✅ Zero breaking changes for frontend

---

## ⏱️ ESTIMATED TIME

- **Repository Layer:** 2 days
- **Service Layer:** 3 days
- **RAG Implementation:** 2 days
- **Agent Integration:** 2 days
- **Testing:** 2 days
- **Documentation:** 1 day
- **Total:** ~2 weeks

---

## 🔜 NEXT STEPS

After Phase 2:
- **Phase 3:** Frontend refactor (use new v2 endpoints)
- **Phase 4:** Data migration (populate new tables from old)
- **Phase 5:** Deprecate old schema

---

**Ready to proceed with Phase 2 implementation?**
