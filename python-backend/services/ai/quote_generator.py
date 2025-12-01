"""
Quote generation service using Gemini AI with RAG
Extracts quote generation logic from main.py
Enhanced with vector search for similar quotes and catalog items
"""
from .gemini_client import GeminiClient
from db.repositories.catalog import CatalogRepository
from services.rag.vector_store import VectorStore
from services.rag.retriever import Retriever
from supabase import Client
from typing import List, Dict, Any, Optional
from pathlib import Path


class QuoteGeneratorService:
    """
    Service for AI-powered quote generation with RAG
    """
    
    def __init__(self, gemini: GeminiClient, db: Client):
        """
        Initialize quote generator
        
        Args:
            gemini: Gemini client
            db: Database client
        """
        self.gemini = gemini
        self.db = db
        self.catalog_repo = CatalogRepository(db)
        self.vector_store = VectorStore(db, gemini)
        self.retriever = Retriever(db, self.vector_store)
        self.rag_enabled = True  # Enable RAG by default
    
    def generate_quote(
        self,
        company_id: str,
        description: str,
        customer_address: str,
        existing_items: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate quote using Gemini AI, company catalog, and RAG
        
        RAG Enhancement:
        - Searches for similar past quotes for pricing reference
        - Searches for relevant catalog items using semantic search
        - Provides context to AI for more accurate quotes
        
        Args:
            company_id: Company ID
            description: Customer request description
            customer_address: Customer address for tax calculation
            existing_items: Existing quote items (for updates)
        
        Returns:
            Generated quote with line items and RAG metadata
        """
        # Load catalog for company
        catalog_items = self.catalog_repo.find_all_active(company_id)
        
        # RAG: Search for similar past quotes
        similar_quotes = []
        catalog_matches = []
        if self.rag_enabled:
            try:
                # Search similar quotes (limit 3 most relevant)
                similar_quotes = self.retriever.retrieve_similar_quotes(
                    query=description,
                    company_id=company_id,
                    limit=3
                )
                
                # Search catalog using vector search (more accurate than keyword)
                catalog_matches = self.vector_store.search_similar(
                    query_text=description,
                    company_id=company_id,
                    entity_type="catalog_item",
                    limit=10
                )
                
                print(f"✨ RAG: Found {len(similar_quotes)} similar quotes, {len(catalog_matches)} catalog matches")
            except Exception as e:
                print(f"⚠️ RAG search failed (continuing without): {str(e)}")
        
        # Format catalog for AI
        catalog_text = self._format_catalog_for_ai(catalog_items, catalog_matches)
        
        # Load system prompt
        system_prompt = self._load_system_prompt(company_id)
        
        # Build user prompt with RAG context
        user_prompt = self._build_user_prompt(
            description=description,
            catalog_text=catalog_text,
            existing_items=existing_items,
            customer_address=customer_address,
            similar_quotes=similar_quotes
        )
        
        # Generate quote with Gemini
        result = self.gemini.generate_json(system_prompt, user_prompt)
        
        # Add RAG metadata to response
        result['rag_metadata'] = {
            'similar_quotes_found': len(similar_quotes),
            'catalog_matches_found': len(catalog_matches),
            'rag_enabled': self.rag_enabled
        }
        
        return result
    
    def _format_catalog_for_ai(
        self, 
        catalog_items: List[Dict[str, Any]],
        catalog_matches: List[Dict[str, Any]] = None
    ) -> str:
        """
        Format catalog items as text for AI prompt
        Prioritizes RAG-matched items for better relevance
        
        Args:
            catalog_items: Full catalog list
            catalog_matches: Vector search matches (prioritized)
        
        Returns:
            Formatted catalog text
        """
        if not catalog_items:
            return "No catalog items available"
        
        lines = ["PRICING CATALOG:"]
        lines.append("=" * 50)
        
        # Add RAG-matched items first (most relevant)
        if catalog_matches:
            lines.append("\n## 🎯 MOST RELEVANT ITEMS (AI-Recommended)")
            match_ids = {match.get("entity_id") for match in catalog_matches}
            
            for match in catalog_matches[:5]:  # Top 5 matches
                # Find full item details
                item = next((i for i in catalog_items if i["id"] == match.get("entity_id")), None)
                if item:
                    name = item["name"]
                    price = item["base_price"]
                    unit = item.get("unit", "each")
                    description = item.get("description", "")
                    similarity = match.get("similarity", 0)
                    
                    lines.append(f"- {name}: ${price:.2f}/{unit} (relevance: {similarity:.0%})")
                    if description:
                        lines.append(f"  ({description})")
        
        # Add full catalog organized by category
        lines.append("\n## FULL CATALOG")
        current_category = None
        for item in catalog_items:
            category = item.get("category", "Uncategorized")
            
            # Add category header
            if category != current_category:
                lines.append(f"\n### {category}")
                current_category = category
            
            # Format item
            name = item["name"]
            price = item["base_price"]
            unit = item.get("unit", "each")
            description = item.get("description", "")
            
            lines.append(f"- {name}: ${price:.2f}/{unit}")
            if description:
                lines.append(f"  ({description})")
        
        return "\n".join(lines)
    
    def _load_system_prompt(self, company_id: str) -> str:
        """
        Load system prompt (supports company-specific overrides)
        
        Args:
            company_id: Company ID
        
        Returns:
            System prompt text
        """
        project_root = Path(__file__).parent.parent.parent.parent
        
        # Try company-specific prompt first
        company_prompt_path = project_root / "prompts" / "companies" / company_id / "default-system-prompt.md"
        if company_prompt_path.exists():
            return company_prompt_path.read_text(encoding='utf-8')
        
        # Fall back to default
        default_prompt_path = project_root / "prompts" / "default-system-prompt.md"
        if default_prompt_path.exists():
            return default_prompt_path.read_text(encoding='utf-8')
        
        # Hardcoded fallback
        return self._get_hardcoded_prompt()
    
    def _build_user_prompt(
        self,
        description: str,
        catalog_text: str,
        existing_items: List[Dict[str, Any]],
        customer_address: str,
        similar_quotes: List[Dict[str, Any]] = None
    ) -> str:
        """
        Build user prompt from request details with RAG context
        
        Args:
            description: Customer request
            catalog_text: Formatted catalog
            existing_items: Existing items (if updating)
            customer_address: Address for context
            similar_quotes: Similar past quotes from RAG
        
        Returns:
            User prompt text with RAG context
        """
        parts = []
        
        # Add RAG context first (similar quotes for reference)
        if similar_quotes:
            parts.append("SIMILAR PAST QUOTES (for reference):")
            parts.append("=" * 50)
            for i, quote in enumerate(similar_quotes, 1):
                job_type = quote.get('job_type', 'Unknown')
                total = quote.get('total', 0)
                similarity = quote.get('similarity_score', 0)
                status = quote.get('status', 'unknown')
                
                parts.append(f"\n{i}. {job_type} - ${total:,.2f} (similarity: {similarity:.0%}, status: {status})")
                
                # Show a few key items from the quote
                if 'items' in quote or 'line_items' in quote:
                    items = quote.get('items') or quote.get('line_items', [])
                    if items and len(items) > 0:
                        parts.append("   Key items:")
                        for item in items[:3]:  # Show top 3 items
                            item_name = item.get('name', 'Unknown')
                            item_total = item.get('total', 0)
                            parts.append(f"   - {item_name}: ${item_total:,.2f}")
            
            parts.append("\n" + "=" * 50)
            parts.append("Use these similar quotes as pricing guidance, but always use current catalog prices.\n")
        
        # Add catalog
        parts.append(catalog_text)
        
        # Add existing items
        if existing_items:
            parts.append("\nEXISTING ITEMS:")
            for item in existing_items:
                parts.append(f"- {item.get('name')}: {item.get('quantity')} x ${item.get('unit_price')}")
        
        # Add context
        parts.append(f"\nCUSTOMER ADDRESS: {customer_address}")
        parts.append(f"\nCUSTOMER REQUEST:\n{description}")
        
        return "\n".join(parts)
    
    def _get_hardcoded_prompt(self) -> str:
        """Hardcoded fallback prompt"""
        return """You are an expert field-service admin who has written 15,000 winning quotes.
Convert the contractor's bullet points into a polished, itemized quote.

CRITICAL RULES:
1. USE ONLY THE PROVIDED PRICING CATALOG
2. DO NOT invent or modify prices
3. Output ONLY valid JSON structure
4. For discounts, use NEGATIVE numbers

Output format:
{
  "line_items": [{"name": "...", "quantity": 1, "unit_price": 100, "total": 100}],
  "subtotal": 100,
  "tax_rate": 8.5,
  "total": 108.50,
  "notes": ""
}"""
