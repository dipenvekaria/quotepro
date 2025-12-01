"""
AI Analytics API endpoints
Track and report on AI feature usage and performance
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from supabase import Client
from datetime import datetime, timedelta

from config.database import get_db_session

router = APIRouter(prefix="/api/ai-analytics", tags=["AI Analytics"])


# Request/Response Models
class AIAnalyticsRequest(BaseModel):
    company_id: str
    days: int = 30  # Default to last 30 days


class DailyMetrics(BaseModel):
    date: str
    optimizer_uses: int
    upsell_uses: int
    rag_uses: int
    avg_win_probability: Optional[float]
    suggestions_applied: int
    upsells_accepted: int
    upsell_revenue: float


class AIAnalyticsSummary(BaseModel):
    # Overall usage
    total_ai_quotes: int
    optimizer_usage: int
    upsell_usage: int
    rag_usage: int
    
    # Performance metrics
    avg_win_probability: float
    suggestion_acceptance_rate: float
    upsell_acceptance_rate: float
    
    # Business impact
    total_upsell_revenue: float
    total_potential_revenue: float
    revenue_capture_rate: float
    
    # Daily breakdown
    daily_metrics: List[DailyMetrics]
    
    # Trends
    win_rate_trend: str  # 'up', 'down', 'stable'
    usage_trend: str


@router.post("/summary", response_model=AIAnalyticsSummary)
async def get_ai_analytics_summary(
    request: AIAnalyticsRequest,
    db: Client = Depends(get_db_session)
):
    """
    Get AI analytics summary for company
    
    Returns:
        - Usage counts (optimizer, upsell, RAG)
        - Performance metrics (win probability, acceptance rates)
        - Business impact (revenue from upsells)
        - Daily trends
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=request.days)
        
        # Get daily summary
        daily_result = db.table('ai_analytics_summary').select('*').eq(
            'company_id', request.company_id
        ).gte('date', start_date.isoformat()).lte(
            'date', end_date.isoformat()
        ).order('date', desc=False).execute()
        
        daily_data = daily_result.data or []
        
        # Get raw data for detailed metrics
        raw_result = db.table('ai_quote_analysis').select('*').eq(
            'company_id', request.company_id
        ).gte('created_at', start_date.isoformat()).execute()
        
        raw_data = raw_result.data or []
        
        # Calculate aggregates
        total_ai_quotes = len(raw_data)
        optimizer_uses = len([r for r in raw_data if r['analysis_type'] == 'optimizer'])
        upsell_uses = len([r for r in raw_data if r['analysis_type'] == 'upsell'])
        rag_uses = len([r for r in raw_data if r['analysis_type'] == 'rag_generation'])
        
        # Win probability
        win_probs = [r['win_probability'] for r in raw_data 
                     if r.get('win_probability') is not None]
        avg_win_probability = sum(win_probs) / len(win_probs) if win_probs else 0
        
        # Suggestion acceptance
        optimizer_data = [r for r in raw_data if r['analysis_type'] == 'optimizer']
        suggestions_applied = len([r for r in optimizer_data if r.get('suggestion_applied')])
        suggestion_acceptance_rate = (
            (suggestions_applied / len(optimizer_data) * 100) 
            if optimizer_data else 0
        )
        
        # Upsell metrics
        upsell_data = [r for r in raw_data if r['analysis_type'] == 'upsell']
        total_upsells_suggested = sum(r.get('suggestions_count', 0) for r in upsell_data)
        total_upsells_accepted = sum(r.get('suggestions_accepted', 0) for r in upsell_data)
        upsell_acceptance_rate = (
            (total_upsells_accepted / total_upsells_suggested * 100)
            if total_upsells_suggested > 0 else 0
        )
        
        total_upsell_revenue = sum(r.get('actual_increase', 0) or 0 for r in upsell_data)
        total_potential_revenue = sum(r.get('potential_increase', 0) or 0 for r in upsell_data)
        revenue_capture_rate = (
            (total_upsell_revenue / total_potential_revenue * 100)
            if total_potential_revenue > 0 else 0
        )
        
        # Format daily metrics
        daily_metrics = [
            DailyMetrics(
                date=d['date'],
                optimizer_uses=d.get('optimizer_uses', 0) or 0,
                upsell_uses=d.get('upsell_uses', 0) or 0,
                rag_uses=d.get('rag_uses', 0) or 0,
                avg_win_probability=d.get('avg_win_probability'),
                suggestions_applied=d.get('suggestions_applied', 0) or 0,
                upsells_accepted=d.get('total_upsells_accepted', 0) or 0,
                upsell_revenue=d.get('total_upsell_revenue', 0) or 0
            )
            for d in daily_data
        ]
        
        # Calculate trends
        win_rate_trend = _calculate_trend([m.avg_win_probability for m in daily_metrics if m.avg_win_probability])
        usage_trend = _calculate_trend([m.optimizer_uses + m.upsell_uses for m in daily_metrics])
        
        return AIAnalyticsSummary(
            total_ai_quotes=total_ai_quotes,
            optimizer_usage=optimizer_uses,
            upsell_usage=upsell_uses,
            rag_usage=rag_uses,
            avg_win_probability=round(avg_win_probability, 2),
            suggestion_acceptance_rate=round(suggestion_acceptance_rate, 1),
            upsell_acceptance_rate=round(upsell_acceptance_rate, 1),
            total_upsell_revenue=round(total_upsell_revenue, 2),
            total_potential_revenue=round(total_potential_revenue, 2),
            revenue_capture_rate=round(revenue_capture_rate, 1),
            daily_metrics=daily_metrics,
            win_rate_trend=win_rate_trend,
            usage_trend=usage_trend
        )
        
    except Exception as e:
        print(f"❌ Error getting AI analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get AI analytics: {str(e)}")


def _calculate_trend(values: List[float]) -> str:
    """Calculate trend direction from time series"""
    if len(values) < 2:
        return 'stable'
    
    # Compare first half to second half
    mid = len(values) // 2
    first_half_avg = sum(values[:mid]) / mid if mid > 0 else 0
    second_half_avg = sum(values[mid:]) / (len(values) - mid) if (len(values) - mid) > 0 else 0
    
    if second_half_avg > first_half_avg * 1.1:
        return 'up'
    elif second_half_avg < first_half_avg * 0.9:
        return 'down'
    else:
        return 'stable'


# Track AI usage (called by frontend after AI analysis)
class TrackAIUsageRequest(BaseModel):
    company_id: str
    quote_id: Optional[str] = None
    analysis_type: str  # 'optimizer', 'upsell', 'rag_generation'
    
    # Optimizer fields
    win_probability: Optional[float] = None
    price_position: Optional[str] = None
    suggested_total: Optional[float] = None
    suggestion_applied: bool = False
    
    # Upsell fields
    suggestions_count: Optional[int] = None
    suggestions_accepted: int = 0
    potential_increase: Optional[float] = None
    actual_increase: float = 0
    
    # RAG fields
    similar_quotes_found: Optional[int] = None
    catalog_matches_found: Optional[int] = None
    
    # Common fields
    job_description: Optional[str] = None
    original_total: Optional[float] = None
    final_total: Optional[float] = None
    customer_address: Optional[str] = None


@router.post("/track")
async def track_ai_usage(
    request: TrackAIUsageRequest,
    db: Client = Depends(get_db_session)
):
    """
    Track AI feature usage
    
    Called by frontend after:
    - Quote optimizer analysis
    - Upsell suggestions generated
    - RAG quote generation
    """
    try:
        data = {
            'company_id': request.company_id,
            'quote_id': request.quote_id,
            'analysis_type': request.analysis_type,
            'win_probability': request.win_probability,
            'price_position': request.price_position,
            'suggested_total': request.suggested_total,
            'suggestion_applied': request.suggestion_applied,
            'suggestions_count': request.suggestions_count,
            'suggestions_accepted': request.suggestions_accepted,
            'potential_increase': request.potential_increase,
            'actual_increase': request.actual_increase,
            'similar_quotes_found': request.similar_quotes_found,
            'catalog_matches_found': request.catalog_matches_found,
            'job_description': request.job_description,
            'original_total': request.original_total,
            'final_total': request.final_total,
            'customer_address': request.customer_address
        }
        
        result = db.table('ai_quote_analysis').insert(data).execute()
        
        return {'status': 'success', 'id': result.data[0]['id'] if result.data else None}
        
    except Exception as e:
        print(f"❌ Error tracking AI usage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to track AI usage: {str(e)}")
