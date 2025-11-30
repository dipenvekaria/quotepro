# PHASE 1 - QUICK START GUIDE

**Goal:** Create new database schema without breaking existing app  
**Duration:** 2 weeks  
**Risk:** 🟢 LOW (additive only)  

---

## ✅ PRE-FLIGHT CHECKLIST

Before we begin, verify you have:

- [ ] **Supabase CLI installed**
  ```bash
  # Check if installed
  supabase --version
  
  # If not installed:
  brew install supabase/tap/supabase
  ```

- [ ] **Database access working**
  ```bash
  # Test connection
  supabase status
  ```

- [ ] **Backup created**
  ```bash
  # Create backup BEFORE any changes
  supabase db dump -f backup-$(date +%Y%m%d).sql
  ```

- [ ] **Local database reset capability**
  ```bash
  # Know how to reset if needed
  supabase db reset
  ```

---

## 🚀 STEP-BY-STEP IMPLEMENTATION

### **Step 1: Create Migration 020 (pgvector)**

**What:** Enable vector database extension for AI embeddings

**File:** `/supabase/migrations/020_enable_pgvector.sql`

**Content:**
```sql
-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector operations
SELECT '[1,2,3]'::vector;
```

**Test:**
```bash
# Apply migration locally
supabase db reset

# Verify extension enabled
supabase db execute "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

**Success Criteria:**
- ✅ Extension installed without errors
- ✅ Vector type available
- ✅ Can create vector columns

---

### **Step 2: Create Migration 021 (New Schema)**

**What:** Create 16 new tables with relationships

**File:** `/supabase/migrations/021_create_new_schema.sql`

This is the BIG migration. Contains:
- `companies_new` (multi-tenant root)
- `users_new` (team members)
- `customers_new` (deduplicated customers)
- `customer_addresses` (multiple addresses per customer)
- `leads_new` (sales pipeline)
- `quotes_new` (quote management)
- `quote_items_new` (line items)
- `quote_options` (good/better/best)
- `jobs_new` (accepted quotes)
- `invoices_new` (billing)
- `payments` (payment tracking)
- `catalog_items` (product/service catalog)
- `ai_conversations` (AI usage tracking)
- `document_embeddings` (RAG vectors)
- `activity_log` (audit trail)
- `ai_prompts` (custom prompts)

**See:** Full SQL in `/docs/REFACTOR_PHASE_1_DATABASE.md` (starting at line 228)

**Test:**
```bash
# Apply migration
supabase db reset

# Verify tables created
supabase db execute "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_new'
ORDER BY table_name;
"

# Should see 11 tables with '_new' suffix
```

**Success Criteria:**
- ✅ All 16 tables created
- ✅ All foreign keys working
- ✅ Triggers created (updated_at)
- ✅ Helper functions created

---

### **Step 3: Create Migration 022 (Indexes)**

**What:** Add performance indexes for fast queries

**File:** `/supabase/migrations/022_create_indexes.sql`

Key indexes:
- Company-scoped queries
- Status filtering
- Date range searches
- Vector similarity (HNSW for pgvector)
- GIN indexes for JSONB/arrays

**Test:**
```bash
# Verify indexes
supabase db execute "
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE '%_new' 
ORDER BY tablename, indexname;
"

# Should see 30+ indexes
```

**Success Criteria:**
- ✅ All indexes created
- ✅ Vector index using ivfflat
- ✅ Composite indexes for common queries

---

### **Step 4: Create Migration 023 (RLS Policies)**

**What:** Row-level security to enforce company data isolation

**File:** `/supabase/migrations/023_create_rls_policies.sql`

**Critical:** Each company can ONLY see their own data

**Test:**
```bash
# Verify RLS enabled
supabase db execute "
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE '%_new';
"

# Test policy (as authenticated user)
# Should only see own company's data
```

**Success Criteria:**
- ✅ RLS enabled on all tables
- ✅ Policies prevent cross-company access
- ✅ Helper function `auth.user_company_id()` works

---

### **Step 5: Create Migration 024 (Views)**

**What:** Convenience views for common queries

**File:** `/supabase/migrations/024_create_views.sql`

Views:
- `quote_details` (quotes with items and customer)
- `job_schedule` (scheduled jobs with customer info)
- `invoice_summary` (invoices with payments)
- `lead_pipeline` (leads with conversion stats)

**Test:**
```bash
# Query views
supabase db execute "SELECT * FROM quote_details LIMIT 1;"
supabase db execute "SELECT * FROM job_schedule LIMIT 1;"
```

**Success Criteria:**
- ✅ All views created
- ✅ Views return expected columns
- ✅ Join relationships working

---

### **Step 6: Create Migration 025 (Seed Data)**

**What:** Insert test company for development

**File:** `/supabase/migrations/025_seed_data.sql`

**Test:**
```bash
# Verify seed data
supabase db execute "SELECT * FROM companies_new;"
```

**Success Criteria:**
- ✅ Test company created
- ✅ Can insert related records

---

### **Step 7: Generate TypeScript Types**

**What:** Auto-generate types from new schema

```bash
# Generate types (update with your project ID)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.new.ts
```

**Success Criteria:**
- ✅ Type file generated
- ✅ All new tables have types
- ✅ Relationships typed correctly

---

### **Step 8: Verify Existing App**

**Critical:** Make sure nothing broke!

**Test:**
```bash
# Start app
npm run dev

# Test these features:
# 1. Can load home page ✅
# 2. Can view quotes ✅
# 3. Can create new lead ✅
# 4. Can generate quote with AI ✅
# 5. Can send quote ✅
```

**Success Criteria:**
- ✅ ALL existing features work
- ✅ No errors in console
- ✅ No TypeScript errors
- ✅ No breaking changes

---

## 📋 COMPLETION CHECKLIST

When Phase 1 is complete, you should have:

- [x] ✅ Migration 020: pgvector enabled
- [x] ✅ Migration 021: 16 new tables created
- [x] ✅ Migration 022: 30+ indexes created
- [x] ✅ Migration 023: RLS policies active
- [x] ✅ Migration 024: 4 views created
- [x] ✅ Migration 025: Seed data inserted
- [x] ✅ TypeScript types generated
- [x] ✅ Existing app still works perfectly
- [x] ✅ Documentation updated
- [x] ✅ Backup created and verified

---

## 🔄 DAILY WORKFLOW

### **Each Day:**

1. **Create migration file**
2. **Apply locally:** `supabase db reset`
3. **Test:** Run verification queries
4. **Verify app:** Ensure nothing broke
5. **Commit:** Git commit with clear message
6. **Update progress:** Mark checkbox in REFACTOR_PROGRESS.md

### **Each Week:**

1. **Review progress**
2. **Update timeline if needed**
3. **Prepare for next week**

---

## 🆘 TROUBLESHOOTING

### **Problem: Migration fails**
```bash
# Rollback
supabase db reset

# Fix migration file
# Try again
```

### **Problem: RLS policy too strict**
```bash
# Temporarily disable RLS for testing
supabase db execute "ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;"
```

### **Problem: App breaks**
```bash
# Restore from backup
psql $DATABASE_URL -f backup-YYYYMMDD.sql
```

---

## 🎯 READY TO START?

Your first task:

**Create `/supabase/migrations/020_enable_pgvector.sql`**

Just say: **"Create migration 020"** and I'll generate the file!

---

**Remember:** We're building best-in-class. Take time to do it right. 🚀
