# QuotePro Database Schema (Current)

**Last Updated:** December 4, 2025  
**Status:** ✅ Production Schema (Normalized)

---

## Overview

This is the **definitive schema reference** for QuotePro. All code should reference these table names exactly.

> ⚠️ **IMPORTANT:** Old migrations (001-019) are archived. The current schema was created by migrations 020-028.

---

## Table Summary

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `companies` | Multi-tenant root | - |
| `users` | Team members | → companies |
| `customers` | Deduplicated customers | → companies |
| `customer_addresses` | Multiple addresses per customer | → customers |
| `leads` | Sales pipeline | → companies, customers, users |
| `quotes` | Quote management | → companies, leads, customers, users |
| `quote_items` | Quote line items | → quotes |
| `quote_options` | Good/Better/Best tiers | → quotes |
| `jobs` | Accepted quotes become jobs | → companies, quotes, customers |
| `invoices` | Billing | → companies, jobs, customers |
| `payments` | Payment tracking | → invoices, users |
| `catalog_items` | Product/service catalog | → companies |
| `activity_log` | Unified audit trail | → companies, users |
| `ai_conversations` | AI usage tracking | → companies, users |
| `ai_prompts` | Company-specific prompts | → companies |
| `document_embeddings` | RAG vectors (pgvector) | → companies |

---

## Entity Relationship Diagram

```
┌─────────────┐
│  companies  │ ◄── Root of multi-tenancy
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    users    │ │  customers  │ │catalog_items│ │ ai_prompts  │
└─────────────┘ └──────┬──────┘ └─────────────┘ └─────────────┘
                       │
                       ├──────────────┐
                       ▼              ▼
                ┌─────────────┐ ┌─────────────────┐
                │    leads    │ │customer_addresses│
                └──────┬──────┘ └─────────────────┘
                       │
                       ▼
                ┌─────────────┐
                │   quotes    │
                └──────┬──────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ quote_items │ │quote_options│ │    jobs     │
└─────────────┘ └─────────────┘ └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │  invoices   │
                                └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │  payments   │
                                └─────────────┘
```

---

## Table Schemas

### companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  settings JSONB DEFAULT '{"tax_rate": 8.5, "currency": "USD", "timezone": "America/Los_Angeles"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, technician, sales, accountant, member
  profile JSONB DEFAULT '{"first_name": null, "last_name": null, "phone": null, "avatar_url": null}',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_customer_phone UNIQUE(company_id, phone),
  CONSTRAINT unique_customer_email UNIQUE(company_id, email)
);
```

### customer_addresses
```sql
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT, -- home, business, rental_property
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  geocode JSONB, -- {lat, lng, formatted_address}
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'direct', -- direct, phone, website, referral, google_ads, facebook
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, quote_sent, quoted, won, lost, archived
  description TEXT,
  urgency TEXT DEFAULT 'medium', -- low, medium, high
  estimated_value DECIMAL(10,2),
  scheduled_visit_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id),
  lost_reason TEXT,
  archived_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### quotes
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  job_name TEXT,
  description TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.5,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  pdf_url TEXT,
  signed_document_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_quote_number UNIQUE(company_id, quote_number)
);
```

### quote_items
```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  option_tier TEXT, -- good, better, best
  is_upsell BOOLEAN DEFAULT false,
  is_discount BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### quote_options
```sql
CREATE TABLE quote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, -- good, better, best
  name TEXT NOT NULL,
  description TEXT,
  total DECIMAL(10,2) NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### jobs
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_job_number UNIQUE(company_id, job_number)
);
```

### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, partial, paid, overdue, cancelled
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_invoice_number UNIQUE(company_id, invoice_number)
);
```

### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- cash, check, card, transfer
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### catalog_items
```sql
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each', -- each, sqft, hour, linear_ft
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### activity_log
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL, -- lead, quote, job, invoice, customer
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- created, updated, status_changed, sent, viewed, signed
  changes JSONB, -- {field: {old: x, new: y}}
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_conversations
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  session_id TEXT,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd DECIMAL(10,6),
  context JSONB, -- {entity_type, entity_id, purpose}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_prompts
```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt_type TEXT NOT NULL, -- quote_generation, upsell, support, scheduler
  template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### document_embeddings
```sql
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- catalog, quote, knowledge_base
  source_id UUID,
  content TEXT NOT NULL,
  embedding vector(768), -- Gemini embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Indexes

Key indexes for performance:
- `idx_leads_company_status` ON leads(company_id, status)
- `idx_quotes_company_status` ON quotes(company_id, status)
- `idx_jobs_company_status` ON jobs(company_id, status)
- `idx_invoices_company_status` ON invoices(company_id, status)
- `idx_activity_log_entity` ON activity_log(entity_type, entity_id)
- `idx_document_embeddings_company` ON document_embeddings(company_id)

---

## RLS Policies

All tables have Row Level Security enabled. Policies ensure users can only access data from their own company:

```sql
-- Example pattern for all tables:
CREATE POLICY table_select_policy ON table_name
  FOR SELECT
  USING (company_id = public.get_user_company_id());
```

---

## Migration History

| Migration | Purpose | Status |
|-----------|---------|--------|
| 020 | Enable pgvector | ✅ Applied |
| 021 | Create normalized schema | ✅ Applied (tables renamed) |
| 022 | Create indexes | ✅ Applied |
| 023 | Create RLS policies | ✅ Applied |
| 024 | Create views | ✅ Applied |
| 025 | Seed data | ✅ Applied |
| 026 | Vector search function | ✅ Applied |
| 027 | Add job types | ✅ Applied |
| 028 | Fix RLS for renamed tables | ✅ Applied |

> Old migrations (001-019) are archived in `_archived_old_schema/`

---

## Code Reference

When writing queries, always use these exact table names:

```typescript
// ✅ CORRECT
supabase.from('quotes').select('*')
supabase.from('leads').select('*')
supabase.from('customers').select('*')

// ❌ WRONG (old schema)
supabase.from('quotes_new').select('*')
supabase.from('leads_new').select('*')
```
