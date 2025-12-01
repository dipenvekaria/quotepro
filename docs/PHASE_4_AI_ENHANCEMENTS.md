# PHASE 4: AI ENHANCEMENTS

**Duration:** Week 8 (December 2-8, 2025)  
**Status:** 🚀 IN PROGRESS  
**Goal:** Add intelligent AI features for quote optimization, upselling, and automation

---

## 🎯 OBJECTIVES

Transform QuotePro into an AI-first platform that:
1. **Learns from past jobs** - RAG-enhanced quote generation
2. **Suggests optimal pricing** - Historical data analysis
3. **Recommends upsells** - Catalog-based suggestions
4. **Automates follow-ups** - Smart customer engagement

---

## 📋 PHASE 4 CHECKLIST

### **4.1: Catalog Embeddings & Indexing** (Day 1-2)
**Goal:** Index all pricing catalog items for semantic search

- [ ] Create catalog embedding job
  - [ ] Extract all pricing_items from database
  - [ ] Generate embeddings (name + description + category)
  - [ ] Store in document_embeddings table
  - [ ] Tag as entity_type: "catalog_item"

- [ ] Test catalog search
  - [ ] Query: "air conditioner" → Returns HVAC cooling items
  - [ ] Query: "replace water heater" → Returns plumbing items
  - [ ] Query: "electrical panel upgrade" → Returns electrical items

**Deliverables:**
- `python-backend/services/catalog_indexer.py` - Batch indexing script
- API endpoint: `POST /api/index-catalog` - Trigger indexing
- Verification: 100+ catalog items indexed with embeddings

---

### **4.2: RAG-Enhanced Quote Generation** (Day 3-4)
**Goal:** Use vector search to find similar past jobs and suggest line items

**Current Flow:**
```
User describes job → AI generates items → Return to frontend
```

**New RAG Flow:**
```
User describes job → 
  1. Generate embedding for description
  2. Search similar past quotes (vector search)
  3. Search relevant catalog items (vector search)
  4. Build context with: job description + similar jobs + catalog
  5. AI generates items with context
→ Return smarter, more accurate items
```

**Tasks:**
- [ ] Update `POST /api/generate-quote` endpoint
  - [ ] Add vector search before AI generation
  - [ ] Build RAG context (similar jobs + catalog)
  - [ ] Pass context to Gemini prompt
  - [ ] Return items with "confidence" scores

- [ ] Add context metadata to response
  - [ ] `similar_jobs_found`: int
  - [ ] `catalog_matches`: int
  - [ ] `confidence`: "high" | "medium" | "low"

**Deliverables:**
- Enhanced `/api/generate-quote` with RAG
- Response includes: items + context metadata
- 30%+ improvement in item accuracy

---

### **4.3: AI Agent 1 - Quote Optimizer** (Day 5)
**Goal:** Analyze quote and suggest pricing improvements

**Agent Capabilities:**
- Compare to similar past jobs
- Suggest optimal pricing based on win rates
- Flag items priced too low/high
- Recommend discount strategies

**API Endpoint:** `POST /api/agents/optimize-quote`

**Request:**
```json
{
  "quote_id": "uuid",
  "company_id": "uuid"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "pricing",
      "item": "HVAC Installation",
      "current_price": 3500,
      "suggested_price": 3950,
      "reason": "Similar jobs averaged $3,950 with 85% win rate",
      "confidence": 0.89
    },
    {
      "type": "discount",
      "current_discount": 0,
      "suggested_discount": 5,
      "reason": "Jobs in this range have 92% win rate with 5% discount"
    }
  ],
  "overall_win_probability": 0.78
}
```

**Tasks:**
- [ ] Create `services/agents/quote_optimizer.py`
- [ ] Implement pricing analysis (compare to similar jobs)
- [ ] Calculate win probability based on historical data
- [ ] API route: `POST /api/agents/optimize-quote`

---

### **4.4: AI Agent 2 - Upsell Suggester** (Day 6)
**Goal:** Recommend additional items based on current quote

**Agent Capabilities:**
- Analyze current quote items
- Search catalog for complementary products
- Suggest upsells based on:
  * What customers frequently buy together
  * Seasonal recommendations
  * Margin optimization

**API Endpoint:** `POST /api/agents/suggest-upsells`

**Request:**
```json
{
  "quote_id": "uuid",
  "company_id": "uuid",
  "current_items": ["HVAC Installation", "Ductwork"]
}
```

**Response:**
```json
{
  "upsells": [
    {
      "item_name": "Smart Thermostat Installation",
      "price": 450,
      "reason": "89% of HVAC customers accept this upgrade",
      "margin_improvement": "+15%",
      "confidence": 0.92
    },
    {
      "item_name": "Air Quality Filter Upgrade",
      "price": 200,
      "reason": "Frequently purchased with new HVAC systems",
      "confidence": 0.78
    }
  ]
}
```

**Tasks:**
- [ ] Create `services/agents/upsell_suggester.py`
- [ ] Analyze item co-occurrence patterns
- [ ] Search catalog for complementary items
- [ ] API route: `POST /api/agents/suggest-upsells`

---

### **4.5: Frontend Integration** (Day 7)
**Goal:** Add AI features to quote editor

**UI Components:**
- [ ] **Quote Optimizer Panel**
  - Show in quote editor sidebar
  - Display pricing suggestions
  - "Apply Suggestions" button
  - Win probability indicator

- [ ] **Upsell Suggester Panel**
  - Show when editing items
  - Display recommended add-ons
  - "Add to Quote" quick action
  - Revenue impact preview

- [ ] **RAG Context Indicator**
  - Show "✨ AI-Enhanced" badge when RAG is used
  - Display: "Found 5 similar jobs + 12 catalog matches"
  - Confidence score visualization

**File Updates:**
- [ ] `/src/app/(dashboard)/leads/new/page.tsx` - Add AI panels
- [ ] `/src/components/quote-optimizer-panel.tsx` - New component
- [ ] `/src/components/upsell-suggester-panel.tsx` - New component
- [ ] `/src/lib/api/ai-agents.ts` - API client methods

---

### **4.6: AI Analytics Dashboard** (Day 8)
**Goal:** Track AI performance and provide business insights

**Metrics to Track:**
- RAG usage rate (% of quotes using vector search)
- AI suggestion acceptance rate
- Revenue impact (upsells accepted)
- Win rate improvement (before/after AI suggestions)

**Dashboard Sections:**
1. **AI Performance**
   - Suggestions made vs accepted
   - Average confidence scores
   - Quote optimization impact

2. **Business Impact**
   - Additional revenue from upsells
   - Win rate trends
   - Average quote value (with/without AI)

3. **Catalog Health**
   - Most suggested items
   - Underutilized catalog items
   - Seasonal trends

**Tasks:**
- [ ] Create `services/ai_analytics.py` - Metrics collection
- [ ] API route: `GET /api/analytics/ai-performance`
- [ ] Frontend: `/src/app/(dashboard)/ai-insights/page.tsx`
- [ ] Track events: suggestion_shown, suggestion_accepted, upsell_added

---

## 🎯 SUCCESS CRITERIA

**Technical:**
- [ ] 100+ catalog items indexed with embeddings
- [ ] RAG retrieval <500ms (p95)
- [ ] All 4 AI agents operational
- [ ] Zero errors in production

**Business:**
- [ ] 30%+ of quotes use RAG-enhanced generation
- [ ] 15%+ AI suggestion acceptance rate
- [ ] 10%+ increase in average quote value
- [ ] 5%+ improvement in win rate

**User Experience:**
- [ ] AI features feel "magical, not pushy"
- [ ] Suggestions are accurate and helpful
- [ ] UI is clean and unobtrusive
- [ ] Performance impact is negligible

---

## 📊 PRIORITY BREAKDOWN

**Must Have (MVP):**
1. Catalog embeddings indexed ✅
2. RAG-enhanced quote generation ✅
3. Quote optimizer agent ✅
4. Basic frontend integration ✅

**Should Have:**
5. Upsell suggester agent
6. AI analytics dashboard
7. Confidence scoring

**Nice to Have:**
8. Job matcher agent (find similar completed jobs)
9. Follow-up automation agent
10. Predictive pricing model

---

## 🚀 GETTING STARTED

**Day 1 - Catalog Indexing:**
```bash
# 1. Create indexing script
python-backend/services/catalog_indexer.py

# 2. Run indexing job
python catalog_indexer.py --company-id <id>

# 3. Verify embeddings
SELECT COUNT(*) FROM document_embeddings WHERE entity_type = 'catalog_item';
```

**Day 2 - RAG Integration:**
```bash
# Update quote generation endpoint
python-backend/api/routes/ai.py

# Test RAG flow
curl -X POST localhost:8000/api/generate-quote \
  -d '{"description": "replace water heater", "company_id": "..."}'
```

**Day 3-4 - Build Agents:**
```bash
# Create agent modules
services/agents/quote_optimizer.py
services/agents/upsell_suggester.py

# Add API routes
api/routes/agents.py
```

**Day 5-6 - Frontend:**
```bash
# Create UI components
components/quote-optimizer-panel.tsx
components/upsell-suggester-panel.tsx

# Integrate into quote editor
```

---

## 📝 NOTES

- All AI features must work WITHOUT blocking the UI
- Suggestions are OPTIONAL - never force user acceptance
- Track everything for analytics and improvement
- Use Gemini 2.0 Flash (fast + cheap) for all operations
- Temperature = 0.0 for pricing, 0.2 for suggestions

---

**Next Steps:** Begin catalog indexing implementation
