# PHASE 1: DATABASE SCHEMA REDESIGN - TECH SPEC

**Status:** 📋 Planning  
**Duration:** 2 weeks  
**Risk Level:** 🟢 LOW (Additive only, no breaking changes)  
**Rollback Difficulty:** ⭐ EASY (Drop new tables)

---

## 📋 OBJECTIVE

Redesign database schema to separate concerns (customers, leads, quotes, jobs, invoices) and prepare for AI-first features (RAG, embeddings, agent conversations).

**Key Goals:**
1. Create normalized schema with proper entity separation
2. Add pgvector extension for RAG/semantic search
3. Prepare infrastructure for AI conversation tracking
4. Maintain 100% backward compatibility with existing `quotes` table

---

## 🎯 SUCCESS CRITERIA

- ✅ New tables created without affecting existing data
- ✅ pgvector extension installed and working
- ✅ All indexes and RLS policies in place
- ✅ Seed data successfully inserted
- ✅ Existing app continues functioning normally
- ✅ Migration scripts are reversible

---

## 📁 FILES TO CREATE

### 1. Migration Files

```
/supabase/migrations/
├── 020_enable_pgvector.sql           # Enable vector extension
├── 021_create_new_schema.sql         # Core tables
├── 022_create_indexes.sql            # Performance indexes
├── 023_create_rls_policies.sql       # Row-level security
├── 024_create_views.sql              # Convenience views
└── 025_seed_data.sql                 # Test data
```

### 2. Documentation

```
/docs/
├── DATABASE_MIGRATION_GUIDE.md       # How to apply migrations
├── NEW_SCHEMA_REFERENCE.md           # Table descriptions
└── DATA_MIGRATION_PLAN.md            # Old → New data migration strategy
```

### 3. Type Definitions (Generated)

```
/src/types/
└── database.new.ts                   # Generated from new schema
```

---

## 🗄️ NEW DATABASE SCHEMA

### **Core Tables Overview**

```
companies (1) ──→ (N) users
companies (1) ──→ (N) customers
companies (1) ──→ (N) leads
companies (1) ──→ (N) quotes
companies (1) ──→ (N) jobs
companies (1) ──→ (N) invoices
companies (1) ──→ (N) catalog_items

customers (1) ──→ (N) customer_addresses
customers (1) ──→ (N) leads
customers (1) ──→ (N) quotes
customers (1) ──→ (N) jobs
customers (1) ──→ (N) invoices

leads (1) ──→ (N) quotes
quotes (1) ──→ (1) jobs
jobs (1) ──→ (1) invoices
invoices (1) ──→ (N) payments

quotes (1) ──→ (N) quote_items
quotes (1) ──→ (N) quote_options

companies (1) ──→ (N) ai_conversations
companies (1) ──→ (N) document_embeddings
companies (1) ──→ (N) ai_prompts

(*) ──→ (N) activity_log (polymorphic)
```

---

## 📄 DETAILED TABLE DEFINITIONS

### **020_enable_pgvector.sql**

```sql
-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### **021_create_new_schema.sql**

```sql
-- ============================================
-- COMPANIES (Multi-tenant root)
-- ============================================
CREATE TABLE companies_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  
  -- Settings stored as JSON for flexibility
  settings JSONB DEFAULT jsonb_build_object(
    'tax_rate', 8.5,
    'currency', 'USD',
    'timezone', 'America/Los_Angeles',
    'ai_preferences', jsonb_build_object(
      'default_model', 'gemini-2.0-flash',
      'temperature', 0.1,
      'max_tokens', 2000
    )
  ),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USERS (Team members)
-- ============================================
CREATE TABLE users_new (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL DEFAULT 'member',
  -- owner, admin, technician, sales, accountant
  
  profile JSONB DEFAULT jsonb_build_object(
    'first_name', null,
    'last_name', null,
    'phone', null,
    'avatar_url', null
  ),
  
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'technician', 'sales', 'accountant', 'member'))
);

-- ============================================
-- CUSTOMERS (Separate from leads/quotes)
-- ============================================
CREATE TABLE customers_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Metadata for custom fields, tags, etc.
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate customers
  UNIQUE(company_id, phone),
  UNIQUE(company_id, email)
);

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CUSTOMER ADDRESSES (Multiple per customer)
-- ============================================
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  label TEXT, -- home, business, rental_property
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  
  -- Geocoding for map features
  geocode JSONB, -- {lat: 37.7749, lng: -122.4194, formatted_address: "..."}
  
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADS (Before quote is created)
-- ============================================
CREATE TABLE leads_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  source TEXT DEFAULT 'direct', 
  -- direct, phone, website, referral, google_ads, facebook, other
  
  status TEXT NOT NULL DEFAULT 'new',
  -- new, contacted, qualified, quote_sent, quoted, won, lost, archived
  
  description TEXT,
  urgency TEXT DEFAULT 'medium', -- low, medium, high
  estimated_value DECIMAL(10,2),
  
  scheduled_visit_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users_new(id),
  
  lost_reason TEXT,
  archived_reason TEXT,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_lead_status CHECK (status IN (
    'new', 'contacted', 'qualified', 'quote_sent', 'quoted', 'won', 'lost', 'archived'
  )),
  CONSTRAINT valid_urgency CHECK (urgency IN ('low', 'medium', 'high'))
);

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- QUOTES (Linked to leads)
-- ============================================
CREATE TABLE quotes_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads_new(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  quote_number TEXT NOT NULL,
  
  -- Quote content
  job_name TEXT,
  description TEXT,
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.5,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  notes TEXT,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft, sent, viewed, accepted, rejected, expired
  
  -- Tracking timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Documents
  pdf_url TEXT,
  signed_document_url TEXT,
  
  -- Metadata
  created_by UUID REFERENCES users_new(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, quote_number),
  CONSTRAINT valid_quote_status CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  ))
);

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- QUOTE LINE ITEMS
-- ============================================
CREATE TABLE quote_items_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes_new(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  -- Optional categorization
  option_tier TEXT, -- good, better, best
  is_upsell BOOLEAN DEFAULT false,
  is_discount BOOLEAN DEFAULT false,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUOTE OPTIONS (Good/Better/Best bundles)
-- ============================================
CREATE TABLE quote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes_new(id) ON DELETE CASCADE,
  
  tier TEXT NOT NULL, -- good, better, best
  name TEXT NOT NULL,
  description TEXT,
  total DECIMAL(10,2) NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_tier CHECK (tier IN ('good', 'better', 'best'))
);

-- ============================================
-- JOBS (Accepted quotes)
-- ============================================
CREATE TABLE jobs_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes_new(id),
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  job_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  status TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled, in_progress, completed, cancelled
  
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Team assignment (array of user IDs)
  assigned_to UUID[] DEFAULT '{}',
  
  -- Completion data
  completion_notes TEXT,
  customer_signature JSONB, -- {signature_data, signed_at, signed_by}
  photos JSONB DEFAULT '[]', -- [{url, caption, uploaded_at}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, job_number),
  CONSTRAINT valid_job_status CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'cancelled'
  ))
);

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INVOICES (Generated from jobs)
-- ============================================
CREATE TABLE invoices_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs_new(id),
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  invoice_number TEXT NOT NULL,
  
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, sent, partial, paid, overdue, cancelled
  
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  payment_method TEXT, -- cash, check, card, bank_transfer, demo
  payment_link_url TEXT,
  
  pdf_url TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, invoice_number),
  CONSTRAINT valid_invoice_status CHECK (status IN (
    'pending', 'sent', 'partial', 'paid', 'overdue', 'cancelled'
  ))
);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PAYMENTS (Multiple per invoice)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices_new(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL, -- cash, check, card, bank_transfer
  reference_number TEXT,
  notes TEXT,
  
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users_new(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATALOG ITEMS (Service/Product catalog)
-- ============================================
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  
  base_price DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each', -- each, hour, sqft, lf
  
  is_active BOOLEAN DEFAULT true,
  
  -- AI metadata
  tags TEXT[] DEFAULT '{}',
  typical_quantity DECIMAL(10,2),
  labor_hours DECIMAL(5,2),
  material_cost DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER catalog_items_updated_at BEFORE UPDATE ON catalog_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AI CONVERSATIONS (Track all AI interactions)
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_new(id) ON DELETE SET NULL,
  
  entity_type TEXT NOT NULL, -- quote, lead, invoice, customer
  entity_id UUID NOT NULL,
  
  model TEXT NOT NULL, -- gemini-2.0-flash, gpt-4
  purpose TEXT NOT NULL, -- quote_generation, customer_query, job_scheduling
  
  messages JSONB NOT NULL, -- [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENT EMBEDDINGS (RAG infrastructure)
-- ============================================
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- catalog, quote, policy, procedure, faq
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Vector embedding for semantic search (1536 dimensions for OpenAI/Gemini)
  embedding VECTOR(1536),
  
  metadata JSONB DEFAULT '{}', -- {tags, category, author, source_url}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER document_embeddings_updated_at BEFORE UPDATE ON document_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ACTIVITY LOG (Unified audit trail)
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_new(id) ON DELETE SET NULL,
  
  entity_type TEXT NOT NULL, -- lead, quote, job, invoice, customer
  entity_id UUID NOT NULL,
  
  action TEXT NOT NULL, -- created, updated, sent, accepted, completed
  description TEXT,
  
  -- Before/after changes
  changes JSONB,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI PROMPTS (Company-specific customization)
-- ============================================
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies_new(id) ON DELETE CASCADE,
  
  prompt_type TEXT NOT NULL, -- quote_generation, job_name, email_draft
  name TEXT NOT NULL,
  system_prompt TEXT,
  user_template TEXT, -- With {{variable}} placeholders
  
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, prompt_type, name)
);

CREATE TRIGGER ai_prompts_updated_at BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **022_create_indexes.sql**

```sql
-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Companies
CREATE INDEX idx_companies_new_created ON companies_new(created_at DESC);

-- Users
CREATE INDEX idx_users_new_company ON users_new(company_id);
CREATE INDEX idx_users_new_role ON users_new(role);

-- Customers
CREATE INDEX idx_customers_new_company ON customers_new(company_id);
CREATE INDEX idx_customers_new_phone ON customers_new(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_new_email ON customers_new(email) WHERE email IS NOT NULL;

-- Customer Addresses
CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_primary ON customer_addresses(customer_id, is_primary);

-- Leads
CREATE INDEX idx_leads_new_company_status ON leads_new(company_id, status);
CREATE INDEX idx_leads_new_customer ON leads_new(customer_id);
CREATE INDEX idx_leads_new_assigned ON leads_new(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_new_scheduled ON leads_new(scheduled_visit_at) WHERE scheduled_visit_at IS NOT NULL;

-- Quotes
CREATE INDEX idx_quotes_new_company_status ON quotes_new(company_id, status);
CREATE INDEX idx_quotes_new_customer ON quotes_new(customer_id);
CREATE INDEX idx_quotes_new_lead ON quotes_new(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_quotes_new_created ON quotes_new(created_at DESC);
CREATE INDEX idx_quotes_new_sent ON quotes_new(sent_at) WHERE sent_at IS NOT NULL;

-- Quote Items
CREATE INDEX idx_quote_items_new_quote ON quote_items_new(quote_id);
CREATE INDEX idx_quote_items_new_order ON quote_items_new(quote_id, sort_order);

-- Quote Options
CREATE INDEX idx_quote_options_quote ON quote_options(quote_id);
CREATE INDEX idx_quote_options_selected ON quote_options(quote_id, is_selected);

-- Jobs
CREATE INDEX idx_jobs_new_company_status ON jobs_new(company_id, status);
CREATE INDEX idx_jobs_new_customer ON jobs_new(customer_id);
CREATE INDEX idx_jobs_new_quote ON jobs_new(quote_id);
CREATE INDEX idx_jobs_new_scheduled_start ON jobs_new(scheduled_start) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_jobs_new_assigned ON jobs_new USING GIN(assigned_to);

-- Invoices
CREATE INDEX idx_invoices_new_company_status ON invoices_new(company_id, status);
CREATE INDEX idx_invoices_new_customer ON invoices_new(customer_id);
CREATE INDEX idx_invoices_new_job ON invoices_new(job_id);
CREATE INDEX idx_invoices_new_due_date ON invoices_new(due_date) WHERE status IN ('pending', 'sent', 'partial');
CREATE INDEX idx_invoices_new_created ON invoices_new(created_at DESC);

-- Payments
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(paid_at DESC);

-- Catalog Items
CREATE INDEX idx_catalog_items_company ON catalog_items(company_id);
CREATE INDEX idx_catalog_items_active ON catalog_items(company_id, is_active);
CREATE INDEX idx_catalog_items_category ON catalog_items(category);
CREATE INDEX idx_catalog_items_tags ON catalog_items USING GIN(tags);

-- AI Conversations
CREATE INDEX idx_ai_conversations_company ON ai_conversations(company_id);
CREATE INDEX idx_ai_conversations_entity ON ai_conversations(entity_type, entity_id);
CREATE INDEX idx_ai_conversations_created ON ai_conversations(created_at DESC);

-- Document Embeddings (Vector similarity search)
CREATE INDEX idx_document_embeddings_company ON document_embeddings(company_id);
CREATE INDEX idx_document_embeddings_type ON document_embeddings(document_type);
CREATE INDEX idx_document_embeddings_vector ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Activity Log
CREATE INDEX idx_activity_log_company ON activity_log(company_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_company_created ON activity_log(company_id, created_at DESC);

-- AI Prompts
CREATE INDEX idx_ai_prompts_company ON ai_prompts(company_id);
CREATE INDEX idx_ai_prompts_type ON ai_prompts(prompt_type);
CREATE INDEX idx_ai_prompts_active ON ai_prompts(company_id, is_active);
```

### **023_create_rls_policies.sql**

```sql
-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users_new WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Companies: Users can only access their own company
CREATE POLICY "Users access own company" ON companies_new
  FOR ALL USING (id = auth.user_company_id());

-- Users: Can view team members in same company
CREATE POLICY "Users view team members" ON users_new
  FOR SELECT USING (company_id = auth.user_company_id());

-- Customers: Company-scoped access
CREATE POLICY "Company members access customers" ON customers_new
  FOR ALL USING (company_id = auth.user_company_id());

CREATE POLICY "Company members access customer addresses" ON customer_addresses
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM customers_new WHERE company_id = auth.user_company_id()
    )
  );

-- Leads: Company-scoped access
CREATE POLICY "Company members access leads" ON leads_new
  FOR ALL USING (company_id = auth.user_company_id());

-- Quotes: Company-scoped access
CREATE POLICY "Company members access quotes" ON quotes_new
  FOR ALL USING (company_id = auth.user_company_id());

CREATE POLICY "Company members access quote items" ON quote_items_new
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes_new WHERE company_id = auth.user_company_id()
    )
  );

CREATE POLICY "Company members access quote options" ON quote_options
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes_new WHERE company_id = auth.user_company_id()
    )
  );

-- Jobs: Company-scoped access
CREATE POLICY "Company members access jobs" ON jobs_new
  FOR ALL USING (company_id = auth.user_company_id());

-- Invoices: Company-scoped access
CREATE POLICY "Company members access invoices" ON invoices_new
  FOR ALL USING (company_id = auth.user_company_id());

CREATE POLICY "Company members access payments" ON payments
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices_new WHERE company_id = auth.user_company_id()
    )
  );

-- Catalog: Company-scoped access
CREATE POLICY "Company members access catalog" ON catalog_items
  FOR ALL USING (company_id = auth.user_company_id());

-- AI Conversations: Company-scoped access
CREATE POLICY "Company members access AI conversations" ON ai_conversations
  FOR ALL USING (company_id = auth.user_company_id());

-- Document Embeddings: Company-scoped access
CREATE POLICY "Company members access embeddings" ON document_embeddings
  FOR ALL USING (company_id = auth.user_company_id());

-- Activity Log: Company-scoped access
CREATE POLICY "Company members access activity log" ON activity_log
  FOR ALL USING (company_id = auth.user_company_id());

-- AI Prompts: Company-scoped access (NULL company_id = global defaults)
CREATE POLICY "Company members access prompts" ON ai_prompts
  FOR SELECT USING (
    company_id IS NULL OR company_id = auth.user_company_id()
  );

CREATE POLICY "Company members manage own prompts" ON ai_prompts
  FOR ALL USING (company_id = auth.user_company_id());
```

### **024_create_views.sql**

```sql
-- ============================================
-- CONVENIENCE VIEWS
-- ============================================

-- Quote Details (with items and customer info)
CREATE VIEW quote_details AS
SELECT 
  q.*,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  COUNT(qi.id) as item_count,
  COALESCE(json_agg(
    json_build_object(
      'id', qi.id,
      'name', qi.name,
      'description', qi.description,
      'quantity', qi.quantity,
      'unit_price', qi.unit_price,
      'total', qi.total,
      'option_tier', qi.option_tier,
      'is_upsell', qi.is_upsell,
      'is_discount', qi.is_discount
    ) ORDER BY qi.sort_order
  ) FILTER (WHERE qi.id IS NOT NULL), '[]') as items
FROM quotes_new q
LEFT JOIN customers_new c ON c.id = q.customer_id
LEFT JOIN quote_items_new qi ON qi.quote_id = q.id
GROUP BY q.id, c.name, c.email, c.phone;

-- Job Schedule (with customer and job details)
CREATE VIEW job_schedule AS
SELECT 
  j.*,
  c.name as customer_name,
  c.phone as customer_phone,
  ca.address as job_address,
  q.job_name,
  q.total as job_value
FROM jobs_new j
JOIN customers_new c ON c.id = j.customer_id
LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_primary = true
LEFT JOIN quotes_new q ON q.id = j.quote_id
WHERE j.status IN ('scheduled', 'in_progress');

-- Invoice Summary (with customer and payment info)
CREATE VIEW invoice_summary AS
SELECT 
  i.*,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  j.job_number,
  j.title as job_title,
  COALESCE(SUM(p.amount), 0) as total_paid,
  i.amount_due - COALESCE(SUM(p.amount), 0) as balance_remaining
FROM invoices_new i
JOIN customers_new c ON c.id = i.customer_id
LEFT JOIN jobs_new j ON j.id = i.job_id
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, c.name, c.email, c.phone, j.job_number, j.title;

-- Lead Pipeline (with customer info and quote status)
CREATE VIEW lead_pipeline AS
SELECT 
  l.*,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  COUNT(DISTINCT q.id) as quote_count,
  MAX(q.created_at) as last_quote_date,
  SUM(CASE WHEN q.status = 'accepted' THEN q.total ELSE 0 END) as accepted_value
FROM leads_new l
JOIN customers_new c ON c.id = l.customer_id
LEFT JOIN quotes_new q ON q.lead_id = l.id
GROUP BY l.id, c.name, c.email, c.phone;
```

### **025_seed_data.sql**

```sql
-- ============================================
-- SEED DATA FOR TESTING
-- ============================================

-- Insert test company (use your existing company if migrating)
INSERT INTO companies_new (id, name, email, phone, settings)
VALUES (
  gen_random_uuid(),
  'Test Company',
  'test@quotepro.com',
  '555-0100',
  jsonb_build_object(
    'tax_rate', 8.5,
    'currency', 'USD',
    'timezone', 'America/Los_Angeles'
  )
) RETURNING id;

-- Note: In production, you'll migrate existing company data
-- See DATA_MIGRATION_PLAN.md for details
```

---

## 🔄 MIGRATION EXECUTION PLAN

### **Step 1: Backup Current Database**
```bash
# Create backup before any changes
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### **Step 2: Apply Migrations in Order**
```bash
# Run migrations sequentially
psql $DATABASE_URL -f supabase/migrations/020_enable_pgvector.sql
psql $DATABASE_URL -f supabase/migrations/021_create_new_schema.sql
psql $DATABASE_URL -f supabase/migrations/022_create_indexes.sql
psql $DATABASE_URL -f supabase/migrations/023_create_rls_policies.sql
psql $DATABASE_URL -f supabase/migrations/024_create_views.sql
psql $DATABASE_URL -f supabase/migrations/025_seed_data.sql
```

### **Step 3: Verify Installation**
```sql
-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_new'
ORDER BY table_name;

-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename LIKE '%_new' 
ORDER BY indexname;

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename LIKE '%_new';
```

### **Step 4: Generate TypeScript Types**
```bash
# Generate types from new schema
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.new.ts
```

---

## ✅ TESTING CHECKLIST

### **Database Tests**
- [ ] All migrations run without errors
- [ ] pgvector extension enabled
- [ ] All tables created with correct columns
- [ ] All indexes created
- [ ] All RLS policies active
- [ ] Views return expected data
- [ ] Triggers fire on updates

### **Data Integrity Tests**
- [ ] Can insert into companies_new
- [ ] Can insert into customers_new
- [ ] Can insert into leads_new
- [ ] Can insert into quotes_new with items
- [ ] Can create jobs from quotes
- [ ] Can create invoices from jobs
- [ ] Foreign key constraints work
- [ ] Unique constraints prevent duplicates

### **Performance Tests**
- [ ] Queries with indexes are fast (<100ms)
- [ ] Vector similarity search works
- [ ] RLS doesn't slow queries significantly

### **Security Tests**
- [ ] RLS policies block cross-company access
- [ ] Users can only see own company data
- [ ] Unauthenticated requests blocked

---

## 🔙 ROLLBACK PLAN

### **If Issues Arise**

```sql
-- Drop all new tables in reverse order
DROP VIEW IF EXISTS lead_pipeline CASCADE;
DROP VIEW IF EXISTS invoice_summary CASCADE;
DROP VIEW IF EXISTS job_schedule CASCADE;
DROP VIEW IF EXISTS quote_details CASCADE;

DROP TABLE IF EXISTS ai_prompts CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices_new CASCADE;
DROP TABLE IF EXISTS jobs_new CASCADE;
DROP TABLE IF EXISTS quote_options CASCADE;
DROP TABLE IF EXISTS quote_items_new CASCADE;
DROP TABLE IF EXISTS quotes_new CASCADE;
DROP TABLE IF EXISTS leads_new CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers_new CASCADE;
DROP TABLE IF EXISTS users_new CASCADE;
DROP TABLE IF EXISTS companies_new CASCADE;

-- Drop extension if needed
DROP EXTENSION IF EXISTS vector;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS auth.user_company_id();
```

**Then restore from backup:**
```bash
psql $DATABASE_URL -f backup-YYYYMMDD.sql
```

---

## 📊 SUCCESS METRICS

- ✅ All migrations complete in <5 minutes
- ✅ No data loss from existing tables
- ✅ Existing app continues working
- ✅ Query performance same or better
- ✅ Can insert test data into all new tables

---

## 🔜 NEXT PHASE PREPARATION

Once Phase 1 is complete, you'll have:
- ✅ New database schema ready
- ✅ pgvector for AI features
- ✅ Proper normalization
- ✅ Activity logging infrastructure

**Phase 2 will:**
- Restructure Python backend to use new tables
- Keep old API responses working
- Add new endpoints for new features

---

## ⏱️ ESTIMATED TIME

- **Planning/Review:** 2 hours
- **Migration Creation:** 4 hours
- **Testing:** 4 hours
- **Documentation:** 2 hours
- **Total:** ~1.5 days

**Timeline:**
- Day 1: Create migrations, test locally
- Day 2: Apply to production, verify, document

---

## 📞 SUPPORT NEEDED

**From You:**
- [ ] Approve schema design
- [ ] Provide production database credentials (if applying to production)
- [ ] Test data requirements
- [ ] Confirm company information for seed data

**From Me:**
- [ ] Create all migration files
- [ ] Generate TypeScript types
- [ ] Write documentation
- [ ] Provide testing scripts

---

**Ready to proceed with Phase 1 implementation? Confirm and I'll create all the migration files.**
