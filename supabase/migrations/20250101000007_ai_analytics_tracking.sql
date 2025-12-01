-- AI Analytics Tracking Tables
-- Track AI feature usage and performance

-- AI Quote Analysis Events
CREATE TABLE IF NOT EXISTS ai_quote_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    analysis_type TEXT NOT NULL, -- 'optimizer', 'upsell', 'rag_generation'
    
    -- Optimizer data
    win_probability DECIMAL(5,2),
    price_position TEXT, -- 'aggressive', 'competitive', 'moderate', 'premium'
    suggested_total DECIMAL(12,2),
    suggestion_applied BOOLEAN DEFAULT FALSE,
    
    -- Upsell data
    suggestions_count INTEGER,
    suggestions_accepted INTEGER DEFAULT 0,
    potential_increase DECIMAL(12,2),
    actual_increase DECIMAL(12,2) DEFAULT 0,
    
    -- RAG data
    similar_quotes_found INTEGER,
    catalog_matches_found INTEGER,
    
    -- Metadata
    job_description TEXT,
    original_total DECIMAL(12,2),
    final_total DECIMAL(12,2),
    customer_address TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_company ON ai_quote_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_quote ON ai_quote_analysis(quote_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_type ON ai_quote_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_quote_analysis(created_at);

-- RLS Policies
ALTER TABLE ai_quote_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's AI analytics"
    ON ai_quote_analysis FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their company's AI analytics"
    ON ai_quote_analysis FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company's AI analytics"
    ON ai_quote_analysis FOR UPDATE
    USING (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

-- AI Analytics Summary View
CREATE OR REPLACE VIEW ai_analytics_summary AS
SELECT 
    company_id,
    DATE_TRUNC('day', created_at) as date,
    
    -- Usage counts
    COUNT(*) FILTER (WHERE analysis_type = 'optimizer') as optimizer_uses,
    COUNT(*) FILTER (WHERE analysis_type = 'upsell') as upsell_uses,
    COUNT(*) FILTER (WHERE analysis_type = 'rag_generation') as rag_uses,
    
    -- Optimizer metrics
    AVG(win_probability) FILTER (WHERE analysis_type = 'optimizer') as avg_win_probability,
    COUNT(*) FILTER (WHERE analysis_type = 'optimizer' AND suggestion_applied = true) as suggestions_applied,
    COUNT(*) FILTER (WHERE analysis_type = 'optimizer') as total_optimizer_suggestions,
    
    -- Upsell metrics
    SUM(suggestions_accepted) FILTER (WHERE analysis_type = 'upsell') as total_upsells_accepted,
    SUM(suggestions_count) FILTER (WHERE analysis_type = 'upsell') as total_upsells_suggested,
    SUM(actual_increase) FILTER (WHERE analysis_type = 'upsell') as total_upsell_revenue,
    SUM(potential_increase) FILTER (WHERE analysis_type = 'upsell') as total_upsell_potential,
    
    -- RAG metrics
    AVG(similar_quotes_found) FILTER (WHERE analysis_type = 'rag_generation') as avg_similar_quotes,
    AVG(catalog_matches_found) FILTER (WHERE analysis_type = 'rag_generation') as avg_catalog_matches
    
FROM ai_quote_analysis
GROUP BY company_id, DATE_TRUNC('day', created_at);

COMMENT ON TABLE ai_quote_analysis IS 'Tracks AI feature usage and performance metrics';
COMMENT ON VIEW ai_analytics_summary IS 'Daily aggregated AI analytics for dashboard display';
