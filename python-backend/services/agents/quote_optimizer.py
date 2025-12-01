"""
Quote Optimizer Agent
AI-powered quote analysis and pricing optimization

Features:
- Win probability calculation based on historical data
- Pricing suggestions (too high, competitive, aggressive)
- Margin analysis and recommendations
- Competitive positioning insights
"""
from services.ai.gemini_client import GeminiClient
from services.rag.retriever import Retriever
from services.rag.vector_store import VectorStore
from supabase import Client
from typing import Dict, Any, List, Optional
import statistics


class QuoteOptimizerAgent:
    """
    AI agent for quote optimization and pricing strategy
    """
    
    def __init__(self, gemini: GeminiClient, db: Client):
        """
        Initialize quote optimizer agent
        
        Args:
            gemini: Gemini AI client
            db: Database client
        """
        self.gemini = gemini
        self.db = db
        self.vector_store = VectorStore(db, gemini)
        self.retriever = Retriever(db, self.vector_store)
    
    def optimize_quote(
        self,
        company_id: str,
        job_description: str,
        proposed_total: float,
        line_items: List[Dict[str, Any]],
        customer_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze quote and provide optimization recommendations
        
        Args:
            company_id: Company ID
            job_description: Job description/type
            proposed_total: Proposed quote total
            line_items: Quote line items
            customer_address: Customer address (optional)
        
        Returns:
            Optimization analysis with suggestions
        """
        # Find similar past quotes
        similar_quotes = self.retriever.retrieve_similar_quotes(
            query=job_description,
            company_id=company_id,
            limit=20  # Get more for statistical analysis
        )
        
        if not similar_quotes or len(similar_quotes) < 3:
            return {
                'win_probability': 0.5,  # Neutral when no data
                'confidence': 'low',
                'recommendation': 'insufficient_data',
                'message': 'Not enough historical data for optimization. Need at least 3 similar quotes.',
                'similar_quotes_analyzed': len(similar_quotes) if similar_quotes else 0
            }
        
        # Analyze similar quotes
        analysis = self._analyze_similar_quotes(similar_quotes, proposed_total)
        
        # Calculate win probability
        win_probability = self._calculate_win_probability(
            proposed_total=proposed_total,
            similar_quotes=similar_quotes,
            analysis=analysis
        )
        
        # Generate pricing recommendation
        recommendation = self._generate_recommendation(
            proposed_total=proposed_total,
            analysis=analysis,
            win_probability=win_probability
        )
        
        # Calculate margin insights
        margin_analysis = self._analyze_margins(line_items, similar_quotes)
        
        # Get AI insights
        ai_insights = self._get_ai_insights(
            job_description=job_description,
            proposed_total=proposed_total,
            analysis=analysis,
            win_probability=win_probability
        )
        
        return {
            'win_probability': round(win_probability, 2),
            'confidence': self._calculate_confidence(similar_quotes),
            'recommendation': recommendation['type'],
            'suggested_total': recommendation.get('suggested_total'),
            'price_position': analysis['price_position'],
            'market_data': {
                'similar_quotes_analyzed': len(similar_quotes),
                'won_quotes': analysis['won_count'],
                'lost_quotes': analysis['lost_count'],
                'pending_quotes': analysis['pending_count'],
                'average_won_price': analysis['avg_won_total'],
                'average_lost_price': analysis['avg_lost_total'],
                'median_price': analysis['median_total'],
                'price_range': analysis['price_range']
            },
            'margin_analysis': margin_analysis,
            'insights': ai_insights,
            'similar_quotes_summary': self._format_similar_quotes(similar_quotes[:5])
        }
    
    def _analyze_similar_quotes(
        self,
        similar_quotes: List[Dict[str, Any]],
        proposed_total: float
    ) -> Dict[str, Any]:
        """
        Analyze similar quotes for pricing patterns
        
        Args:
            similar_quotes: List of similar quotes
            proposed_total: Proposed quote total
        
        Returns:
            Statistical analysis
        """
        won_quotes = [q for q in similar_quotes if q.get('status') == 'won']
        lost_quotes = [q for q in similar_quotes if q.get('status') == 'lost']
        pending_quotes = [q for q in similar_quotes if q.get('status') in ['sent', 'draft']]
        
        all_totals = [q['total'] for q in similar_quotes if q.get('total')]
        won_totals = [q['total'] for q in won_quotes if q.get('total')]
        lost_totals = [q['total'] for q in lost_quotes if q.get('total')]
        
        # Calculate statistics
        avg_total = statistics.mean(all_totals) if all_totals else 0
        median_total = statistics.median(all_totals) if all_totals else 0
        avg_won = statistics.mean(won_totals) if won_totals else 0
        avg_lost = statistics.mean(lost_totals) if lost_totals else 0
        
        price_range = {
            'min': min(all_totals) if all_totals else 0,
            'max': max(all_totals) if all_totals else 0,
            'p25': statistics.quantiles(all_totals, n=4)[0] if len(all_totals) >= 4 else 0,
            'p75': statistics.quantiles(all_totals, n=4)[2] if len(all_totals) >= 4 else 0
        }
        
        # Determine price position
        if proposed_total < avg_won * 0.9:
            price_position = 'aggressive'
        elif proposed_total < avg_won * 1.1:
            price_position = 'competitive'
        elif proposed_total < avg_lost * 1.1:
            price_position = 'moderate'
        else:
            price_position = 'premium'
        
        return {
            'won_count': len(won_quotes),
            'lost_count': len(lost_quotes),
            'pending_count': len(pending_quotes),
            'avg_total': avg_total,
            'median_total': median_total,
            'avg_won_total': avg_won,
            'avg_lost_total': avg_lost,
            'price_range': price_range,
            'price_position': price_position
        }
    
    def _calculate_win_probability(
        self,
        proposed_total: float,
        similar_quotes: List[Dict[str, Any]],
        analysis: Dict[str, Any]
    ) -> float:
        """
        Calculate win probability using historical data
        
        Args:
            proposed_total: Proposed quote total
            similar_quotes: Similar quotes
            analysis: Quote analysis
        
        Returns:
            Win probability (0.0 to 1.0)
        """
        won_count = analysis['won_count']
        total_closed = won_count + analysis['lost_count']
        
        if total_closed == 0:
            base_rate = 0.5  # No data
        else:
            base_rate = won_count / total_closed
        
        # Adjust based on price positioning
        avg_won = analysis['avg_won_total']
        
        if avg_won == 0:
            price_factor = 1.0
        else:
            price_ratio = proposed_total / avg_won
            
            # Price too low might indicate missing items
            if price_ratio < 0.7:
                price_factor = 0.85  # Slightly reduce (might be incomplete)
            elif price_ratio < 0.9:
                price_factor = 1.15  # Good pricing
            elif price_ratio < 1.1:
                price_factor = 1.0  # Competitive
            elif price_ratio < 1.3:
                price_factor = 0.85  # Higher price
            else:
                price_factor = 0.6  # Much higher
        
        win_probability = base_rate * price_factor
        
        # Clamp to reasonable range
        return max(0.05, min(0.95, win_probability))
    
    def _generate_recommendation(
        self,
        proposed_total: float,
        analysis: Dict[str, Any],
        win_probability: float
    ) -> Dict[str, Any]:
        """
        Generate pricing recommendation
        
        Args:
            proposed_total: Proposed total
            analysis: Quote analysis
            win_probability: Calculated win probability
        
        Returns:
            Recommendation details
        """
        avg_won = analysis['avg_won_total']
        price_position = analysis['price_position']
        
        if price_position == 'aggressive':
            return {
                'type': 'maintain',
                'message': 'Competitive pricing. Strong win probability.',
                'suggested_total': proposed_total
            }
        elif price_position == 'competitive':
            return {
                'type': 'maintain',
                'message': 'Well-positioned pricing. In line with won quotes.',
                'suggested_total': proposed_total
            }
        elif price_position == 'moderate':
            suggested = avg_won * 1.05  # 5% above average won
            return {
                'type': 'consider_lowering',
                'message': f'Quote is higher than average won quotes. Consider ${suggested:,.2f}',
                'suggested_total': suggested
            }
        else:  # premium
            suggested = avg_won * 1.1  # 10% above average won
            return {
                'type': 'lower_recommended',
                'message': f'Quote significantly higher than won quotes. Suggest ${suggested:,.2f}',
                'suggested_total': suggested
            }
    
    def _analyze_margins(
        self,
        line_items: List[Dict[str, Any]],
        similar_quotes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze profit margins
        
        Args:
            line_items: Current quote line items
            similar_quotes: Similar historical quotes
        
        Returns:
            Margin analysis
        """
        # Calculate current quote margin (simplified - assumes cost is 60% of price)
        total = sum(item.get('total', 0) for item in line_items)
        estimated_cost = total * 0.6  # Industry average
        margin = total - estimated_cost
        margin_percent = (margin / total * 100) if total > 0 else 0
        
        return {
            'estimated_margin': round(margin, 2),
            'margin_percentage': round(margin_percent, 1),
            'total': round(total, 2),
            'benchmark': 'Industry average margin is 35-45%'
        }
    
    def _get_ai_insights(
        self,
        job_description: str,
        proposed_total: float,
        analysis: Dict[str, Any],
        win_probability: float
    ) -> str:
        """
        Get AI-generated insights using Gemini
        
        Args:
            job_description: Job description
            proposed_total: Proposed total
            analysis: Quote analysis
            win_probability: Win probability
        
        Returns:
            AI insights text
        """
        prompt = f"""Analyze this quote and provide strategic insights:

JOB: {job_description}
PROPOSED TOTAL: ${proposed_total:,.2f}
WIN PROBABILITY: {win_probability:.0%}
PRICE POSITION: {analysis['price_position']}

MARKET DATA:
- Average won quote: ${analysis['avg_won_total']:,.2f}
- Average lost quote: ${analysis['avg_lost_total']:,.2f}
- Won/Lost ratio: {analysis['won_count']}/{analysis['lost_count']}

Provide 2-3 bullet points with:
1. Key pricing insight
2. Strategic recommendation
3. Risk/opportunity assessment

Keep concise, actionable, business-focused."""

        try:
            response = self.gemini.generate_text(
                system_prompt="You are a pricing strategy expert for field service businesses.",
                user_prompt=prompt,
                temperature=0.3
            )
            return response
        except Exception as e:
            print(f"⚠️ AI insights failed: {str(e)}")
            return "AI insights temporarily unavailable."
    
    def _calculate_confidence(self, similar_quotes: List[Dict[str, Any]]) -> str:
        """
        Calculate confidence level based on data quality
        
        Args:
            similar_quotes: Similar quotes found
        
        Returns:
            Confidence level (low/medium/high)
        """
        count = len(similar_quotes)
        
        if count < 5:
            return 'low'
        elif count < 10:
            return 'medium'
        else:
            return 'high'
    
    def _format_similar_quotes(
        self,
        similar_quotes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Format similar quotes for response
        
        Args:
            similar_quotes: Similar quotes
        
        Returns:
            Formatted quote summaries
        """
        return [
            {
                'job_type': q.get('job_type', 'Unknown'),
                'total': q.get('total', 0),
                'status': q.get('status', 'unknown'),
                'similarity': q.get('similarity_score', 0),
                'created_at': q.get('created_at', '')
            }
            for q in similar_quotes
        ]


def get_quote_optimizer(gemini: GeminiClient, db: Client) -> QuoteOptimizerAgent:
    """
    Factory function for quote optimizer agent
    
    Args:
        gemini: Gemini client
        db: Database client
    
    Returns:
        QuoteOptimizerAgent instance
    """
    return QuoteOptimizerAgent(gemini, db)
