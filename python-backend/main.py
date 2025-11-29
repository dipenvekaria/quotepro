"""
QuotePro Python Backend
FastAPI server for AI-powered quote generation using Google Gemini
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, validator
from typing import List, Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai
import json
import re
import pandas as pd
import io
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
gemini_model: Optional[genai.GenerativeModel] = None

def get_gemini_model() -> genai.GenerativeModel:
    """Get or create Gemini model"""
    global gemini_model
    if gemini_model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="Gemini API key not configured"
            )
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            generation_config={
                'temperature': 0.1,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': 8192,
                'response_mime_type': 'application/json',
            }
        )
    return gemini_model

# Initialize Supabase client lazily to avoid startup errors
supabase: Optional[Client] = None

def get_supabase() -> Client:
    """Get or create Supabase client"""
    global supabase
    if supabase is None:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        print(f"🔑 Supabase URL: {supabase_url}")
        print(f"🔑 Service Role Key: {supabase_key[:20]}..." if supabase_key else "❌ No service role key!")
        
        if not supabase_url or not supabase_key:
            raise HTTPException(
                status_code=500,
                detail="Supabase configuration missing"
            )
        
        try:
            supabase = create_client(supabase_url, supabase_key)
            print("✅ Supabase client created successfully")
        except Exception as e:
            print(f"❌ Failed to create Supabase client: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create Supabase client: {str(e)}"
            )
    return supabase

SYSTEM_PROMPT = """You are an expert field-service admin who has written 15,000 winning quotes for HVAC, plumbing, electrical, roofing, and landscaping companies.
Convert the contractor's bullet points or voice note into a polished, itemized quote.

🎯 IMPORTANT: This is a MULTI-TURN CONVERSATION
You are helping the user build their quote through an ongoing conversation. Each request builds on previous requests.
- When user says "add", "also include", "also need" → ADD to existing items (preserve what's already there)
- When user says "remove", "delete", "take out" → REMOVE specified items only
- When user says "replace", "change to" → MODIFY/REPLACE specified items
- DEFAULT BEHAVIOR: ADD new items while PRESERVING existing ones

🚨 CRITICAL RULES - FOLLOW THESE STRICTLY:

1. ⚠️  USE ONLY THE PROVIDED PRICING CATALOG
   - You will receive a specific pricing catalog with item names and prices
   - DO NOT create, invent, or make up any items
   - DO NOT modify prices from the catalog
   - DO NOT use prices from your training data or general knowledge
   
2. ⚠️  IF ITEM IS NOT IN CATALOG = DO NOT ADD IT
   - If the job requires something not in the catalog, note it in "notes" field
   - Example: "Note: Customer requested furnace repair but no furnace items in catalog"
   - DO NOT add items "similar to" catalog items that aren't exactly listed
   
3. ⚠️  PRESERVE EXISTING ITEMS UNLESS EXPLICITLY ASKED TO REMOVE/CHANGE THEM
   - If current quote has "Water Heater" and user says "add pipes" → Return BOTH water heater AND pipes
   - If user says "remove water heater" → Remove only the water heater
   - If user says "change water heater to tankless" → Replace water heater with tankless
   - If user says "add labor" → KEEP all existing items and ADD labor item
   
4. ✅  WHAT YOU CAN DO:
   - Match job description to closest catalog item by name/synonym
   - Calculate realistic quantities based on job scope
   - Suggest upsells that ARE in the catalog (e.g., surge protectors, water alarms)
   - Include trip charges, permits, fees IF they are in the catalog
   - Offer Good/Better/Best options using catalog combinations
   
5. 💰 DISCOUNTS - IMPORTANT:
   - If contractor mentions "no charge for labor", "free installation", "discount", "50% off", etc.
   - Add discount as SEPARATE line item with NEGATIVE unit_price and NEGATIVE total
   - Name format: "Discount: [what's discounted]" or "No Charge: [what's waived]"
   - Examples:
     * "Discount: 10% off total" → unit_price: -100, total: -100
     * "No Charge: Labor" → unit_price: -150, total: -150
     * "50% off service call" → unit_price: -75, total: -75
   - Discount amounts should be NEGATIVE numbers (e.g., -100, not 100)
   - Discounts can be up to 100% (completely free item/service)
   
6. ✅  QUALITY REQUIREMENTS:
   - Be professional, confident, friendly tone
   - Add helpful notes about work scope
   - Calculate accurate totals (discounts reduce the total)
   - Output ONLY valid JSON structure

7. 📋 OUTPUT FORMAT:
   {
     "line_items": [
       {"name": "Water Heater Installation", "quantity": 1, "unit_price": 1200, "total": 1200, "is_upsell": false},
       {"name": "Discount: No charge for labor", "quantity": 1, "unit_price": -300, "total": -300, "is_upsell": false}
     ],
     "options": [],
     "subtotal": 900,
     "tax_rate": 8.5,
     "total": 976.50,
     "notes": "Any important details or missing catalog items",
     "upsell_suggestions": ["Items from catalog that add value"]
   }

Remember: You are a MATCHER, not a PRICER. You match jobs to the catalog provided. You do NOT create prices.
For discounts: Use NEGATIVE numbers for unit_price and total.
For conversations: PRESERVE existing items unless explicitly asked to change them."""


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
    existing_items: List[dict] = []  # Existing quote items for context


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
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "supabase_configured": bool(os.getenv("NEXT_PUBLIC_SUPABASE_URL"))
    }


@app.post("/api/generate-quote", response_model=QuoteResponse)
async def generate_quote(request: QuoteRequest):
    """
    Generate an AI-powered quote using Google Gemini and company pricing catalog
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
        
        # Fail gracefully if no pricing catalog exists
        if not pricing_items:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "NO_PRICING_CATALOG",
                    "message": "No pricing catalog found for this company. Please set up your pricing catalog in Settings before generating quotes.",
                    "action_required": "Navigate to Settings → Pricing to add your service items and prices."
                }
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
        
        # Format existing items if any
        existing_items_text = ""
        if request.existing_items and len(request.existing_items) > 0:
            existing_items_text = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 CURRENT QUOTE ITEMS (PRESERVE THESE):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            for item in request.existing_items:
                existing_items_text += f"• {item.get('name')} - ${item.get('unit_price')} x {item.get('quantity')} = ${item.get('total')}\n"
            existing_items_text += "\n⚠️ PRESERVE ALL ITEMS ABOVE unless explicitly asked to remove/change them!\n"
        
        # Create user prompt
        user_prompt = f"""Customer: {request.customer_name}
Job Description: {request.description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR PRICING CATALOG (USE ONLY THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{catalog_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{existing_items_text}

⚠️  IMPORTANT: 
- ONLY use items listed above
- ONLY use the exact prices shown
- If you need an item NOT in the catalog, mention it in "notes" but do NOT add it to line_items
- DO NOT make up prices or items
- PRESERVE existing items unless asked to remove/change them

Generate a professional quote matching the job description to items from the catalog above.

Return ONLY valid JSON with this exact structure:
{{
  "line_items": [
    {{
      "name": "Exact item name from catalog above",
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
  "notes": "Optional notes about the work or missing catalog items",
  "upsell_suggestions": ["Items from catalog that add value"]
}}"""
        
        # Call Gemini API
        model = get_gemini_model()
        
        # Combine system and user prompts for Gemini
        full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
        
        response = model.generate_content(full_prompt)
        
        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="No response from AI"
            )
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response.text)
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


# ============================================
# UPDATE QUOTE WITH AI
# ============================================

class UpdateQuoteRequest(BaseModel):
    quote_id: str
    company_id: str
    user_prompt: str
    existing_items: List[dict]
    customer_name: str
    customer_address: Optional[str] = None
    conversation_history: List[dict] = []


@app.post("/api/update-quote-with-ai")
async def update_quote_with_ai(request: UpdateQuoteRequest):
    """
    Update an existing quote using AI based on user's request
    Examples: "add labor charges", "add equipment for HVAC", "remove permit fee"
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
                status_code=400,
                detail="No pricing catalog found for this company"
            )
        
        # Fetch company tax rate
        company_response = sb.table('companies')\
            .select('tax_rate')\
            .eq('id', request.company_id)\
            .single()\
            .execute()
        
        company_tax_rate = company_response.data.get('tax_rate', 8.5) if company_response.data else 8.5
        
        # Determine tax rate
        if request.customer_address:
            tax_rate = get_tax_rate_for_address(request.customer_address, default_rate=company_tax_rate)
        else:
            tax_rate = company_tax_rate
        
        # Format existing items
        existing_items_text = '\n'.join([
            f"- {item['name']}: ${item['unit_price']} x {item['quantity']} = ${item['total']}"
            for item in request.existing_items
        ])
        
        # Format pricing catalog
        catalog_text = '\n'.join([
            f"{item['name']} - ${item['price']}" + 
            (f" - {item['description']}" if item.get('description') else "") +
            (f" ({item['category']})" if item.get('category') else "")
            for item in pricing_items
        ])
        
        # Build conversation messages with history
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR PRICING CATALOG (USE ONLY THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{catalog_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""}
        ]
        
        # Add conversation history from audit trail
        for entry in request.conversation_history:
            # Add user's previous prompt
            if entry.get('user_prompt'):
                messages.append({
                    "role": "user",
                    "content": entry['user_prompt']
                })
            
            # Add AI's previous response
            if entry.get('changes_made'):
                changes = entry['changes_made']
                if isinstance(changes, dict) and changes.get('line_items'):
                    # Format the AI's previous response
                    ai_response = {
                        "line_items": changes['line_items'],
                        "subtotal": changes.get('subtotal', 0),
                        "tax_rate": changes.get('tax_rate', tax_rate),
                        "total": changes.get('total', 0),
                        "notes": changes.get('ai_instructions', ''),
                    }
                    messages.append({
                        "role": "assistant",
                        "content": json.dumps(ai_response)
                    })
        
        # Format existing items for current context
        existing_items_text = '\n'.join([
            f"- {item['name']}: ${item['unit_price']} x {item['quantity']} = ${item['total']}"
            for item in request.existing_items
        ])
        
        # Add current request
        current_prompt = f"""Customer: {request.customer_name}

CURRENT QUOTE ITEMS:
{existing_items_text}

USER REQUEST: {request.user_prompt}

⚠️  REMEMBER: This is a conversation update. The user is asking you to UPDATE the existing quote.
- If they say "add", KEEP existing items and ADD new ones
- If they say "remove", REMOVE only specified items  
- If they say "change/replace", MODIFY only specified items
- DEFAULT: PRESERVE existing items unless explicitly told otherwise

Return ONLY valid JSON with this exact structure:
{{
  "line_items": [
    {{
      "name": "Exact item name from catalog",
      "description": "Brief description",
      "quantity": 1,
      "unit_price": 100,
      "total": 100,
      "is_upsell": false
    }}
  ],
  "subtotal": 0,
  "tax_rate": {tax_rate},
  "total": 0,
  "notes": "What was changed based on user request"
}}"""
        
        messages.append({
            "role": "user",
            "content": current_prompt
        })
        
        # Call Gemini API with full conversation history
        model = get_gemini_model()
        
        # Convert messages to Gemini format (combine system + conversation)
        conversation_text = "\n\n".join([
            f"{msg['role'].upper()}: {msg['content']}" 
            for msg in messages
        ])
        
        response = model.generate_content(conversation_text)
        
        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="No response from AI"
            )
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if not json_match:
            raise HTTPException(
                status_code=500,
                detail="Invalid JSON response from AI"
            )
        
        quote_data = json.loads(json_match.group(0))
        
        # Calculate totals
        subtotal = sum(item['total'] for item in quote_data['line_items'])
        total = subtotal * (1 + tax_rate / 100)
        
        # Determine what changed
        existing_names = {item['name'] for item in request.existing_items}
        new_names = {item['name'] for item in quote_data['line_items']}
        
        added_items = [item for item in quote_data['line_items'] if item['name'] not in existing_names]
        removed_items = [item for item in request.existing_items if item['name'] not in new_names]
        
        # Return response with change tracking
        return {
            "line_items": quote_data['line_items'],
            "subtotal": subtotal,
            "tax_rate": tax_rate,
            "total": total,
            "notes": quote_data.get('notes'),
            "added_items": added_items,
            "removed_items": removed_items,
            "modified_items": [],  # Could implement more detailed change tracking
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating quote: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update quote: {str(e)}"
        )


# ============================================
# BULK PRICING UPLOAD ENDPOINTS
# ============================================

@app.post("/api/pricing/preview")
async def preview_pricing_file(file: UploadFile = File(...)):
    """
    Preview CSV or Excel file to detect columns and show sample data
    Returns column names and first 5 rows for mapping
    """
    try:
        print(f"📁 Received file for preview: {file.filename}")
        
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_extension = file.filename.lower().split('.')[-1]
        print(f"📄 File extension: {file_extension}")
        
        if file_extension not in ['csv', 'xlsx', 'xls']:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Please upload CSV or Excel (.xlsx, .xls) file"
            )
        
        # Read file content
        content = await file.read()
        print(f"📊 File size: {len(content)} bytes")
        
        # Parse file based on type
        try:
            if file_extension == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            else:  # xlsx or xls
                df = pd.read_excel(io.BytesIO(content))
            print(f"✅ Successfully parsed file: {len(df)} rows, {len(df.columns)} columns")
        except Exception as e:
            print(f"❌ Parse error: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {str(e)}"
            )
        
        # Get column names
        columns = df.columns.tolist()
        
        # Get first 5 rows as preview
        preview_data = df.head(5).fillna('').to_dict('records')
        
        # Try to auto-detect column mapping
        auto_mapping = {}
        
        # Common column name variations
        name_variations = ['name', 'item', 'service', 'product', 'description', 'item_name', 'service_name', 'product_name']
        price_variations = ['price', 'cost', 'amount', 'rate', 'unit_price', 'unit_cost', 'price_per_unit']
        category_variations = ['category', 'type', 'group', 'dept', 'department', 'service_type']
        description_variations = ['description', 'desc', 'details', 'notes', 'note', 'comments']
        
        for col in columns:
            col_lower = col.lower().strip()
            
            # Try to match name
            if not auto_mapping.get('name') and any(var in col_lower for var in name_variations):
                auto_mapping['name'] = col
            
            # Try to match price
            elif not auto_mapping.get('price') and any(var in col_lower for var in price_variations):
                auto_mapping['price'] = col
            
            # Try to match category
            elif not auto_mapping.get('category') and any(var in col_lower for var in category_variations):
                auto_mapping['category'] = col
            
            # Try to match description
            elif not auto_mapping.get('description') and any(var in col_lower for var in description_variations):
                auto_mapping['description'] = col
        
        return {
            "filename": file.filename,
            "total_rows": len(df),
            "columns": columns,
            "preview_data": preview_data,
            "auto_mapping": auto_mapping,
            "suggested_mapping": {
                "name": auto_mapping.get('name', columns[0] if columns else None),
                "price": auto_mapping.get('price', columns[1] if len(columns) > 1 else None),
                "category": auto_mapping.get('category', columns[2] if len(columns) > 2 else None),
                "description": auto_mapping.get('description', columns[3] if len(columns) > 3 else None)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in preview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to preview file: {str(e)}"
        )


@app.post("/api/pricing/bulk-upload")
async def bulk_upload_pricing(
    file: UploadFile = File(...),
    company_id: str = Form(None),
    column_mapping: str = Form(None)
):
    """
    Bulk upload pricing items from CSV or Excel file with custom column mapping
    
    column_mapping: JSON string mapping file columns to database fields
    Example: {"name": "Item Name", "price": "Cost", "category": "Type"}
    """
    try:
        print(f"\n🔄 BULK UPLOAD - Company ID: {company_id}")
        print(f"📁 File: {file.filename}")
        print(f"🗺️ Raw column_mapping param: {column_mapping}")
        
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_extension = file.filename.lower().split('.')[-1]
        if file_extension not in ['csv', 'xlsx', 'xls']:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Please upload CSV or Excel (.xlsx, .xls) file"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse file based on type
        try:
            if file_extension == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            else:  # xlsx or xls
                df = pd.read_excel(io.BytesIO(content))
            
            # Remove the first row if it's completely empty (header row with just commas)
            if len(df) > 0 and (df.iloc[0].isna().all() or (df.iloc[0].astype(str) == '').all()):
                df = df.iloc[1:].reset_index(drop=True)
            
            print(f"✅ Parsed file: {len(df)} rows, {len(df.columns)} columns")
            print(f"📊 Original columns: {df.columns.tolist()}")
        except Exception as e:
            print(f"❌ Parse error: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {str(e)}"
            )
        
        # Apply column mapping if provided
        if column_mapping:
            try:
                mapping = json.loads(column_mapping)
                print(f"🗺️ Parsed column mapping: {mapping}")
                
                # Rename columns based on mapping (filter out None/null/__none__ values)
                rename_dict = {v: k for k, v in mapping.items() if v and v != '__none__' and v != 'null'}
                print(f"📝 Rename dictionary: {rename_dict}")
                
                df = df.rename(columns=rename_dict)
                print(f"📊 Columns after rename: {df.columns.tolist()}")
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail="Invalid column mapping format"
                )
        
        # Validate required columns (after mapping)
        required_columns = ['name', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"❌ Missing columns: {missing_columns}")
            print(f"📊 Available columns: {df.columns.tolist()}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}. Required: name, price"
            )
        
        # Clean and validate data
        initial_rows = len(df)
        df = df.dropna(subset=['name', 'price'])  # Remove rows with missing required fields
        after_dropna = len(df)
        
        # Validate price is numeric
        try:
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
            df = df.dropna(subset=['price'])  # Remove rows with invalid prices
            after_price_validation = len(df)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail="Price column must contain numeric values"
            )
        
        print(f"📊 Data cleaning stats:")
        print(f"   Initial rows: {initial_rows}")
        print(f"   After removing empty name/price: {after_dropna} ({initial_rows - after_dropna} removed)")
        print(f"   After price validation: {after_price_validation} ({after_dropna - after_price_validation} removed)")
        
        # Add optional columns if they don't exist
        if 'category' not in df.columns:
            df['category'] = 'General'
        if 'description' not in df.columns:
            df['description'] = None
        
        # Convert to list of dictionaries
        pricing_items = []
        for _, row in df.iterrows():
            item = {
                'company_id': company_id,
                'name': str(row['name']).strip(),
                'price': float(row['price']),
                'category': str(row.get('category', 'General')).strip() if pd.notna(row.get('category')) else 'General',
                'description': str(row['description']).strip() if pd.notna(row.get('description')) else None
            }
            pricing_items.append(item)
        
        if not pricing_items:
            raise HTTPException(
                status_code=400,
                detail="No valid pricing items found in file"
            )
        
        # Insert into Supabase
        sb = get_supabase()
        
        # Option 1: Replace all existing items (delete then insert)
        # Delete existing items for this company
        if company_id:
            delete_result = sb.table('pricing_items').delete().eq('company_id', company_id).execute()
            print(f"🗑️ Deleted existing items for company {company_id}")
        
        # Insert new items
        print(f"📤 Inserting {len(pricing_items)} items into Supabase...")
        response = sb.table('pricing_items').insert(pricing_items).execute()
        print(f"✅ Successfully inserted {len(pricing_items)} items")
        print(f"📊 Sample item: {pricing_items[0] if pricing_items else 'None'}")
        
        return {
            "success": True,
            "message": f"Successfully uploaded {len(pricing_items)} pricing items",
            "items_count": len(pricing_items),
            "items": pricing_items
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in bulk upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload pricing items: {str(e)}"
        )


@app.get("/api/pricing/download-template")
async def download_template(format: str = "csv"):
    """
    Download a sample pricing template file
    
    Parameters:
    - format: 'csv' or 'excel' (default: csv)
    """
    try:
        # Create sample data
        sample_data = {
            'name': [
                'AC System Tune-up',
                'Water Heater Installation',
                'Electrical Panel Upgrade',
                'Roof Inspection',
                'Service Call Fee'
            ],
            'price': [149.00, 1450.00, 2850.00, 299.00, 95.00],
            'category': ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Service Fee'],
            'description': [
                'Complete AC system inspection and tune-up',
                'Standard 50-gallon water heater installation',
                '200-amp electrical panel upgrade',
                'Comprehensive roof inspection with report',
                'Standard service call fee'
            ]
        }
        
        df = pd.DataFrame(sample_data)
        
        if format.lower() == 'excel':
            # Create Excel file
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Pricing')
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={'Content-Disposition': 'attachment; filename=pricing_template.xlsx'}
            )
        else:
            # Create CSV file
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename=pricing_template.csv'}
            )
        
    except Exception as e:
        print(f"Error generating template: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate template: {str(e)}"
        )


@app.post("/api/pricing/bulk-append")
async def bulk_append_pricing(
    file: UploadFile = File(...),
    company_id: str = Form(None),
    column_mapping: str = Form(None)
):
    """
    Append pricing items from CSV or Excel file with custom column mapping (keeps existing items)
    
    column_mapping: JSON string mapping file columns to database fields
    Example: {"name": "Item Name", "price": "Cost", "category": "Type"}
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_extension = file.filename.lower().split('.')[-1]
        if file_extension not in ['csv', 'xlsx', 'xls']:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Please upload CSV or Excel (.xlsx, .xls) file"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse file based on type
        try:
            if file_extension == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            else:  # xlsx or xls
                df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {str(e)}"
            )
        
        # Apply column mapping if provided
        if column_mapping:
            try:
                mapping = json.loads(column_mapping)
                
                # Rename columns based on mapping
                rename_dict = {v: k for k, v in mapping.items() if v}
                df = df.rename(columns=rename_dict)
                
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid column mapping format"
                )
        
        # Validate required columns (after mapping)
        required_columns = ['name', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {str(e)}"
            )
        
        # Validate required columns
        required_columns = ['name', 'price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Clean and validate data
        df = df.dropna(subset=['name', 'price'])
        
        try:
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
            df = df.dropna(subset=['price'])
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail="Price column must contain numeric values"
            )
        
        # Add optional columns
        if 'category' not in df.columns:
            df['category'] = 'General'
        if 'description' not in df.columns:
            df['description'] = None
        
        # Convert to list of dictionaries
        pricing_items = []
        for _, row in df.iterrows():
            item = {
                'company_id': company_id,
                'name': str(row['name']).strip(),
                'price': float(row['price']),
                'category': str(row.get('category', 'General')).strip() if pd.notna(row.get('category')) else 'General',
                'description': str(row['description']).strip() if pd.notna(row.get('description')) else None
            }
            pricing_items.append(item)
        
        if not pricing_items:
            raise HTTPException(
                status_code=400,
                detail="No valid pricing items found in file"
            )
        
        # Insert into Supabase (append, don't delete existing)
        sb = get_supabase()
        response = sb.table('pricing_items').insert(pricing_items).execute()
        
        return {
            "success": True,
            "message": f"Successfully appended {len(pricing_items)} pricing items",
            "items_count": len(pricing_items),
            "items": pricing_items
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in bulk append: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to append pricing items: {str(e)}"
        )


class JobNameRequest(BaseModel):
    description: str
    customer_name: Optional[str] = None


class JobNameResponse(BaseModel):
    job_name: str


@app.post("/api/generate-job-name", response_model=JobNameResponse)
async def generate_job_name(request: JobNameRequest):
    """
    Generate a concise job name from a job description using AI
    """
    try:
        # Create a concise prompt for job name generation
        system_prompt = """You are an expert at creating concise, professional job names for field service work.
Given a job description, create a short, descriptive job name (3-6 words maximum).

RULES:
- Keep it brief (3-6 words)
- Use specific service terms (e.g., "HVAC Replacement", "Roof Repair", "Kitchen Remodel")
- Capitalize key words
- NO generic terms like "Service Call" or "Job"
- Focus on WHAT is being done

EXAMPLES:
- "Replace entire HVAC system in 3-story house" → "HVAC System Replacement"
- "Fix leaking pipe under kitchen sink" → "Kitchen Sink Pipe Repair"
- "Install new roof on garage" → "Garage Roof Installation"
- "Landscape front yard with pavers and plants" → "Front Yard Landscaping"
"""

        user_prompt = f"""Job Description: {request.description}

Generate a concise job name (3-6 words). Return ONLY the job name, nothing else."""

        # Call Gemini API
        # Use a simpler model config for job name generation
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            generation_config={
                'temperature': 0.3,
                'max_output_tokens': 100,
            }
        )
        
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = model.generate_content(full_prompt)
        
        job_name = response.text.strip()
        
        # Remove quotes if AI wrapped the name in them
        job_name = job_name.strip('"').strip("'")
        
        return JobNameResponse(job_name=job_name)
        
    except Exception as e:
        print(f"Error generating job name: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate job name: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
