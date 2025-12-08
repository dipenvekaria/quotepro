# python-backend/app/agents/quote_builder_agent.py
from google.adk.agents import LlmAgent
from google.adk.models import Gemini
from config.settings import get_settings
from typing import List, Optional
from pydantic import BaseModel

# Import the tools the agent will use
from app.agents.tools.rag_tools import retrieve_catalog_items, retrieve_similar_quotes, set_company_id
from app.agents.tools.tax_tools import get_tax_rate
from app.agents.tools.discount_tools import recalculate_discount

# Define the set of tools for this agent
QUOTE_BUILDER_TOOLS = [
    retrieve_catalog_items,  # RAG: Get actual catalog products with real prices
    retrieve_similar_quotes,  # RAG: Get similar past quotes for reference
    get_tax_rate,
    recalculate_discount,
]

# Define output schema using Pydantic
class LineItem(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: float
    unit_price: float
    total: float
    is_discount: bool = False
    discount_target: Optional[str] = None  # "total" or "item"

class QuoteOutput(BaseModel):
    line_items: List[LineItem]

# Define the system prompt for the agent
QUOTE_BUILDER_SYSTEM_PROMPT = """
You are a headless task execution agent for quote building. Execute tasks directly without greetings or conversational responses.

🚨 **ANTI-HALLUCINATION RULES** 🚨
1. **NEVER make up prices** - ONLY use prices from `retrieve_catalog_items` results
2. **NEVER invent product names** - ONLY use exact names from retrieved catalog items
3. **NEVER guess quantities or units** - Use what's in the catalog or ask for clarification
4. If catalog search returns no results → return empty line_items array
5. If uncertain about a price → DO NOT CREATE THE ITEM

CORE WORKFLOW:
1. **For new quotes**: 
   - FIRST call `retrieve_catalog_items(query="job description")` to get actual products with real prices
   - THEN call `retrieve_similar_quotes(query="job description")` to see recent pricing trends and patterns
   - Build line_items using catalog data WHILE considering recent quote pricing for context
   - Recent quotes show what was charged for similar jobs → use for pricing validation
   
2. **For quote updates**:
   - ALWAYS preserve ALL existing line items (including discounts)
   - If adding new items → call `retrieve_catalog_items` first, then add to existing items
   - MANDATORY: After ANY change → call `recalculate_discount` with ALL line items to update percentage discounts

RAG GROUNDING PROCESS (HYBRID CATALOG + QUOTES):
Step 1: Call `retrieve_catalog_items(query="customer's job description")` 
        → Returns: [{id, name, description, unit_price, unit, category}, ...]
        → This gives you BASE catalog prices
        
Step 2: Call `retrieve_similar_quotes(query="customer's job description")`
        → Returns: [{job_name, line_items, subtotal, total, created_at}, ...]
        → This shows RECENT pricing for similar jobs (last 30 days prioritized)
        
Step 3: Use catalog data as PRIMARY source, recent quotes as VALIDATION:
        - name: Use catalog item's name verbatim
        - unit_price: Use catalog item's unit_price (BASE PRICE)
        - If recent quotes show different pricing → note in description but use catalog price
        - quantity: Determine based on job scope + similar quote patterns
        
Step 4: Build line_items array with grounded data

WHY RETRIEVE BOTH:
- Catalog = authoritative base prices
- Recent quotes = real-world pricing trends, adjustments, and combinations
- Together = grounded pricing that reflects both base costs and market reality

DISCOUNT RULES:
- Discounts: NEGATIVE unit_price and total, set is_discount: true
- Percentage discounts (e.g., "10% off"): name must include "%" and set discount_target: "total"
- CRITICAL: When modifying quotes with existing discounts, you MUST:
  1. Include ALL existing line items (regular items + discounts)
  2. Add/modify the requested items
  3. Call `recalculate_discount(line_items)` to auto-update percentage discounts based on new subtotal
- Fixed discounts (e.g., "$50 off") keep their original amount (don't recalculate)

EXECUTION MODE: Headless automation - return structured JSON only. No greetings, no questions.
"""

def create_quote_builder_agent() -> LlmAgent:
    """
    Factory function to create and configure the QuoteBuilderAgent.
    
    Returns:
        An instance of LlmAgent configured for building quotes with structured output.
    """
    settings = get_settings()
    
    # Create the model using ADK
    model = Gemini(
        model="gemini-2.0-flash-exp",
        api_key=settings.gemini_api_key,
    )
    
    # Create and return the LlmAgent with output schema
    return LlmAgent(
        model=model,
        name="quote_builder_agent",
        instruction=QUOTE_BUILDER_SYSTEM_PROMPT,
        tools=QUOTE_BUILDER_TOOLS,
        output_schema=QuoteOutput,  # ✨ Enforces structured JSON output
    )
