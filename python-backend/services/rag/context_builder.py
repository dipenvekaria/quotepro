"""
Context Builder for formatting retrieved documents into AI prompts
Converts RAG results into structured text for Gemini
"""
from typing import List, Dict, Any, Optional


class ContextBuilder:
    """
    Formats retrieved documents into context strings for AI prompts
    """
    
    @staticmethod
    def build_quote_context(
        similar_quotes: List[Dict[str, Any]],
        max_quotes: int = 10,
        include_items: bool = True
    ) -> str:
        """
        Format similar quotes as context for AI
        
        Args:
            similar_quotes: List of similar quotes from retriever
            max_quotes: Maximum quotes to include
            include_items: Whether to include line items
        
        Returns:
            Formatted context string
        
        Example output:
            SIMILAR PAST QUOTES (for reference):
            
            1. Quote Q-2024-123 ($4,500) - Similarity: 92%
               Customer: John Smith
               Description: HVAC system replacement 3-ton
               Items:
               - Carrier 3-ton AC unit: $3,500
               - Installation labor (8 hours): $800
               - Permits: $200
               Status: Accepted
               
            2. Quote Q-2024-456 ($4,200)...
        """
        if not similar_quotes:
            return "No similar past quotes found."
        
        lines = ["SIMILAR PAST QUOTES (for reference):", "=" * 60, ""]
        
        for idx, quote in enumerate(similar_quotes[:max_quotes], 1):
            # Header
            quote_num = quote.get("quote_number", f"#{idx}")
            total = quote.get("total", 0)
            similarity = quote.get("similarity_score", 0) * 100
            
            lines.append(f"{idx}. Quote {quote_num} (${total:,.2f}) - Similarity: {similarity:.0f}%")
            
            # Customer
            customer_name = quote.get("customer_name", "Unknown")
            lines.append(f"   Customer: {customer_name}")
            
            # Description/Job name
            if quote.get("job_name"):
                lines.append(f"   Job: {quote['job_name']}")
            if quote.get("description"):
                desc = quote["description"][:100] + "..." if len(quote.get("description", "")) > 100 else quote.get("description", "")
                lines.append(f"   Description: {desc}")
            
            # Line items
            if include_items and quote.get("items"):
                lines.append("   Items:")
                for item in quote["items"][:10]:  # Max 10 items per quote
                    name = item.get("name", "Unknown")
                    qty = item.get("quantity", 1)
                    price = item.get("unit_price", 0)
                    total_item = item.get("total", 0)
                    
                    if qty == 1:
                        lines.append(f"   - {name}: ${price:,.2f}")
                    else:
                        lines.append(f"   - {name}: {qty} × ${price:,.2f} = ${total_item:,.2f}")
            
            # Status
            status = quote.get("status", "unknown")
            lines.append(f"   Status: {status.title()}")
            
            # Notes (if any)
            if quote.get("notes"):
                notes = quote["notes"][:150] + "..." if len(quote.get("notes", "")) > 150 else quote.get("notes", "")
                lines.append(f"   Notes: {notes}")
            
            lines.append("")  # Blank line between quotes
        
        return "\n".join(lines)
    
    @staticmethod
    def build_customer_context(customer_history: Dict[str, Any]) -> str:
        """
        Format customer history as context
        
        Args:
            customer_history: Customer history from retriever
        
        Returns:
            Formatted context string
        """
        if not customer_history:
            return "No customer history available."
        
        lines = ["CUSTOMER HISTORY:", "=" * 60, ""]
        
        # Customer overview
        customer = customer_history.get("customer", {})
        if customer:
            lines.append(f"Customer: {customer.get('name', 'Unknown')}")
            lines.append(f"Email: {customer.get('email', 'N/A')}")
            lines.append(f"Phone: {customer.get('phone', 'N/A')}")
            
            # Stats
            lines.append(f"\nCustomer Stats:")
            lines.append(f"- Total quotes: {customer.get('total_quotes', 0)}")
            lines.append(f"- Accepted quotes: {customer.get('accepted_quotes', 0)}")
            lines.append(f"- Total value: ${customer.get('total_quote_value', 0):,.2f}")
            lines.append(f"- Completed jobs: {customer.get('completed_jobs', 0)}")
            lines.append("")
        
        # Past quotes summary
        past_quotes = customer_history.get("past_quotes", [])
        if past_quotes:
            lines.append(f"Past Quotes ({len(past_quotes)}):")
            for quote in past_quotes[:5]:  # Show last 5
                quote_num = quote.get("quote_number", "Unknown")
                total = quote.get("total", 0)
                status = quote.get("status", "unknown")
                job_name = quote.get("job_name", "Unnamed job")
                lines.append(f"- {quote_num}: {job_name} (${total:,.2f}) - {status.title()}")
            lines.append("")
        
        # Past jobs summary
        past_jobs = customer_history.get("past_jobs", [])
        if past_jobs:
            lines.append(f"Past Jobs ({len(past_jobs)}):")
            for job in past_jobs[:5]:  # Show last 5
                job_num = job.get("job_number", "Unknown")
                title = job.get("title", "Untitled")
                status = job.get("status", "unknown")
                lines.append(f"- {job_num}: {title} - {status.title()}")
            lines.append("")
        
        # Notes and context
        notes = customer_history.get("notes_and_context", [])
        if notes:
            lines.append("Important Notes:")
            for note in notes[:3]:  # Show top 3
                content = note.get("content", "")[:200]
                lines.append(f"- {content}")
            lines.append("")
        
        return "\n".join(lines)
    
    @staticmethod
    def build_catalog_context(
        catalog_items: List[Dict[str, Any]],
        max_items: int = 50
    ) -> str:
        """
        Format catalog items for AI prompt
        
        Args:
            catalog_items: List of catalog items
            max_items: Maximum items to include
        
        Returns:
            Formatted catalog text
        """
        if not catalog_items:
            return "No catalog items available."
        
        lines = ["PRICING CATALOG:", "=" * 60, ""]
        
        # Group by category
        by_category = {}
        for item in catalog_items[:max_items]:
            category = item.get("category", "Uncategorized")
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(item)
        
        # Format each category
        for category, items in by_category.items():
            lines.append(f"\n## {category}")
            lines.append("-" * 40)
            
            for item in items:
                name = item.get("name", "Unknown")
                price = item.get("base_price", 0)
                unit = item.get("unit", "each")
                description = item.get("description", "")
                
                lines.append(f"{name}: ${price:,.2f}/{unit}")
                if description:
                    lines.append(f"  ({description})")
                
                # Labor hours if available
                labor_hours = item.get("labor_hours")
                if labor_hours:
                    lines.append(f"  Est. labor: {labor_hours} hours")
            
            lines.append("")
        
        return "\n".join(lines)
    
    @staticmethod
    def build_upsell_context(suggestions: List[Dict[str, Any]]) -> str:
        """
        Format upsell suggestions for AI
        
        Args:
            suggestions: List of suggested items from retriever
        
        Returns:
            Formatted suggestions text
        """
        if not suggestions:
            return "No upsell suggestions available."
        
        lines = ["COMMON UPSELL ITEMS (based on similar quotes):", "=" * 60, ""]
        
        for idx, item in enumerate(suggestions, 1):
            name = item.get("name", "Unknown")
            frequency = item.get("frequency", 0)
            avg_price = item.get("avg_price", 0)
            
            lines.append(f"{idx}. {name}")
            lines.append(f"   Added in {frequency} similar quotes")
            lines.append(f"   Average price: ${avg_price:,.2f}")
            lines.append("")
        
        return "\n".join(lines)
    
    @staticmethod
    def build_full_context(
        similar_quotes: Optional[List[Dict[str, Any]]] = None,
        customer_history: Optional[Dict[str, Any]] = None,
        catalog_items: Optional[List[Dict[str, Any]]] = None,
        upsell_suggestions: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Build complete RAG context combining all available information
        
        Args:
            similar_quotes: Similar past quotes
            customer_history: Customer history
            catalog_items: Catalog items
            upsell_suggestions: Upsell suggestions
        
        Returns:
            Complete formatted context
        """
        sections = []
        
        if similar_quotes:
            sections.append(ContextBuilder.build_quote_context(similar_quotes))
        
        if customer_history:
            sections.append(ContextBuilder.build_customer_context(customer_history))
        
        if catalog_items:
            sections.append(ContextBuilder.build_catalog_context(catalog_items))
        
        if upsell_suggestions:
            sections.append(ContextBuilder.build_upsell_context(upsell_suggestions))
        
        if not sections:
            return "No contextual information available."
        
        return "\n\n".join(sections)
