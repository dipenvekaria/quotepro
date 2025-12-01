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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import route modules
from api.routes import health, ai, quotes, catalog, ai_analytics

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="QuotePro API",
    version="2.0.0",
    description="AI-powered quote generation for field service businesses"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(ai.router)
app.include_router(quotes.router)
app.include_router(catalog.router)
app.include_router(ai_analytics.router)

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
