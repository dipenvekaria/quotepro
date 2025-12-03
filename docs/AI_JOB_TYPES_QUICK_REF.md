# AI Job Types System - Quick Reference

**Created:** December 2, 2025  
**Status:** Database schema ready, implementation pending  
**Priority:** Phase 2 feature (after core workflows stable)

---

## 📌 QUICK LINKS

- **Database Migration:** `supabase/migrations/027_add_job_types_system.sql`
- **Implementation Guide:** `docs/AI_JOB_TYPES_IMPLEMENTATION.md`
- **Related Files:** Migration already committed to GitHub

---

## 🎯 THE VISION

**User uploads product CSV → AI extracts job types → Semantic matching on lead creation**

### Workflow:
1. **Settings page:** Upload products CSV
2. **AI processes:** Extracts job type taxonomy (categories, keywords, embeddings)
3. **Lead creation:** User types "AC blowing warm air" 
4. **AI matches:** Returns "HVAC Repair - Air Conditioning" (92% confidence)
5. **User confirms/edits:** Can override or add custom job type
6. **System learns:** Tracks accuracy, improves over time

---

## 🗄️ WHAT'S ALREADY BUILT

### Database Schema ✅
- `job_types` table with vector embeddings
- `job_type_match_log` for AI accuracy tracking
- Auto-increment usage counters (triggers)
- Foreign keys in leads/quotes/jobs tables
- HNSW vector index for semantic search

### Benefits:
- AI-powered semantic matching
- Custom user-defined job types
- Usage analytics (popular job types)
- Revenue tracking by job type
- Catalog item linkage (pricing intelligence)

---

## 🚧 WHAT NEEDS TO BE BUILT

### Backend (Python):
```bash
python-backend/api/routes/job_types.py
├─ POST /api/job-types/import-csv    # Upload CSV → AI extraction
├─ POST /api/job-types/match         # AI semantic matching
├─ POST /api/job-types                # Create custom job type
├─ GET  /api/job-types                # List all job types
└─ PATCH /api/job-types/{id}          # Update job type
```

### Frontend (Next.js):
```bash
src/app/(dashboard)/settings/job-types/
├─ page.tsx                           # Manage job types list
├─ import/page.tsx                    # CSV upload page
└─ [id]/page.tsx                      # Edit job type

src/components/features/job-types/
├─ job-type-selector.tsx              # Dropdown with AI suggestions
├─ ai-match-suggestions.tsx           # Show top 5 AI matches
└─ custom-job-type-dialog.tsx         # Add custom type
```

### Integration Points:
- Update `NewLeadDialog` to include AI job type matching
- Update `LeadForm` to show AI suggestions
- Add job type analytics to dashboard

---

## 📊 KEY FEATURES

### 1. CSV Import → AI Extraction
- Parse products CSV (name, category, price, description)
- AI generates job type taxonomy
- Creates embeddings for semantic search
- Saves to `job_types` table

### 2. AI Semantic Matching
- User types natural language description
- Generate embedding for description
- Vector similarity search (cosine distance)
- Return top 5 matches with confidence scores

### 3. Custom Job Types
- User can manually add job types
- AI generates embedding automatically
- Useful for niche services (e.g., "Labor Only - Handyman")

### 4. Usage Analytics
- Auto-tracks how often each job type is used
- Shows popular job types dashboard
- Revenue by job type reports
- Identifies unused types for cleanup

### 5. Accuracy Tracking
- Logs all AI suggestions
- Tracks what user actually selected
- Calculates accuracy percentage
- Enables continuous improvement

---

## 🔑 KEY DATABASE TABLES

### `job_types`
```sql
Stores company-specific job type catalog:
- name: "HVAC Repair - Air Conditioning"
- category: "HVAC"
- subcategory: "Repair"
- keywords: ["AC repair", "air conditioner fix"]
- embedding: vector(1536) for semantic search
- source: 'ai_generated' | 'user_defined' | 'csv_import'
- times_used: auto-incremented counter
```

### `job_type_match_log`
```sql
Tracks AI matching accuracy:
- customer_description: what user typed
- ai_suggestions: top 5 matches from AI
- selected_job_type_id: what user chose
- was_ai_correct: boolean for accuracy tracking
```

### Updated Tables
```sql
leads_new.job_type_id → job_types(id)
quotes_new.job_type_id → job_types(id)
jobs_new.job_type_id → job_types(id)
quote_items_new.catalog_item_id → catalog_items(id)
```

---

## 💡 EXAMPLE QUERIES

### Most Popular Job Types
```sql
SELECT 
  name, 
  category, 
  times_used,
  last_used_at
FROM job_types
WHERE company_id = $1
  AND is_active = true
ORDER BY times_used DESC
LIMIT 10;
```

### Revenue by Job Type
```sql
SELECT 
  jt.name,
  jt.category,
  COUNT(q.id) as quote_count,
  SUM(q.total) as total_revenue,
  AVG(q.total) as avg_quote_value
FROM job_types jt
JOIN quotes_new q ON q.job_type_id = jt.id
WHERE jt.company_id = $1
  AND q.status IN ('accepted', 'sent')
  AND q.created_at >= NOW() - INTERVAL '90 days'
GROUP BY jt.id
ORDER BY total_revenue DESC;
```

### AI Accuracy Report
```sql
SELECT 
  COUNT(*) as total_matches,
  SUM(CASE WHEN was_ai_correct THEN 1 ELSE 0 END) as correct_matches,
  ROUND(100.0 * SUM(CASE WHEN was_ai_correct THEN 1 ELSE 0 END) / COUNT(*), 2) as accuracy_pct
FROM job_type_match_log
WHERE company_id = $1
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Step 1: Run Migration
- [ ] Execute `supabase/migrations/027_add_job_types_system.sql` in Supabase SQL Editor
- [ ] Verify tables created: `job_types`, `job_type_match_log`
- [ ] Verify foreign keys added to leads/quotes/jobs

### Step 2: Backend Implementation
- [ ] Create `python-backend/api/routes/job_types.py`
- [ ] Implement CSV import endpoint (parse + AI extraction)
- [ ] Implement AI matching endpoint (vector search)
- [ ] Implement CRUD endpoints (create, list, update)
- [ ] Add PostgreSQL vector search function

### Step 3: Frontend Implementation
- [ ] Create settings page: `/settings/job-types`
- [ ] Create CSV upload page: `/settings/job-types/import`
- [ ] Add AI suggestions component to lead form
- [ ] Add custom job type dialog
- [ ] Update `NewLeadDialog` with job type selector

### Step 4: Testing
- [ ] Upload sample CSV with products
- [ ] Verify AI generates job types
- [ ] Test semantic matching with descriptions
- [ ] Verify usage counter increments
- [ ] Check accuracy tracking logs

### Step 5: Analytics Dashboard
- [ ] Popular job types widget
- [ ] Revenue by job type chart
- [ ] AI accuracy report
- [ ] Unused job types cleanup tool

---

## 📁 FILE LOCATIONS

```
Backend:
python-backend/
├─ api/routes/job_types.py                    ← NEW (to be created)
└─ requirements.txt                            ← May need: pandas, numpy

Frontend:
src/app/(dashboard)/settings/
├─ job-types/page.tsx                          ← NEW (to be created)
└─ job-types/import/page.tsx                   ← NEW (to be created)

src/components/features/job-types/            ← NEW (to be created)
├─ job-type-selector.tsx
├─ ai-match-suggestions.tsx
└─ custom-job-type-dialog.tsx

Database:
supabase/migrations/
└─ 027_add_job_types_system.sql                ✅ DONE

Documentation:
docs/
├─ AI_JOB_TYPES_IMPLEMENTATION.md              ✅ DONE (full guide)
└─ AI_JOB_TYPES_QUICK_REF.md                   ✅ THIS FILE
```

---

## ⚠️ IMPORTANT NOTES

1. **Migration already committed** ✅ 
   - Schema is ready in database
   - Safe to run anytime (non-breaking)

2. **Dependencies:**
   - Python: `pandas`, `numpy` for CSV parsing
   - Gemini API: `text-embedding-004` model
   - PostgreSQL: pgvector extension (already enabled)

3. **Performance:**
   - HNSW index makes searches fast (<10ms for 100k records)
   - Vector search is industry best practice
   - Scales to millions of job types

4. **Privacy:**
   - All data is company-specific (multi-tenant)
   - No cross-company data sharing
   - Embeddings stored per company

5. **Cost:**
   - Embedding generation: ~$0.0001 per job type
   - 500 job types = ~$0.05 one-time cost
   - Matching queries: free (uses stored embeddings)

---

## 🎯 WHEN TO IMPLEMENT

**Priority:** Phase 2 (after core workflows stable)

**Suggested timeline:**
- Phase 1: Fix current bugs, stabilize leads/quotes ← DO THIS FIRST
- Phase 2: Implement job types system ← THEN THIS
- Phase 3: Analytics dashboard
- Phase 4: Advanced features (scheduling, invoicing)

**Current status:** Database ready, waiting for frontend/backend implementation

---

## 📞 CONTACT FOR QUESTIONS

**Related Issues:**
- Job type not saving in leads ✅ FIXED (separate issue)
- AI job name generation ✅ WORKING (uses metadata.job_type)

**This system replaces:** Manual job type entry with AI-powered semantic matching

**Benefits:**
- ✅ Faster lead creation (AI suggests job type)
- ✅ Consistent categorization (no typos)
- ✅ Better analytics (revenue by job type)
- ✅ Smarter AI quotes (knows typical products per job type)

---

**Last Updated:** December 2, 2025  
**Status:** Ready for implementation when core features stabilize  
**Estimated Dev Time:** 8-10 hours (backend + frontend + testing)
