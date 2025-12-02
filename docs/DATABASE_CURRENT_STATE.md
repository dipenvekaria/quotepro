# DATABASE CURRENT STATE - December 2025

## ✅ ACTIVE SCHEMA (In Use by App)

These are the **ONLY** tables currently used by the application:

### Core Tables
1. **companies** - Multi-tenant company data
2. **quotes** - Combined leads + quotes table
3. **quote_items** - Line items for quotes
4. **quote_audit_log** - Audit trail for changes
5. **pricing_items** - Product/service catalog (optional)
6. **profiles** - User profiles (if exists)

### Status
- ✅ App uses these tables
- ✅ All queries reference these tables
- ✅ RLS policies active
- ✅ Working in production

---

## ❌ REFACTOR TABLES (Created but NOT in use)

These tables were created as part of a 5-phase refactor plan but **never migrated to**:

### Migrations 021-025 Created These (with `_new` suffix):
1. companies_new
2. users_new
3. customers_new
4. customer_addresses
5. leads_new
6. quotes_new
7. quote_items_new
8. quote_options
9. jobs_new
10. invoices_new
11. payments
12. catalog_items
13. ai_conversations
14. document_embeddings
15. activity_log
16. ai_prompts

### Status
- ❌ App does NOT use these
- ❌ No queries reference them
- ❌ Empty (no data)
- ❌ Confusing presence in schema
- **SAFE TO DROP**

---

## 🎯 CURRENT SCHEMA DESIGN

The app currently uses a **simplified schema** where:

```
companies (1) ──→ (N) quotes
              └──→ (N) pricing_items
              
quotes (1) ──→ (N) quote_items
           └──→ (N) quote_audit_log

quotes.lead_status tracks: new, contacted, quote_visit_scheduled, quoted, sent, accepted, signed
quotes.status tracks: draft, sent, signed, rejected
```

### Key Design Decisions

**Why `quotes` table handles both leads and quotes:**
- Simpler architecture
- No data duplication
- Easy lifecycle tracking (lead → quote → job)
- `lead_status` column differentiates stages
- `total = 0` indicates it's still a lead

**Why we're NOT using the refactored schema:**
- Refactor was planned but never executed
- App works fine with current schema
- Refactor tables are empty/unused
- Adds unnecessary complexity
- Not needed for current scale

---

## 📋 RECOMMENDED ACTION

**Drop all `_new` tables and refactor infrastructure:**

```sql
-- Safe to drop (unused):
DROP TABLE IF EXISTS companies_new CASCADE;
DROP TABLE IF EXISTS users_new CASCADE;
DROP TABLE IF EXISTS customers_new CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS leads_new CASCADE;
DROP TABLE IF EXISTS quotes_new CASCADE;
DROP TABLE IF EXISTS quote_items_new CASCADE;
DROP TABLE IF EXISTS quote_options CASCADE;
DROP TABLE IF EXISTS jobs_new CASCADE;
DROP TABLE IF EXISTS invoices_new CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS ai_prompts CASCADE;

-- Drop helper functions if created
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

---

## 🔍 VERIFICATION

After cleanup, you should have ONLY these tables:

```sql
-- List all tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Expected result:
-- companies
-- pricing_items
-- quote_audit_log
-- quote_items
-- quotes
-- (possibly: profiles, signed_documents)
```

---

## 📊 CURRENT COLUMNS IN USE

### quotes table (main work items table)
- id, company_id, quote_number
- customer_name, customer_email, customer_phone, customer_address
- description, job_type, job_name
- subtotal, tax_rate, tax_amount, total
- status, lead_status
- photos (JSON), notes
- pdf_url, pdf_generated_at
- sent_at, accepted_at, signed_at
- scheduled_at, completed_at
- archived_at, archived_reason
- created_at, updated_at

### quote_items table
- id, quote_id
- name, description
- quantity, unit_price, total
- option_tier (good/better/best)
- is_upsell, is_discount
- sort_order
- created_at

### quote_audit_log table
- id, quote_id
- action_type (lead_created, lead_updated, ai_generation, etc.)
- description
- changes_made (JSON)
- created_by, created_at

### companies table
- id, user_id
- name, logo_url, phone, email, address
- tax_rate
- created_at, updated_at

---

## 🚀 NEXT STEPS

1. **Run cleanup script** to drop unused refactor tables
2. **Update documentation** to reflect actual schema
3. **Remove refactor docs** (REFACTOR_PHASE_*.md) to avoid confusion
4. **Focus on current schema** - it's working well
5. **If future refactor needed** - plan it fresh without `_new` suffix confusion
