# Migration to New Schema - Complete Plan

## 🎯 Objective

Migrate QuotePro from old monolithic schema to new normalized `_new` tables.

---

## 📊 OLD vs NEW Schema Comparison

### OLD Schema (Current - TO BE DROPPED)
```
companies (1) ──→ (N) quotes
              └──→ (N) pricing_items

quotes (mixed leads + quotes + jobs)
  ├── lead_status (new, contacted, scheduled, quoted, sent, accepted, signed)
  ├── status (draft, sent, signed, rejected)
  └── Combined lead/quote/job data in ONE table
```

### NEW Schema (Target - USE THIS)
```
companies (1) ──→ (N) users
              ├──→ (N) customers
              ├──→ (N) leads
              ├──→ (N) quotes
              ├──→ (N) jobs
              ├──→ (N) invoices
              ├──→ (N) catalog_items
              └──→ (N) ai_conversations

customers (1) ──→ (N) customer_addresses
              ├──→ (N) leads
              ├──→ (N) quotes
              ├──→ (N) jobs
              └──→ (N) invoices

leads (1) ──→ (N) quotes
quotes (1) ──→ (1) jobs
jobs (1) ──→ (1) invoices
invoices (1) ──→ (N) payments

quotes (1) ──→ (N) quote_items
           └──→ (N) quote_options

activity_log (polymorphic audit trail for ALL entities)
```

---

## 📋 Key Differences

### 1. **Customer Separation**
- **OLD**: Customer data embedded in `quotes` table
- **NEW**: Dedicated `customers` table with `customer_addresses`
- **Why**: Deduplication, multiple addresses, customer history

### 2. **Lead → Quote → Job Workflow**
- **OLD**: All in `quotes` table (differentiated by `lead_status`)
- **NEW**: Separate `leads`, `quotes`, `jobs` tables
- **Why**: Clear lifecycle, proper relationships, easier queries

### 3. **Audit Trail**
- **OLD**: `quote_audit_log` table
- **NEW**: `activity_log` table (polymorphic - handles ALL entities)
- **Why**: Unified audit trail across leads, quotes, jobs, customers

### 4. **Catalog**
- **OLD**: `pricing_items` table
- **NEW**: `catalog_items` table with richer metadata
- **Why**: Better AI integration, tags, labor hours, material costs

### 5. **AI Tracking**
- **OLD**: No tracking
- **NEW**: `ai_conversations` table
- **Why**: Cost tracking, model usage, compliance

---

## 🗂️ New Table Reference

### Core Tables
1. **companies** - Multi-tenant root (settings as JSONB)
2. **users** - Team members with roles
3. **customers** - Deduplicated customers
4. **customer_addresses** - Multiple addresses per customer

### Workflow Tables
5. **leads** - Sales pipeline (status: new → contacted → qualified → quote_sent)
6. **quotes** - Formal quotes (status: draft → sent → viewed → accepted)
7. **jobs** - Accepted quotes (status: scheduled → in_progress → completed)
8. **invoices** - Billing (status: pending → sent → paid)
9. **payments** - Payment records

### Supporting Tables
10. **quote_items** - Line items (normalized)
11. **quote_options** - Good/Better/Best bundles
12. **catalog_items** - Product/service catalog
13. **activity_log** - Unified audit trail
14. **ai_conversations** - AI usage tracking
15. **document_embeddings** - RAG vectors (pgvector)
16. **ai_prompts** - Company-specific prompts

---

## 🔄 Migration Steps

### Phase 1: Database Migration (5 min)
```bash
# Run migration script
psql $DATABASE_URL -f scripts/migrate-to-new-schema.sql
```

This will:
1. Drop ALL old tables (companies, quotes, quote_items, quote_audit_log, pricing_items)
2. Rename ALL `_new` tables (remove suffix)
3. Verify new structure

### Phase 2: Code Updates (2-4 hours)

#### Update ALL Supabase queries:

**BEFORE (old schema):**
```typescript
// OLD: quotes table handled everything
const { data } = await supabase
  .from('quotes')
  .select('*')
  .eq('lead_status', 'new')
```

**AFTER (new schema):**
```typescript
// NEW: Proper entity separation
const { data: leads } = await supabase
  .from('leads')
  .select(`
    *,
    customer:customers(*),
    quotes(*)
  `)
  .eq('status', 'new')
```

#### Key Mapping:

| OLD Table | NEW Table(s) | Notes |
|-----------|--------------|-------|
| `quotes` (lead_status='new') | `leads` | Leads before quote |
| `quotes` (total > 0) | `leads` + `quotes` | Quote created |
| `quotes` (accepted_at) | `quotes` + `jobs` | Accepted quote becomes job |
| `quote_items` | `quote_items` | Same structure |
| `quote_audit_log` | `activity_log` | Polymorphic |
| `pricing_items` | `catalog_items` | Enhanced |
| `companies` | `companies` + `users` | Separated |

### Phase 3: Feature Mapping

#### Creating a Lead
```typescript
// 1. Create or find customer
const { data: customer } = await supabase
  .from('customers')
  .upsert({
    company_id,
    name: customerName,
    phone: customerPhone,
    email: customerEmail
  })
  .select()
  .single()

// 2. Create lead
const { data: lead } = await supabase
  .from('leads')
  .insert({
    company_id,
    customer_id: customer.id,
    description,
    status: 'new',
    source: 'direct'
  })
  .select()
  .single()

// 3. Log activity
await supabase.from('activity_log').insert({
  company_id,
  user_id,
  entity_type: 'lead',
  entity_id: lead.id,
  action: 'created',
  description: `New lead created: ${customerName}`
})
```

#### Converting Lead to Quote
```typescript
// 1. Create quote from lead
const { data: quote } = await supabase
  .from('quotes')
  .insert({
    company_id,
    lead_id: leadId,
    customer_id: lead.customer_id,
    quote_number: generateQuoteNumber(),
    job_name,
    description,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    status: 'draft'
  })
  .select()
  .single()

// 2. Insert quote items
await supabase.from('quote_items').insert(
  items.map(item => ({
    quote_id: quote.id,
    ...item
  }))
)

// 3. Update lead status
await supabase
  .from('leads')
  .update({ status: 'quoted' })
  .eq('id', leadId)

// 4. Log activity
await supabase.from('activity_log').insert({
  company_id,
  entity_type: 'quote',
  entity_id: quote.id,
  action: 'created',
  description: `Quote generated from lead`
})
```

#### Accepting Quote → Creating Job
```typescript
// 1. Update quote
await supabase
  .from('quotes')
  .update({
    status: 'accepted',
    accepted_at: new Date()
  })
  .eq('id', quoteId)

// 2. Create job
const { data: job } = await supabase
  .from('jobs')
  .insert({
    company_id,
    quote_id: quoteId,
    customer_id: quote.customer_id,
    job_number: generateJobNumber(),
    title: quote.job_name,
    description: quote.description,
    status: 'scheduled',
    scheduled_start: scheduledDate
  })
  .select()
  .single()

// 3. Update lead
await supabase
  .from('leads')
  .update({ status: 'won' })
  .eq('id', quote.lead_id)
```

---

## 🚨 Breaking Changes

### 1. Query Changes
- `quotes` table no longer has ALL data
- Must JOIN `customers`, `leads`, `jobs`
- `lead_status` column removed (use `leads.status`)

### 2. Status Values Changed
**Leads:**
- OLD: `new`, `contacted`, `quote_visit_scheduled`, `quoted`, `sent`, `accepted`
- NEW: `new`, `contacted`, `qualified`, `quote_sent`, `quoted`, `won`, `lost`

**Quotes:**
- OLD: `draft`, `sent`, `signed`, `rejected`
- NEW: `draft`, `sent`, `viewed`, `accepted`, `rejected`, `expired`

### 3. Customer Data
- No longer embedded in quotes
- Must create `customer` first, then link

---

## ✅ Verification Checklist

After migration:

### Database
- [ ] All `_new` tables renamed
- [ ] All old tables dropped
- [ ] RLS policies active
- [ ] Indexes created
- [ ] Foreign keys enforced

### Application
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can create lead
- [ ] Can convert lead to quote
- [ ] Can accept quote (create job)
- [ ] Audit trail logs activities
- [ ] No TypeScript errors

### Testing
- [ ] Create new lead from scratch
- [ ] Upload customer info
- [ ] Generate quote with AI
- [ ] Accept quote
- [ ] Complete job
- [ ] Generate invoice

---

## 🔧 Code Files to Update

### High Priority (Must Update)
1. `src/app/(dashboard)/leads/new/page.tsx` - Lead/quote creation
2. `src/app/(dashboard)/leads-and-quotes/leads/page.tsx` - Leads list
3. `src/app/(dashboard)/leads-and-quotes/quotes/page.tsx` - Quotes list
4. `src/app/(dashboard)/layout.tsx` - Dashboard data loading
5. `src/lib/dashboard-context.tsx` - Data fetching
6. `src/components/leads-and-quotes.tsx` - Display component

### Medium Priority
7. All hooks in `src/hooks/` (useQuotes, useLeads, useJobs)
8. API routes in `src/app/api/`
9. Webhook handlers

### Low Priority
10. Analytics pages
11. Settings page
12. PDF generation

---

## 📝 Next Steps

1. **Backup current database** (Supabase dashboard → SQL Editor → export)
2. **Run migration script** (`scripts/migrate-to-new-schema.sql`)
3. **Update code** (start with lead creation page)
4. **Test thoroughly** (create lead → quote → job → invoice)
5. **Deploy**

---

## 🆘 Rollback Plan

If migration fails:
```sql
-- Restore from Supabase backup
-- OR manually recreate old schema from migration 001
```

**Recommendation**: Test migration on dev/staging first!
