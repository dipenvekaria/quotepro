"""
Upsell Suggester Agent
AI-powered upsell and cross-sell recommendations

Features:
- Analyzes item co-occurrence patterns in won quotes
- Suggests complementary products/services
- Calculates potential revenue increase
- Margin optimization recommendations
"""
from services.ai.gemini_client import GeminiClient
from services.rag.retriever import Retriever
from services.rag.vector_store import VectorStore
from db.repositories.catalog import CatalogRepository
from supabase import Client
from typing import Dict, Any, List, Optional
from collections import Counter, defaultdict


class UpsellSuggesterAgent:
    """
    AI agent for intelligent upsell and cross-sell suggestions
    """
    
    def __init__(self, gemini: GeminiClient, db: Client):
        """
        Initialize upsell suggester agent
        
        Args:
            gemini: Gemini AI client
            db: Database client
        """
        self.gemini = gemini
        self.db = db
        self.vector_store = VectorStore(db, gemini)
        self.retriever = Retriever(db, self.vector_store)
        self.catalog_repo = CatalogRepository(db)
    
    def suggest_upsells(
        self,
        company_id: str,
        job_description: str,
        current_items: List[Dict[str, Any]],
        current_total: float,
        customer_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate upsell suggestions based on historical patterns
        
        Args:
            company_id: Company ID
            job_description: Job description/type
            current_items: Current quote items
            current_total: Current quote total
            customer_address: Customer address (optional)
        
        Returns:
            Upsell suggestions with potential value increase
        """
        # Get current item names for pattern matching
        current_item_names = {item.get('name', '').lower() for item in current_items}
        
        # Find similar won quotes
        similar_quotes = self.retriever.retrieve_similar_quotes(
            query=job_description,
            company_id=company_id,
            limit=30  # Get more for pattern analysis
        )
        
        # Filter to only won quotes (we want successful patterns)
        won_quotes = [q for q in similar_quotes if q.get('status') == 'won']
        
        if not won_quotes or len(won_quotes) < 3:
            return {
                'suggestions': [],
                'potential_increase': 0,
                'confidence': 'low',
                'message': 'Not enough historical data for upsell suggestions. Need at least 3 won quotes.',
                'analysis': {
                    'quotes_analyzed': len(won_quotes),
                    'patterns_found': 0
                }
            }
        
        # Analyze item co-occurrence patterns
        patterns = self._analyze_item_patterns(won_quotes, current_item_names)
        
        # Get catalog for pricing
        catalog = self.catalog_repo.find_all_active(company_id)
        catalog_map = {item['name'].lower(): item for item in catalog}
        
        # Generate suggestions
        suggestions = self._generate_suggestions(
            patterns=patterns,
            current_items=current_item_names,
            catalog_map=catalog_map,
            job_description=job_description
        )
        
        # Calculate potential value increase
        potential_increase = sum(s['estimated_value'] for s in suggestions)
        
        # Get AI-powered contextual suggestions
        ai_suggestions = self._get_ai_suggestions(
            job_description=job_description,
            current_items=current_items,
            catalog=catalog,
            patterns=patterns
        )
        
        # Merge and rank all suggestions
        all_suggestions = self._merge_and_rank_suggestions(
            pattern_suggestions=suggestions,
            ai_suggestions=ai_suggestions,
            catalog_map=catalog_map
        )
        
        return {
            'suggestions': all_suggestions[:5],  # Top 5 suggestions
            'potential_increase': round(potential_increase, 2),
            'potential_increase_percentage': round((potential_increase / current_total * 100) if current_total > 0 else 0, 1),
            'confidence': self._calculate_confidence(won_quotes, patterns),
            'analysis': {
                'quotes_analyzed': len(won_quotes),
                'patterns_found': len(patterns),
                'pattern_suggestions': len(suggestions),
                'ai_suggestions': len(ai_suggestions)
            },
            'market_insights': self._get_market_insights(won_quotes, current_total)
        }
    
    def _analyze_item_patterns(
        self,
        won_quotes: List[Dict[str, Any]],
        current_items: set
    ) -> List[Dict[str, Any]]:
        """
        Analyze which items frequently appear together in won quotes
        
        Args:
            won_quotes: List of won quotes
            current_items: Set of current item names (lowercase)
        
        Returns:
            List of item patterns with co-occurrence data
        """
        # Track item co-occurrence
        co_occurrence = defaultdict(lambda: {'count': 0, 'total_value': 0, 'quotes': []})
        
        for quote in won_quotes:
            quote_items = self._extract_quote_items(quote)
            quote_item_names = {item.lower() for item in quote_items}
            
            # Find overlap with current items
            overlap = current_items & quote_item_names
            
            if overlap:
                # Find items in this quote that we don't have yet
                missing_items = quote_item_names - current_items
                
                for missing_item in missing_items:
                    co_occurrence[missing_item]['count'] += 1
                    co_occurrence[missing_item]['quotes'].append(quote.get('id'))
                    
                    # Try to get value from quote items
                    item_value = self._get_item_value_from_quote(quote, missing_item)
                    if item_value:
                        co_occurrence[missing_item]['total_value'] += item_value
        
        # Convert to list and calculate averages
        patterns = []
        for item_name, data in co_occurrence.items():
            if data['count'] >= 2:  # Must appear in at least 2 quotes
                patterns.append({
                    'item_name': item_name,
                    'frequency': data['count'],
                    'frequency_percentage': round(data['count'] / len(won_quotes) * 100, 1),
                    'avg_value': round(data['total_value'] / data['count'], 2) if data['count'] > 0 else 0,
                    'total_value': data['total_value']
                })
        
        # Sort by frequency
        patterns.sort(key=lambda x: x['frequency'], reverse=True)
        
        return patterns
    
    def _extract_quote_items(self, quote: Dict[str, Any]) -> List[str]:
        """Extract item names from quote"""
        items = []
        
        # Try different possible structures
        if 'items' in quote:
            items = [item.get('name', '') for item in quote['items']]
        elif 'line_items' in quote:
            items = [item.get('name', '') for item in quote['line_items']]
        
        return [item for item in items if item]
    
    def _get_item_value_from_quote(
        self,
        quote: Dict[str, Any],
        item_name: str
    ) -> Optional[float]:
        """Get item value from quote"""
        items = quote.get('items', []) or quote.get('line_items', [])
        
        for item in items:
            if item.get('name', '').lower() == item_name.lower():
                return item.get('total', 0) or item.get('unit_price', 0)
        
        return None
    
    def _generate_suggestions(
        self,
        patterns: List[Dict[str, Any]],
        current_items: set,
        catalog_map: Dict[str, Dict[str, Any]],
        job_description: str
    ) -> List[Dict[str, Any]]:
        """
        Generate upsell suggestions from patterns
        
        Args:
            patterns: Item co-occurrence patterns
            current_items: Current items in quote
            catalog_map: Catalog lookup map
            job_description: Job description
        
        Returns:
            List of suggestions
        """
        suggestions = []
        
        for pattern in patterns[:10]:  # Top 10 patterns
            item_name = pattern['item_name']
            
            # Skip if already in quote
            if item_name in current_items:
                continue
            
            # Look up in catalog
            catalog_item = catalog_map.get(item_name)
            
            if catalog_item:
                suggestions.append({
                    'item_name': catalog_item['name'],
                    'category': catalog_item.get('category', 'Other'),
                    'estimated_value': catalog_item.get('base_price', pattern['avg_value']),
                    'frequency': pattern['frequency'],
                    'frequency_percentage': pattern['frequency_percentage'],
                    'reason': f"Appears in {pattern['frequency_percentage']}% of similar won quotes",
                    'source': 'pattern_analysis',
                    'confidence': 'high' if pattern['frequency'] >= 5 else 'medium'
                })
            else:
                # Item not in current catalog, but was common in past
                suggestions.append({
                    'item_name': item_name.title(),
                    'category': 'Unknown',
                    'estimated_value': pattern['avg_value'],
                    'frequency': pattern['frequency'],
                    'frequency_percentage': pattern['frequency_percentage'],
                    'reason': f"Commonly added item (${pattern['avg_value']:,.2f} avg)",
                    'source': 'historical_pattern',
                    'confidence': 'medium'
                })
        
        return suggestions
    
    def _get_ai_suggestions(
        self,
        job_description: str,
        current_items: List[Dict[str, Any]],
        catalog: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Get AI-powered contextual upsell suggestions
        
        Args:
            job_description: Job description
            current_items: Current quote items
            catalog: Full catalog
            patterns: Historical patterns
        
        Returns:
            AI-generated suggestions
        """
        # Format current items
        current_items_text = "\n".join([
            f"- {item.get('name')}: ${item.get('total', 0):,.2f}"
            for item in current_items
        ])
        
        # Format top catalog items by category
        catalog_by_category = defaultdict(list)
        for item in catalog[:30]:  # Limit to top 30
            catalog_by_category[item.get('category', 'Other')].append(item)
        
        catalog_text = ""
        for category, items in list(catalog_by_category.items())[:5]:  # Top 5 categories
            catalog_text += f"\n{category}:\n"
            for item in items[:5]:  # Top 5 items per category
                catalog_text += f"  - {item['name']}: ${item.get('base_price', 0):,.2f}\n"
        
        prompt = f"""Analyze this quote and suggest 3 high-value upsell items:

JOB: {job_description}

CURRENT ITEMS:
{current_items_text}

AVAILABLE CATALOG:{catalog_text}

Suggest 3 items that:
1. Make sense for this job type
2. Add real customer value
3. Have good profit margins
4. Are commonly purchased together

Format as JSON array:
[
  {{"item": "name", "value": 100.0, "reason": "why customer needs this"}},
  ...
]
"""

        try:
            response = self.gemini.generate_json(
                system_prompt="You are an expert field service sales consultant. Suggest valuable upsells that genuinely benefit customers.",
                user_prompt=prompt
            )
            
            # Parse AI response
            if isinstance(response, list):
                return [
                    {
                        'item_name': s.get('item', ''),
                        'estimated_value': s.get('value', 0),
                        'reason': s.get('reason', ''),
                        'source': 'ai_recommendation',
                        'confidence': 'high',
                        'category': 'AI Suggested'
                    }
                    for s in response[:3]
                ]
            
        except Exception as e:
            print(f"⚠️ AI suggestions failed: {str(e)}")
        
        return []
    
    def _merge_and_rank_suggestions(
        self,
        pattern_suggestions: List[Dict[str, Any]],
        ai_suggestions: List[Dict[str, Any]],
        catalog_map: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Merge and rank all suggestions
        
        Args:
            pattern_suggestions: Pattern-based suggestions
            ai_suggestions: AI-generated suggestions
            catalog_map: Catalog lookup
        
        Returns:
            Ranked suggestions
        """
        all_suggestions = pattern_suggestions + ai_suggestions
        
        # Remove duplicates (by item name)
        seen = set()
        unique_suggestions = []
        
        for suggestion in all_suggestions:
            item_name = suggestion['item_name'].lower()
            if item_name not in seen:
                seen.add(item_name)
                unique_suggestions.append(suggestion)
        
        # Rank by: confidence, frequency, value
        def rank_score(s):
            confidence_score = {'high': 3, 'medium': 2, 'low': 1}.get(s.get('confidence', 'low'), 1)
            frequency_score = s.get('frequency', 0)
            value_score = s.get('estimated_value', 0) / 100  # Normalize
            
            return (confidence_score * 10) + frequency_score + value_score
        
        unique_suggestions.sort(key=rank_score, reverse=True)
        
        return unique_suggestions
    
    def _calculate_confidence(
        self,
        won_quotes: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]]
    ) -> str:
        """Calculate confidence level"""
        quote_count = len(won_quotes)
        pattern_count = len(patterns)
        
        if quote_count >= 15 and pattern_count >= 5:
            return 'high'
        elif quote_count >= 5 and pattern_count >= 2:
            return 'medium'
        else:
            return 'low'
    
    def _get_market_insights(
        self,
        won_quotes: List[Dict[str, Any]],
        current_total: float
    ) -> Dict[str, Any]:
        """Get market insights from won quotes"""
        totals = [q.get('total', 0) for q in won_quotes if q.get('total')]
        
        if not totals:
            return {}
        
        avg_total = sum(totals) / len(totals)
        max_total = max(totals)
        
        return {
            'average_won_quote': round(avg_total, 2),
            'highest_won_quote': round(max_total, 2),
            'current_vs_average': round((current_total / avg_total - 1) * 100, 1) if avg_total > 0 else 0,
            'upside_potential': round(max_total - current_total, 2) if max_total > current_total else 0
        }


def get_upsell_suggester(gemini: GeminiClient, db: Client) -> UpsellSuggesterAgent:
    """
    Factory function for upsell suggester agent
    
    Args:
        gemini: Gemini client
        db: Database client
    
    Returns:
        UpsellSuggesterAgent instance
    """
    return UpsellSuggesterAgent(gemini, db)
