"""
AI-powered quote generation endpoints
Migrated from main.py with RAG enhancements
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from supabase import Client
import json
import re

from config.database import get_db_session
from services.ai.gemini_client import get_gemini_client, GeminiClient
from services.ai.quote_generator import QuoteGeneratorService
from services.ai.job_namer import JobNamerService
from services.agents.quote_optimizer import get_quote_optimizer, QuoteOptimizerAgent
from services.agents.upsell_suggester import get_upsell_suggester, UpsellSuggesterAgent
from db.repositories.catalog import CatalogRepository
from tax_rates import get_tax_rate_for_address

router = APIRouter(prefix="/api", tags=["AI"])


# Request/Response Models
class LineItem(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: float
    unit_price: float
    total: float
    option_tier: Optional[str] = None
    is_upsell: bool = False


class QuoteRequest(BaseModel):
    company_id: str
    description: str
    customer_name: str
    customer_address: Optional[str] = None
    existing_items: List[dict] = []


class QuoteResponse(BaseModel):
    line_items: List[LineItem]
    options: List[dict] = []
    subtotal: float
    tax_rate: float
    total: float
    notes: Optional[str] = None
    upsell_suggestions: List[str] = []
    # RAG metadata
    rag_metadata: Optional[dict] = None


class UpdateQuoteRequest(BaseModel):
    quote_id: str
    company_id: str
    user_prompt: str
    existing_items: List[dict]
    customer_name: str
    customer_address: Optional[str] = None
    conversation_history: List[dict] = []


class JobNameRequest(BaseModel):
    description: str
    customer_name: Optional[str] = None
    company_id: Optional[str] = None  # For catalog lookup


class JobNameResponse(BaseModel):
    job_name: str  # Will contain job_type


@router.post("/generate-quote", response_model=QuoteResponse)
async def generate_quote(
    request: QuoteRequest,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    ## Generate AI-Powered Quote
    
    Creates a professional quote using Google Gemini 2.0 Flash with RAG (Retrieval-Augmented Generation).
    
    ### How It Works:
    1. **RAG Search** - Finds 3 similar past quotes for context
    2. **Catalog Matching** - Searches 10 most relevant pricing items  
    3. **AI Generation** - Gemini creates line items with quantities & pricing
    4. **Tax Calculation** - Auto-calculates tax based on customer address
    
    ### What You Get:
    - Detailed line items with quantities and unit prices
    - Good/Better/Best options (if applicable)
    - Upsell suggestions
    - Tax calculations
    - Professional notes
    - RAG metadata (what sources were used)
    
    ### Example Request:
    ```json
    {
      "company_id": "uuid-here",
      "description": "Replace 50 gallon water heater, update main shutoff valve",
      "customer_name": "John Smith",
      "customer_address": "123 Main St, San Francisco, CA 94102"
    }
    ```
    
    ### Example Response:
    ```json
    {
      "line_items": [
        {
          "name": "50 Gallon Water Heater",
          "description": "Rheem Professional Series",
          "quantity": 1,
          "unit_price": 850.00,
          "total": 850.00
        }
      ],
      "subtotal": 1200.00,
      "tax_rate": 8.5,
      "total": 1302.00,
      "rag_metadata": {
        "similar_quotes_found": 3,
        "catalog_matches_found": 10
      }
    }
    ```
    
    ### Performance:
    - Typical response time: 2-3 seconds
    - Uses cached catalog embeddings for speed
    - Gemini 2.0 Flash for fast inference
    
    ### Errors:
    - **400** - NO_PRICING_CATALOG: Set up catalog in Settings first
    - **500** - AI generation failed (retry recommended)
    """
    try:
        # Initialize services
        quote_service = QuoteGeneratorService(gemini, db)
        catalog_repo = CatalogRepository(db)
        
        # Fetch company pricing catalog
        pricing_items = catalog_repo.find_all_active(request.company_id)
        
        if not pricing_items:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "NO_PRICING_CATALOG",
                    "message": "No pricing catalog found. Please set up your pricing catalog in Settings.",
                    "action_required": "Navigate to Settings → Pricing"
                }
            )
        
        # Get company tax rate (fallback)
        company_response = db.table('companies').select('tax_rate').eq('id', request.company_id).single().execute()
        company_tax_rate = company_response.data.get('tax_rate', 8.5) if company_response.data else 8.5
        
        # Determine tax rate from address if provided
        tax_rate = get_tax_rate_for_address(request.customer_address, company_tax_rate) if request.customer_address else company_tax_rate
        
        # Generate quote using service
        quote_data = quote_service.generate_quote(
            company_id=request.company_id,
            description=request.description,
            customer_address=request.customer_address or "",
            existing_items=request.existing_items
        )
        
        # Calculate totals
        subtotal = sum(item['total'] for item in quote_data['line_items'])
        total = subtotal * (1 + tax_rate / 100)
        
        return QuoteResponse(
            line_items=[LineItem(**item) for item in quote_data['line_items']],
            options=quote_data.get('options', []),
            subtotal=subtotal,
            tax_rate=tax_rate,
            total=total,
            notes=quote_data.get('notes'),
            upsell_suggestions=quote_data.get('upsell_suggestions', []),
            rag_metadata=quote_data.get('rag_metadata', {
                'similar_quotes_found': 0,
                'catalog_matches_found': 0,
                'rag_enabled': False
            })
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating quote: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate quote: {str(e)}")


@router.post("/update-quote-with-ai")
async def update_quote_with_ai(
    request: UpdateQuoteRequest,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Update existing quote using AI based on user's request
    Examples: "add labor charges", "remove permit fee"
    """
    try:
        # Initialize services
        quote_service = QuoteGeneratorService(gemini, db)
        
        # Generate updated quote (existing_items provides context)
        quote_data = quote_service.generate_quote(
            company_id=request.company_id,
            description=request.user_prompt,
            customer_address=request.customer_address or "",
            existing_items=request.existing_items
        )
        
        # Get tax rate
        company_response = db.table('companies').select('tax_rate').eq('id', request.company_id).single().execute()
        tax_rate = company_response.data.get('tax_rate', 8.5) if company_response.data else 8.5
        
        if request.customer_address:
            tax_rate = get_tax_rate_for_address(request.customer_address, tax_rate)
        
        # Calculate totals
        subtotal = sum(item['total'] for item in quote_data['line_items'])
        total = subtotal * (1 + tax_rate / 100)
        
        return QuoteResponse(
            line_items=[LineItem(**item) for item in quote_data['line_items']],
            options=quote_data.get('options', []),
            subtotal=subtotal,
            tax_rate=tax_rate,
            total=total,
            notes=quote_data.get('notes'),
            upsell_suggestions=quote_data.get('upsell_suggestions', []),
            rag_metadata=quote_data.get('rag_metadata', {
                'similar_quotes_found': 0,
                'catalog_matches_found': 0,
                'rag_enabled': False
            })
        )
        
    except Exception as e:
        print(f"❌ Error updating quote: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update quote: {str(e)}")


@router.post("/generate-job-name", response_model=JobNameResponse)
async def generate_job_name(
    request: JobNameRequest,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Generate standardized job type from description using product catalog
    """
    try:
        job_namer = JobNamerService(gemini, db_connection=db)
        job_type = job_namer.generate_job_name(
            description=request.description,
            customer_name=request.customer_name or "",
            company_id=request.company_id
        )
        
        return JobNameResponse(job_name=job_type)  # Returns job_type as job_name for compatibility
        
    except Exception as e:
        print(f"❌ Error generating job type: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate job type: {str(e)}")


# Quote Optimizer Models
class OptimizeQuoteRequest(BaseModel):
    company_id: str
    job_description: str
    proposed_total: float
    line_items: List[dict]
    customer_address: Optional[str] = None


class OptimizeQuoteResponse(BaseModel):
    win_probability: float
    confidence: str
    recommendation: str
    suggested_total: Optional[float] = None
    price_position: str
    market_data: dict
    margin_analysis: dict
    insights: str
    similar_quotes_summary: List[dict]


@router.post("/optimize-quote", response_model=OptimizeQuoteResponse)
async def optimize_quote(
    request: OptimizeQuoteRequest,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Optimize quote pricing using AI analysis
    
    Analyzes similar past quotes to:
    - Calculate win probability
    - Suggest optimal pricing
    - Identify margin opportunities
    - Provide competitive insights
    """
    try:
        # Initialize optimizer agent
        optimizer = get_quote_optimizer(gemini, db)
        
        # Run optimization analysis
        result = optimizer.optimize_quote(
            company_id=request.company_id,
            job_description=request.job_description,
            proposed_total=request.proposed_total,
            line_items=request.line_items,
            customer_address=request.customer_address
        )
        
        return OptimizeQuoteResponse(**result)
        
    except Exception as e:
        print(f"❌ Error optimizing quote: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize quote: {str(e)}")


# Upsell Suggester Models
class SuggestUpsellsRequest(BaseModel):
    company_id: str
    job_description: str
    current_items: List[dict]
    current_total: float
    customer_address: Optional[str] = None


class UpsellSuggestion(BaseModel):
    item_name: str
    category: str
    estimated_value: float
    reason: str
    source: str
    confidence: str
    frequency: Optional[int] = None
    frequency_percentage: Optional[float] = None


class SuggestUpsellsResponse(BaseModel):
    suggestions: List[UpsellSuggestion]
    potential_increase: float
    potential_increase_percentage: float
    confidence: str
    analysis: dict
    market_insights: dict


@router.post("/suggest-upsells", response_model=SuggestUpsellsResponse)
async def suggest_upsells(
    request: SuggestUpsellsRequest,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Suggest upsell items to increase quote value
    
    Analyzes historical patterns to suggest:
    - Complementary items frequently purchased together
    - High-margin add-ons
    - AI-recommended contextual upsells
    - Items that increase win rate
    """
    try:
        # Initialize upsell suggester agent
        suggester = get_upsell_suggester(gemini, db)
        
        # Generate upsell suggestions
        result = suggester.suggest_upsells(
            company_id=request.company_id,
            job_description=request.job_description,
            current_items=request.current_items,
            current_total=request.current_total,
            customer_address=request.customer_address
        )
        
        # Convert suggestions to response model
        suggestions = [UpsellSuggestion(**s) for s in result['suggestions']]
        
        return SuggestUpsellsResponse(
            suggestions=suggestions,
            potential_increase=result['potential_increase'],
            potential_increase_percentage=result['potential_increase_percentage'],
            confidence=result['confidence'],
            analysis=result['analysis'],
            market_insights=result.get('market_insights', {})
        )
        
    except Exception as e:
        print(f"❌ Error suggesting upsells: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to suggest upsells: {str(e)}")
