"""
QuotePro Python Backend
FastAPI server for AI-powered quote generation using Groq
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from groq import Groq
import json
import re
from supabase import create_client, Client
from tax_rates import get_tax_rate_for_address

# Load environment variables
load_dotenv()

app = FastAPI(title="QuotePro API", version="1.0.0")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Supabase client lazily to avoid startup errors
supabase: Optional[Client] = None

def get_supabase() -> Client:
    """Get or create Supabase client"""
    global supabase
    if supabase is None:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=500,
                detail="Supabase configuration missing"
            )
        supabase = create_client(supabase_url, supabase_key)
    return supabase

SYSTEM_PROMPT = """You are an expert field-service admin who has written 15,000 winning quotes for HVAC, plumbing, electrical, roofing, and landscaping companies.
Convert the contractor's bullet points or voice note into a polished, itemized quote using ONLY items from their pricing catalog.
Rules:
- Never invent items — find closest match by name/synonym
- Add realistic quantities
- Include common upsells 90% of similar jobs need (e.g., surge protectors, water alarms, duct sealing)
- Apply trip charge if not explicitly waived
- Add permit fees when mentioned
- Offer Good / Better / Best options when possible
- Tone: confident, friendly, local-business style
- Output strict JSON: line_items[], options[], subtotal, tax_rate (default 8.5%), total, notes, upsell_suggestions[]"""


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


class QuoteResponse(BaseModel):
    line_items: List[LineItem]
    options: List[dict] = []
    subtotal: float
    tax_rate: float
    total: float
    notes: Optional[str] = None
    upsell_suggestions: List[str] = []


@app.get("/")
async def root():
    return {
        "message": "QuotePro Python Backend",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "supabase_configured": bool(os.getenv("NEXT_PUBLIC_SUPABASE_URL"))
    }


@app.post("/api/generate-quote", response_model=QuoteResponse)
async def generate_quote(request: QuoteRequest):
    """
    Generate an AI-powered quote using Groq and company pricing catalog
    """
    try:
        # Get Supabase client
        sb = get_supabase()
        
        # Fetch company pricing catalog from Supabase
        pricing_response = sb.table('pricing_items')\
            .select('*')\
            .eq('company_id', request.company_id)\
            .execute()
        
        pricing_items = pricing_response.data
        
        if not pricing_items:
            raise HTTPException(
                status_code=404,
                detail="No pricing items found for this company"
            )
        
        # Fetch company tax rate (as default)
        company_response = sb.table('companies')\
            .select('tax_rate')\
            .eq('id', request.company_id)\
            .single()\
            .execute()
        
        company_tax_rate = company_response.data.get('tax_rate', 8.5) if company_response.data else 8.5
        
        # Determine tax rate based on customer address if provided
        if request.customer_address:
            tax_rate = get_tax_rate_for_address(request.customer_address, default_rate=company_tax_rate)
        else:
            tax_rate = company_tax_rate
        
        # Format pricing catalog for AI
        catalog_text = '\n'.join([
            f"{item['name']} - ${item['price']}" + 
            (f" ({item['category']})" if item.get('category') else "")
            for item in pricing_items
        ])
        
        # Create user prompt
        user_prompt = f"""Customer: {request.customer_name}
Job Description: {request.description}

Available Pricing Catalog:
{catalog_text}

Generate a professional quote with line items, quantities, and pricing. Include appropriate upsells and fees. Return ONLY valid JSON with this structure:
{{
  "line_items": [
    {{
      "name": "Item name from catalog",
      "description": "Brief description if needed",
      "quantity": 1,
      "unit_price": 100,
      "total": 100,
      "is_upsell": false
    }}
  ],
  "options": [],
  "subtotal": 0,
  "tax_rate": {tax_rate},
  "total": 0,
  "notes": "Optional notes about the work",
  "upsell_suggestions": ["Optional upsell suggestions"]
}}"""
        
        # Call Groq API
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
        )
        
        content = completion.choices[0].message.content
        
        if not content:
            raise HTTPException(
                status_code=500,
                detail="No response from AI"
            )
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', content)
        if not json_match:
            raise HTTPException(
                status_code=500,
                detail="Invalid JSON response from AI"
            )
        
        quote_data = json.loads(json_match.group(0))
        
        # Calculate totals
        subtotal = sum(item['total'] for item in quote_data['line_items'])
        total = subtotal * (1 + tax_rate / 100)
        
        # Return structured response
        return QuoteResponse(
            line_items=[LineItem(**item) for item in quote_data['line_items']],
            options=quote_data.get('options', []),
            subtotal=subtotal,
            tax_rate=tax_rate,
            total=total,
            notes=quote_data.get('notes'),
            upsell_suggestions=quote_data.get('upsell_suggestions', [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating quote: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quote: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
