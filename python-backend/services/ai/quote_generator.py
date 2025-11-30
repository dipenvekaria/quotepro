"""
Quote generation service using Gemini AI
Extracts quote generation logic from main.py
"""
from .gemini_client import GeminiClient
from db.repositories.catalog import CatalogRepository
from supabase import Client
from typing import List, Dict, Any
from pathlib import Path


class QuoteGeneratorService:
    """
    Service for AI-powered quote generation
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
    
    def generate_quote(
        self,
        company_id: str,
        description: str,
        customer_address: str,
        existing_items: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate quote using Gemini AI and company catalog
        
        Args:
            company_id: Company ID
            description: Customer request description
            customer_address: Customer address for tax calculation
            existing_items: Existing quote items (for updates)
        
        Returns:
            Generated quote with line items
        """
        # Load catalog for company
        catalog_items = self.catalog_repo.find_all_active(company_id)
        
        # Format catalog for AI
        catalog_text = self._format_catalog_for_ai(catalog_items)
        
        # Load system prompt
        system_prompt = self._load_system_prompt(company_id)
        
        # Build user prompt
        user_prompt = self._build_user_prompt(
            description=description,
            catalog_text=catalog_text,
            existing_items=existing_items,
            customer_address=customer_address
        )
        
        # Generate quote with Gemini
        result = self.gemini.generate_json(system_prompt, user_prompt)
        
        return result
    
    def _format_catalog_for_ai(self, catalog_items: List[Dict[str, Any]]) -> str:
        """
        Format catalog items as text for AI prompt
        
        Args:
            catalog_items: List of catalog items
        
        Returns:
            Formatted catalog text
        """
        if not catalog_items:
            return "No catalog items available"
        
        lines = ["PRICING CATALOG:"]
        lines.append("=" * 50)
        
        current_category = None
        for item in catalog_items:
            category = item.get("category", "Uncategorized")
            
            # Add category header
            if category != current_category:
                lines.append(f"\n## {category}")
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
        customer_address: str
    ) -> str:
        """
        Build user prompt from request details
        
        Args:
            description: Customer request
            catalog_text: Formatted catalog
            existing_items: Existing items (if updating)
            customer_address: Address for context
        
        Returns:
            User prompt text
        """
        parts = [catalog_text]
        
        if existing_items:
            parts.append("\nEXISTING ITEMS:")
            for item in existing_items:
                parts.append(f"- {item.get('name')}: {item.get('quantity')} x ${item.get('unit_price')}")
        
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
