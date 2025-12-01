"""
QuotePro Python Backend - Version 2.0
Modular FastAPI server with AI-powered quote generation

Refactored from monolithic 1,114-line file to clean modular architecture:
- Config layer: Settings, database connection
- Repository layer: Data access (quotes, customers, leads, catalog)
- Service layer: AI (Gemini), RAG (vector search), business logic
- API layer: Clean route organization

Architecture: Phase 2 complete ✅
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import route modules
from api.routes import health, ai, quotes, catalog, ai_analytics
from app.routes import health as monitoring_health
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.logging_config import setup_logging
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv()

# Configure logging
setup_logging(
    level=os.getenv("LOG_LEVEL", "INFO"),
    json_logs=os.getenv("JSON_LOGS", "false").lower() == "true",
    log_file=os.getenv("LOG_FILE", None)
)

# API route tags for documentation organization
tags_metadata = [
    {
        "name": "Health",
        "description": "Service health and status endpoints",
    },
    {
        "name": "AI Quote Generation",
        "description": """
AI-powered quote generation with RAG (Retrieval-Augmented Generation).
Uses Google Gemini 2.0 Flash to generate professional quotes from job descriptions.
Automatically searches similar past quotes and relevant catalog items for context.
        """,
    },
    {
        "name": "Quote Optimization",
        "description": """
Analyze quotes to predict win probability and suggest optimal pricing.
Compares against similar historical quotes to provide data-driven recommendations.
        """,
    },
    {
        "name": "Upsell Suggestions",
        "description": """
Generate intelligent upsell and cross-sell recommendations.
Uses pattern analysis from won quotes plus AI contextual suggestions.
        """,
    },
    {
        "name": "Catalog Management",
        "description": """
Manage pricing item catalog and vector embeddings for RAG search.
Automatically indexes items for semantic similarity matching.
        """,
    },
    {
        "name": "AI Analytics",
        "description": """
Track AI feature usage, performance metrics, and ROI.
Provides insights into win rates, suggestion acceptance, and revenue impact.
        """,
    },
    {
        "name": "Quotes",
        "description": "Quote CRUD operations and management",
    },
]

# Initialize FastAPI app
app = FastAPI(
    title="QuotePro API",
    version="2.0.0",
    description="""
## AI-Powered Quote Generation for Field Service Businesses

QuotePro combines cutting-edge AI (Google Gemini 2.0) with RAG (Retrieval-Augmented Generation)
to help contractors create winning quotes faster.

### Key Features:
* 🤖 **AI Quote Generation** - Generate professional quotes from job descriptions
* 🎯 **Quote Optimizer** - Win probability analysis & pricing recommendations  
* 💰 **Upsell Suggester** - Data-driven cross-sell opportunities
* 🔍 **RAG Search** - Learn from similar past quotes
* 📊 **Analytics** - Track AI performance & ROI

### Tech Stack:
* FastAPI + Python 3.11
* Google Gemini 2.0 Flash
* Supabase (PostgreSQL + pgvector)
* Vector embeddings (768-dim)

### Authentication:
All endpoints require Supabase JWT authentication. Include your token:
```
Authorization: Bearer <your-jwt-token>
```

### Rate Limiting:
Endpoints are rate-limited to prevent abuse:
* AI generation: 10 requests/minute
* Bulk operations: 1 request/minute
* Standard endpoints: 60 requests/minute
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    contact={
        "name": "QuotePro Support",
        "email": "support@quotepro.com",
    },
    license_info={
        "name": "Proprietary",
    },
)

# Configure rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Configure CORS (hardened)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Explicit methods
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],  # Explicit headers
    expose_headers=["X-Request-ID"],  # Expose request ID for tracing
)

# Add logging middleware (before rate limiting for logging all requests)
app.add_middleware(LoggingMiddleware)

# Register routes
app.include_router(monitoring_health.router, prefix="/api", tags=["Health"])
app.include_router(health.router, tags=["Health"])
app.include_router(ai.router, tags=["AI Quote Generation", "Quote Optimization", "Upsell Suggestions"])
app.include_router(quotes.router, tags=["Quotes"])
app.include_router(catalog.router, tags=["Catalog Management"])
app.include_router(ai_analytics.router, tags=["AI Analytics"])

# Startup message
@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 QuotePro Backend v2.0 - Starting...")
    print("=" * 60)
    print("✅ Config: Pydantic Settings")
    print("✅ Database: Supabase (pgvector enabled)")
    print("✅ AI: Google Gemini 2.0 Flash")
    print("✅ RAG: Vector search ready")
    print("✅ Routes: /api/generate-quote, /api/update-quote-with-ai")
    print("=" * 60)
    print("📡 Server ready at http://localhost:8000")
    print("📚 Docs at http://localhost:8000/docs")
    print("=" * 60)
