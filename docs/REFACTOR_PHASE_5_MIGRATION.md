# PHASE 5: DATA MIGRATION & OPTIMIZATION - TECH SPEC

**Status:** 📋 Planning  
**Duration:** 1 week  
**Risk Level:** 🟡 MEDIUM (Data migration requires careful validation)  
**Dependencies:** Phases 1-4 complete  

---

## 📋 OBJECTIVE

Migrate existing data from old schema to new normalized tables, optimize performance, clean up legacy code, and prepare for production rollout.

**Key Goals:**
1. Migrate all existing quotes/leads to new tables
2. Validate data integrity (0 data loss)
3. Optimize database queries and indexes
4. Remove deprecated code and endpoints
5. Performance tuning (API <200ms, page load <1s)
6. Production readiness checklist

---

## 🎯 SUCCESS CRITERIA

- ✅ All data successfully migrated with validation
- ✅ Old and new systems produce identical results
- ✅ API response time <200ms (p95)
- ✅ Page load time <1s (p95)
- ✅ Database queries optimized (<50ms)
- ✅ Zero data loss verified
- ✅ Rollback plan tested and ready
- ✅ Production deployment successful

---

## 🗄️ DATA MIGRATION STRATEGY

### **Migration Philosophy**

**Approach:** Zero-downtime parallel migration
- New schema exists alongside old schema
- Dual-write during transition (write to both)
- Gradual migration in batches
- Continuous validation
- Easy rollback if issues arise

### **Migration Phases**

```
Phase 5A: Data Mapping & Validation Scripts
Phase 5B: Historical Data Migration (one-time)
Phase 5C: Dual-Write Implementation
Phase 5D: Validation & Verification
Phase 5E: Cutover & Cleanup
```

---

## 📊 DATA MAPPING

### **Old Schema → New Schema Mapping**

```sql
-- OLD: quotes table (stores both leads AND quotes)
quotes {
  id UUID,
  company_id UUID,
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Lead fields
  lead_status TEXT,  -- new, contacted, qualified
  
  -- Quote fields
  status TEXT,       -- draft, sent, accepted
  job_name TEXT,
  description TEXT,
  items JSONB,
  total DECIMAL,
  
  -- Invoice fields (added later)
  invoice_number TEXT,
  invoice_sent_at TIMESTAMP,
  paid_at TIMESTAMP
}

-- NEW: Normalized tables
customers_new {
  id UUID,
  company_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT
}

customer_addresses {
  id UUID,
  customer_id UUID,
  address TEXT,
  is_primary BOOLEAN
}

leads_new {
  id UUID,
  company_id UUID,
  customer_id UUID,
  status TEXT,
  description TEXT,
  scheduled_visit_at TIMESTAMP
}

quotes_new {
  id UUID,
  company_id UUID,
  customer_id UUID,
  lead_id UUID,
  quote_number TEXT,
  job_name TEXT,
  status TEXT,
  items → quote_items_new
}

quote_items_new {
  id UUID,
  quote_id UUID,
  name TEXT,
  quantity DECIMAL,
  unit_price DECIMAL,
  total DECIMAL
}

jobs_new {
  id UUID,
  company_id UUID,
  quote_id UUID,
  customer_id UUID,
  status TEXT
}

invoices_new {
  id UUID,
  company_id UUID,
  job_id UUID,
  customer_id UUID,
  invoice_number TEXT,
  sent_at TIMESTAMP,
  paid_at TIMESTAMP
}
```

---

## 🔧 MIGRATION SCRIPTS

### **Script 1: Migrate Customers (Deduplicate)**

```sql
-- /supabase/migrations/026_migrate_customers.sql

-- Create customers from unique phone/email combinations
INSERT INTO customers_new (id, company_id, name, email, phone, created_at)
SELECT 
  gen_random_uuid() as id,
  company_id,
  customer_name as name,
  email,
  phone,
  MIN(created_at) as created_at
FROM quotes
WHERE customer_name IS NOT NULL
GROUP BY company_id, customer_name, email, phone
ON CONFLICT (company_id, phone) DO NOTHING;

-- Create addresses
INSERT INTO customer_addresses (id, customer_id, address, is_primary, created_at)
SELECT 
  gen_random_uuid() as id,
  c.id as customer_id,
  q.address,
  true as is_primary,
  q.created_at
FROM quotes q
JOIN customers_new c ON 
  c.company_id = q.company_id AND
  c.phone = q.phone
WHERE q.address IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verification
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT phone) INTO old_count FROM quotes WHERE phone IS NOT NULL;
  SELECT COUNT(*) INTO new_count FROM customers_new;
  
  RAISE NOTICE 'Old unique customers: %, New customers: %', old_count, new_count;
  
  IF new_count < old_count THEN
    RAISE EXCEPTION 'Customer migration failed: Missing records';
  END IF;
END $$;
```

### **Script 2: Migrate Leads**

```sql
-- /supabase/migrations/027_migrate_leads.sql

-- Migrate quotes with lead_status to leads_new
INSERT INTO leads_new (
  id,
  company_id,
  customer_id,
  status,
  description,
  scheduled_visit_at,
  created_at,
  updated_at
)
SELECT 
  q.id,
  q.company_id,
  c.id as customer_id,
  q.lead_status as status,
  q.description,
  q.scheduled_at as scheduled_visit_at,
  q.created_at,
  q.updated_at
FROM quotes q
JOIN customers_new c ON 
  c.company_id = q.company_id AND
  c.phone = q.phone
WHERE q.lead_status IS NOT NULL
  AND q.lead_status != 'converted';  -- Converted leads became quotes

-- Verification
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM quotes WHERE lead_status IS NOT NULL;
  SELECT COUNT(*) INTO new_count FROM leads_new;
  
  RAISE NOTICE 'Old leads: %, New leads: %', old_count, new_count;
  
  IF new_count != old_count THEN
    RAISE EXCEPTION 'Lead migration failed: Count mismatch';
  END IF;
END $$;
```

### **Script 3: Migrate Quotes**

```sql
-- /supabase/migrations/028_migrate_quotes.sql

-- Migrate quotes
INSERT INTO quotes_new (
  id,
  company_id,
  customer_id,
  lead_id,
  quote_number,
  job_name,
  description,
  subtotal,
  discount_amount,
  tax_rate,
  tax_amount,
  total,
  notes,
  status,
  sent_at,
  created_by,
  created_at,
  updated_at
)
SELECT 
  q.id,
  q.company_id,
  c.id as customer_id,
  l.id as lead_id,
  q.quote_number,
  q.job_name,
  q.description,
  q.subtotal,
  q.discount_amount,
  q.tax_rate,
  q.tax_amount,
  q.total,
  q.notes,
  q.status,
  q.sent_at,
  q.user_id as created_by,
  q.created_at,
  q.updated_at
FROM quotes q
JOIN customers_new c ON 
  c.company_id = q.company_id AND
  c.phone = q.phone
LEFT JOIN leads_new l ON l.id = q.id  -- Link to lead if exists
WHERE q.status IS NOT NULL  -- Has quote status (not just lead)
  AND q.job_name IS NOT NULL;

-- Migrate quote items (from JSONB array to separate table)
INSERT INTO quote_items_new (
  id,
  quote_id,
  name,
  description,
  quantity,
  unit_price,
  total,
  option_tier,
  is_upsell,
  is_discount,
  sort_order
)
SELECT 
  gen_random_uuid() as id,
  q.id as quote_id,
  item->>'name' as name,
  item->>'description' as description,
  COALESCE((item->>'quantity')::decimal, 1) as quantity,
  (item->>'unit_price')::decimal as unit_price,
  (item->>'total')::decimal as total,
  item->>'option_tier' as option_tier,
  COALESCE((item->>'is_upsell')::boolean, false) as is_upsell,
  COALESCE((item->>'is_discount')::boolean, false) as is_discount,
  (item->>'sort_order')::integer as sort_order
FROM quotes q
CROSS JOIN LATERAL jsonb_array_elements(q.items) as item
WHERE q.items IS NOT NULL;

-- Verification
DO $$
DECLARE
  old_quotes INTEGER;
  new_quotes INTEGER;
  old_items INTEGER;
  new_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_quotes FROM quotes WHERE status IS NOT NULL;
  SELECT COUNT(*) INTO new_quotes FROM quotes_new;
  
  SELECT SUM(jsonb_array_length(items)) INTO old_items 
  FROM quotes WHERE items IS NOT NULL;
  SELECT COUNT(*) INTO new_items FROM quote_items_new;
  
  RAISE NOTICE 'Old quotes: %, New quotes: %', old_quotes, new_quotes;
  RAISE NOTICE 'Old items: %, New items: %', old_items, new_items;
  
  IF new_quotes != old_quotes THEN
    RAISE EXCEPTION 'Quote migration failed: Count mismatch';
  END IF;
  
  IF new_items != old_items THEN
    RAISE EXCEPTION 'Quote items migration failed: Count mismatch';
  END IF;
END $$;
```

### **Script 4: Migrate Jobs**

```sql
-- /supabase/migrations/029_migrate_jobs.sql

-- Migrate completed/scheduled quotes to jobs
INSERT INTO jobs_new (
  id,
  company_id,
  quote_id,
  customer_id,
  job_number,
  title,
  description,
  status,
  scheduled_start,
  actual_start,
  actual_end,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  q.company_id,
  qn.id as quote_id,
  qn.customer_id,
  COALESCE(q.job_number, 'JOB-' || q.id::text) as job_number,
  q.job_name as title,
  q.description,
  CASE 
    WHEN q.completed_at IS NOT NULL THEN 'completed'
    WHEN q.scheduled_at IS NOT NULL THEN 'scheduled'
    ELSE 'scheduled'
  END as status,
  q.scheduled_at as scheduled_start,
  q.started_at as actual_start,
  q.completed_at as actual_end,
  q.created_at,
  q.updated_at
FROM quotes q
JOIN quotes_new qn ON qn.id = q.id
WHERE q.status IN ('accepted', 'completed', 'scheduled');

-- Verification
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count 
  FROM quotes WHERE status IN ('accepted', 'completed', 'scheduled');
  SELECT COUNT(*) INTO new_count FROM jobs_new;
  
  RAISE NOTICE 'Old jobs: %, New jobs: %', old_count, new_count;
END $$;
```

### **Script 5: Migrate Invoices**

```sql
-- /supabase/migrations/030_migrate_invoices.sql

-- Migrate invoices (from quotes that have invoice_number)
INSERT INTO invoices_new (
  id,
  company_id,
  job_id,
  customer_id,
  invoice_number,
  amount_due,
  amount_paid,
  status,
  sent_at,
  paid_at,
  payment_method,
  payment_link_url,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  q.company_id,
  j.id as job_id,
  c.id as customer_id,
  q.invoice_number,
  q.total as amount_due,
  CASE WHEN q.paid_at IS NOT NULL THEN q.total ELSE 0 END as amount_paid,
  CASE 
    WHEN q.paid_at IS NOT NULL THEN 'paid'
    WHEN q.invoice_sent_at IS NOT NULL THEN 'sent'
    ELSE 'pending'
  END as status,
  q.invoice_sent_at as sent_at,
  q.paid_at,
  q.payment_method,
  q.payment_link_url,
  q.created_at,
  q.updated_at
FROM quotes q
JOIN jobs_new j ON j.quote_id = q.id
JOIN customers_new c ON 
  c.company_id = q.company_id AND
  c.phone = q.phone
WHERE q.invoice_number IS NOT NULL;

-- Migrate payments (create payment record for paid invoices)
INSERT INTO payments (
  id,
  invoice_id,
  amount,
  method,
  paid_at,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  i.id as invoice_id,
  i.amount_due as amount,
  COALESCE(i.payment_method, 'unknown') as method,
  i.paid_at,
  i.paid_at as created_at
FROM invoices_new i
WHERE i.status = 'paid';

-- Verification
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM quotes WHERE invoice_number IS NOT NULL;
  SELECT COUNT(*) INTO new_count FROM invoices_new;
  
  RAISE NOTICE 'Old invoices: %, New invoices: %', old_count, new_count;
  
  IF new_count != old_count THEN
    RAISE EXCEPTION 'Invoice migration failed: Count mismatch';
  END IF;
END $$;
```

---

## ✅ VALIDATION SCRIPTS

### **Data Integrity Checks**

```sql
-- /scripts/validate_migration.sql

-- Check 1: All customers migrated
WITH customer_check AS (
  SELECT COUNT(DISTINCT phone) as old_count 
  FROM quotes WHERE phone IS NOT NULL
),
new_check AS (
  SELECT COUNT(*) as new_count FROM customers_new
)
SELECT 
  old_count,
  new_count,
  CASE 
    WHEN new_count >= old_count THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM customer_check, new_check;

-- Check 2: All quotes migrated with items
WITH quote_check AS (
  SELECT 
    COUNT(*) as old_quotes,
    SUM(jsonb_array_length(items)) as old_items
  FROM quotes 
  WHERE status IS NOT NULL
),
new_check AS (
  SELECT 
    COUNT(*) as new_quotes,
    (SELECT COUNT(*) FROM quote_items_new) as new_items
  FROM quotes_new
)
SELECT 
  old_quotes,
  new_quotes,
  old_items,
  new_items,
  CASE 
    WHEN new_quotes = old_quotes AND new_items = old_items THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM quote_check, new_check;

-- Check 3: Totals match
WITH old_totals AS (
  SELECT SUM(total) as old_sum FROM quotes WHERE total IS NOT NULL
),
new_totals AS (
  SELECT SUM(total) as new_sum FROM quotes_new
)
SELECT 
  old_sum,
  new_sum,
  ABS(old_sum - new_sum) as difference,
  CASE 
    WHEN ABS(old_sum - new_sum) < 0.01 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM old_totals, new_totals;

-- Check 4: No orphaned records
SELECT 
  'Quotes without customers' as check_type,
  COUNT(*) as orphan_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM quotes_new q
LEFT JOIN customers_new c ON c.id = q.customer_id
WHERE c.id IS NULL

UNION ALL

SELECT 
  'Jobs without quotes' as check_type,
  COUNT(*) as orphan_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM jobs_new j
LEFT JOIN quotes_new q ON q.id = j.quote_id
WHERE q.id IS NULL

UNION ALL

SELECT 
  'Invoices without jobs' as check_type,
  COUNT(*) as orphan_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM invoices_new i
LEFT JOIN jobs_new j ON j.id = i.job_id
WHERE j.id IS NULL;

-- Check 5: All paid invoices have payment records
SELECT 
  'Paid invoices without payments' as check_type,
  COUNT(*) as missing_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM invoices_new i
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE i.status = 'paid' AND p.id IS NULL;
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### **Database Optimizations**

```sql
-- Analyze query patterns and create missing indexes
ANALYZE customers_new;
ANALYZE leads_new;
ANALYZE quotes_new;
ANALYZE quote_items_new;
ANALYZE jobs_new;
ANALYZE invoices_new;

-- Create materialized view for dashboard stats (faster queries)
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
  company_id,
  COUNT(*) FILTER (WHERE status = 'new') as pending_leads,
  COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(total) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) as monthly_revenue
FROM quotes_new
GROUP BY company_id;

CREATE UNIQUE INDEX ON dashboard_stats(company_id);

-- Refresh schedule (every hour)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Vacuum and optimize
VACUUM ANALYZE;
```

### **API Response Time Optimization**

```python
# Before: N+1 query problem
async def get_quotes():
    quotes = await db.query(Quote).all()
    for quote in quotes:
        quote.customer = await db.query(Customer).get(quote.customer_id)  # N queries
        quote.items = await db.query(QuoteItem).filter_by(quote_id=quote.id).all()  # N queries
    return quotes

# After: Eager loading (1 query)
async def get_quotes():
    quotes = await db.query(Quote)\
        .options(
            joinedload(Quote.customer),
            selectinload(Quote.items)
        )\
        .all()
    return quotes
```

### **Frontend Performance**

```tsx
// Before: Fetch all quotes on mount
useEffect(() => {
  fetch('/api/quotes').then(setQuotes);
}, []);

// After: Pagination + infinite scroll
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['quotes'],
  queryFn: ({ pageParam = 0 }) => 
    quotesApi.getAll({ limit: 20, offset: pageParam }),
  getNextPageParam: (lastPage, pages) => 
    lastPage.length === 20 ? pages.length * 20 : undefined,
});
```

---

## 🧹 CLEANUP & DEPRECATION

### **Remove Old Code**

```typescript
// Files to delete after migration complete
/src/app/(dashboard)/leads/new/page.tsx.old
/src/lib/legacy-api/*
/python-backend/main.py.backup

// Remove @ts-nocheck from all files
// Remove unused dependencies
npm uninstall unused-package
```

### **Deprecate Old Endpoints**

```python
# Mark old endpoints as deprecated
@router.post("/generate-quote")
@deprecated("Use /v2/quotes/generate instead")
async def generate_quote_legacy():
    """DEPRECATED: Use v2 API"""
    return {"error": "This endpoint is deprecated. Use /v2/quotes/generate"}
```

---

## 🚀 PRODUCTION READINESS CHECKLIST

### **Pre-Deployment**

- [ ] All migrations tested in staging
- [ ] Data validation scripts pass 100%
- [ ] Performance benchmarks met (<200ms API, <1s page load)
- [ ] Rollback plan tested
- [ ] Backup created and verified
- [ ] Monitoring configured (Sentry, DataDog, etc.)
- [ ] Load testing completed (100+ concurrent users)
- [ ] Security audit passed
- [ ] Documentation updated

### **Deployment Steps**

1. **Announce maintenance window** (if needed)
2. **Create production backup**
   ```bash
   supabase db dump -f production-backup-$(date +%Y%m%d-%H%M).sql
   ```
3. **Apply migrations**
   ```bash
   supabase db push
   ```
4. **Run validation scripts**
   ```bash
   psql $DATABASE_URL -f scripts/validate_migration.sql
   ```
5. **Deploy backend code**
   ```bash
   git push production main
   ```
6. **Deploy frontend code**
   ```bash
   vercel --prod
   ```
7. **Smoke tests**
   - Create new lead ✅
   - Generate quote ✅
   - Send quote ✅
   - Accept quote ✅
   - Create job ✅
   - Send invoice ✅
   - Mark paid ✅
8. **Monitor for errors** (24 hours)
9. **Announce completion**

### **Post-Deployment**

- [ ] Monitor error rates (target: <0.1%)
- [ ] Monitor API latency (target: p95 <200ms)
- [ ] Monitor database CPU/memory
- [ ] Check AI conversation logs
- [ ] Verify all features working
- [ ] Collect user feedback
- [ ] Update changelog

---

## 🔙 ROLLBACK PLAN

### **If Critical Issues Arise**

**Step 1: Immediate Response**
```bash
# Stop processing new requests
vercel alias set quotepro-maintenance
```

**Step 2: Restore Database**
```bash
# Restore from backup
psql $DATABASE_URL -f production-backup-YYYYMMDD-HHMM.sql
```

**Step 3: Rollback Code**
```bash
# Revert to previous version
git revert HEAD
git push production main
vercel rollback
```

**Step 4: Verify**
```bash
# Run smoke tests on old system
```

**Step 5: Communicate**
- Notify users
- Post incident report
- Plan remediation

---

## 📊 SUCCESS METRICS

- ✅ Data migration: 100% success rate
- ✅ API response time: <200ms (p95)
- ✅ Page load time: <1s (p95)
- ✅ Database query time: <50ms (p95)
- ✅ Error rate: <0.1%
- ✅ Uptime: 99.9%+
- ✅ User satisfaction: No complaints about lost data

---

## ⏱️ ESTIMATED TIME

- **Migration Scripts:** 2 days
- **Validation Scripts:** 1 day
- **Performance Optimization:** 2 days
- **Testing & QA:** 1 day
- **Production Deployment:** 1 day
- **Total:** ~1 week

---

## 🎉 COMPLETION

After Phase 5, you'll have:
- ✅ Fully normalized database schema
- ✅ Modular Python backend with RAG
- ✅ Modern frontend with TanStack Query
- ✅ AI-first architecture
- ✅ Production-ready system
- ✅ Zero technical debt

**QuotePro 2.0 complete! 🚀**

---

**Ready to proceed with Phase 5 implementation?**
