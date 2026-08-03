-- ============================================================================
-- QuotePro 2.0 — Baseline Schema
-- ============================================================================
-- This is the canonical schema for QuotePro 2.0. Everything that came before
-- is archived under supabase/migrations/legacy/ for historical reference.
--
-- Design decisions (see docs/rebuild/adr/):
--  * Unified `work_items` table with status enum encoding lifecycle stage.
--  * `kind` is a GENERATED column derived from status (lead/quote/job/archived).
--  * All tenant tables scoped by company_id; RLS enforced at DB layer.
--  * pgvector 768-dim embeddings (Gemini text-embedding-004).
--  * BM25 via tsvector; hybrid RAG done in RPC `match_documents`.
--  * ADK sessions durable in `adk_sessions_v2`.
--  * `webhooks_inbound` is append-only audit trail for external events.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 2. Shared helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Slugify utility for company URLs
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(regexp_replace(coalesce(input, ''), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
$$;

-- ----------------------------------------------------------------------------
-- 3. Enums
-- ----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'owner', 'office', 'sales', 'technician'
);

CREATE TYPE public.work_item_status AS ENUM (
  'lead',
  'quote_draft', 'quote_sent', 'quote_viewed', 'quote_accepted', 'quote_rejected', 'quote_expired',
  'job_scheduled', 'job_in_progress', 'job_completed', 'job_cancelled',
  'archived'
);

CREATE TYPE public.invoice_status AS ENUM (
  'draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash', 'check', 'card', 'bank_transfer', 'stripe'
);

CREATE TYPE public.webhook_status AS ENUM (
  'pending', 'processed', 'failed', 'skipped'
);

-- ----------------------------------------------------------------------------
-- 4. companies (multi-tenant root)
-- ----------------------------------------------------------------------------

CREATE TABLE public.companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  slug         TEXT NOT NULL UNIQUE
                 GENERATED ALWAYS AS (public.slugify(name || '-' || substr(id::text, 1, 8))) STORED,
  logo_url     TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  settings     JSONB NOT NULL DEFAULT jsonb_build_object(
                 'tax_rate', 8.5,
                 'currency', 'USD',
                 'timezone', 'America/Los_Angeles',
                 'ai', jsonb_build_object('model', 'gemini-2.0-flash', 'temperature', 0.1)
               ),
  plan         TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.companies IS 'Multi-tenant root. One row per contractor business.';

-- ----------------------------------------------------------------------------
-- 5. users (app-level user record; references auth.users)
-- ----------------------------------------------------------------------------

CREATE TABLE public.users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role           public.user_role NOT NULL DEFAULT 'technician',
  profile        JSONB NOT NULL DEFAULT jsonb_build_object(
                   'first_name', NULL,
                   'last_name', NULL,
                   'phone', NULL,
                   'avatar_url', NULL
                 ),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_company_id_idx ON public.users(company_id);
CREATE INDEX users_role_idx        ON public.users(company_id, role);

COMMENT ON TABLE public.users IS 'App-level user record. `id` mirrors auth.users.id.';

-- ----------------------------------------------------------------------------
-- 6. customers + addresses
-- ----------------------------------------------------------------------------

CREATE TABLE public.customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  email       TEXT,
  phone       TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customers_company_id_idx  ON public.customers(company_id);
CREATE INDEX customers_name_trgm_idx   ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX customers_email_idx       ON public.customers(company_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX customers_phone_idx       ON public.customers(company_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX customers_unique_phone_per_company
  ON public.customers(company_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX customers_unique_email_per_company
  ON public.customers(company_id, lower(email)) WHERE email IS NOT NULL;

CREATE TABLE public.customer_addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label        TEXT,
  address      TEXT NOT NULL,
  city         TEXT,
  state        TEXT,
  zip          TEXT,
  country      TEXT NOT NULL DEFAULT 'US',
  geocode      JSONB,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customer_addresses_customer_id_idx ON public.customer_addresses(customer_id);
CREATE UNIQUE INDEX customer_addresses_one_primary_per_customer
  ON public.customer_addresses(customer_id) WHERE is_primary IS TRUE;

-- ----------------------------------------------------------------------------
-- 7. catalog_items (product/service catalog)
-- ----------------------------------------------------------------------------

CREATE TABLE public.catalog_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  description       TEXT,
  category          TEXT,
  subcategory       TEXT,
  base_price        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  unit              TEXT NOT NULL DEFAULT 'each',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  typical_quantity  NUMERIC(10, 3),
  labor_hours       NUMERIC(6, 2),
  material_cost     NUMERIC(12, 2),
  job_type          TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX catalog_items_company_id_idx ON public.catalog_items(company_id);
CREATE INDEX catalog_items_active_idx     ON public.catalog_items(company_id, is_active);
CREATE INDEX catalog_items_category_idx   ON public.catalog_items(company_id, category);
CREATE INDEX catalog_items_tags_idx       ON public.catalog_items USING gin (tags);
CREATE INDEX catalog_items_name_trgm_idx  ON public.catalog_items USING gin (name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 8. work_items (unified: leads + quotes + jobs)
-- ----------------------------------------------------------------------------

CREATE TABLE public.work_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  address_id            UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  assigned_to           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,

  status                public.work_item_status NOT NULL DEFAULT 'lead',
  kind                  TEXT NOT NULL DEFAULT 'lead'
                          CHECK (kind IN ('lead','quote','job','archived','unknown')),

  source                TEXT NOT NULL DEFAULT 'direct'
                          CHECK (source IN ('direct','phone','website','referral','google_ads','facebook','other')),
  urgency               TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high')),

  quote_number          TEXT,
  invoice_number        TEXT,
  job_number            TEXT,
  job_name              TEXT,
  description           TEXT,
  notes                 TEXT,

  subtotal              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate              NUMERIC(5, 2)  NOT NULL DEFAULT 8.5,
  tax_amount            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12, 2) NOT NULL DEFAULT 0,

  scheduled_start       TIMESTAMPTZ,
  scheduled_end         TIMESTAMPTZ,

  sent_at               TIMESTAMPTZ,
  viewed_at             TIMESTAMPTZ,
  accepted_at           TIMESTAMPTZ,
  rejected_at           TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  archived_at           TIMESTAMPTZ,
  archived_reason       TEXT,
  expires_at            TIMESTAMPTZ,

  public_token          TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  pdf_url               TEXT,
  signed_document_url   TEXT,

  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT work_items_quote_number_unique UNIQUE (company_id, quote_number) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT work_items_invoice_number_unique UNIQUE (company_id, invoice_number) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT work_items_job_number_unique UNIQUE (company_id, job_number) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT work_items_schedule_order CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end >= scheduled_start)
);

CREATE INDEX work_items_company_status_idx    ON public.work_items(company_id, status);
CREATE INDEX work_items_company_kind_idx      ON public.work_items(company_id, kind);
CREATE INDEX work_items_company_created_idx   ON public.work_items(company_id, created_at DESC);
CREATE INDEX work_items_customer_id_idx       ON public.work_items(customer_id);
CREATE INDEX work_items_assigned_to_idx       ON public.work_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX work_items_scheduled_range_idx   ON public.work_items(company_id, scheduled_start)
  WHERE scheduled_start IS NOT NULL;
CREATE INDEX work_items_public_token_idx      ON public.work_items(public_token);

COMMENT ON TABLE public.work_items IS 'Unified leads/quotes/jobs. Status enum encodes lifecycle; kind is a generated classifier.';

-- ----------------------------------------------------------------------------
-- 9. quote_items + quote_options
-- ----------------------------------------------------------------------------

CREATE TABLE public.quote_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id      UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 300),
  description       TEXT,
  quantity          NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(12, 2) NOT NULL,
  total             NUMERIC(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  option_tier       TEXT CHECK (option_tier IN ('good','better','best')),
  is_upsell         BOOLEAN NOT NULL DEFAULT FALSE,
  is_discount       BOOLEAN NOT NULL DEFAULT FALSE,
  discount_target   TEXT CHECK (discount_target IN ('total','item')),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX quote_items_work_item_id_idx ON public.quote_items(work_item_id, sort_order);

CREATE TABLE public.quote_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id  UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL CHECK (tier IN ('good','better','best')),
  name          TEXT NOT NULL,
  description   TEXT,
  total         NUMERIC(12, 2) NOT NULL,
  is_selected   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_item_id, tier)
);

CREATE INDEX quote_options_work_item_id_idx ON public.quote_options(work_item_id, sort_order);

-- ----------------------------------------------------------------------------
-- 10. invoices + payments
-- ----------------------------------------------------------------------------

CREATE TABLE public.invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_item_id              UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  customer_id               UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_number            TEXT NOT NULL,
  subtotal                  NUMERIC(12, 2) NOT NULL,
  tax_amount                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total                     NUMERIC(12, 2) NOT NULL,
  amount_paid               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status                    public.invoice_status NOT NULL DEFAULT 'draft',
  due_date                  DATE,
  sent_at                   TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  payment_method            public.payment_method,
  payment_link_url          TEXT,
  stripe_payment_intent_id  TEXT,
  public_token              TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  pdf_url                   TEXT,
  notes                     TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, invoice_number)
);

CREATE INDEX invoices_company_status_idx   ON public.invoices(company_id, status);
CREATE INDEX invoices_customer_id_idx      ON public.invoices(customer_id);
CREATE INDEX invoices_work_item_id_idx     ON public.invoices(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX invoices_public_token_idx     ON public.invoices(public_token);
CREATE INDEX invoices_due_date_idx         ON public.invoices(company_id, due_date) WHERE due_date IS NOT NULL;

CREATE TABLE public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method            public.payment_method NOT NULL,
  reference_number  TEXT,
  notes             TEXT,
  paid_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_invoice_id_idx ON public.payments(invoice_id);

-- ----------------------------------------------------------------------------
-- 11. document_embeddings (RAG)
-- ----------------------------------------------------------------------------

CREATE TABLE public.document_embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('work_item','catalog_item','customer','company_doc')),
  entity_id    UUID NOT NULL,
  content      TEXT NOT NULL CHECK (length(content) > 0),
  embedding    vector(768) NOT NULL,
  tsv          TSVECTOR,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, entity_type, entity_id)
);

CREATE INDEX document_embeddings_hnsw_idx
  ON public.document_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX document_embeddings_tsv_idx
  ON public.document_embeddings USING gin (tsv);

CREATE INDEX document_embeddings_company_entity_idx
  ON public.document_embeddings(company_id, entity_type);

CREATE INDEX document_embeddings_entity_lookup_idx
  ON public.document_embeddings(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 12. activity_log (append-only audit trail)
-- ----------------------------------------------------------------------------

CREATE TABLE public.activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  action       TEXT NOT NULL,
  description  TEXT,
  changes      JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_log_entity_idx    ON public.activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX activity_log_company_time_idx ON public.activity_log(company_id, created_at DESC);
CREATE INDEX activity_log_user_id_idx   ON public.activity_log(user_id) WHERE user_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 13. ai_conversations (LLM cost & quality tracking)
-- ----------------------------------------------------------------------------

CREATE TABLE public.ai_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type    TEXT,
  entity_id      UUID,
  agent_name     TEXT NOT NULL,
  model          TEXT NOT NULL,
  purpose        TEXT NOT NULL,
  messages       JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_input   INTEGER NOT NULL DEFAULT 0 CHECK (tokens_input >= 0),
  tokens_output  INTEGER NOT NULL DEFAULT 0 CHECK (tokens_output >= 0),
  cost_usd       NUMERIC(10, 6) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  latency_ms     INTEGER,
  status         TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','partial')),
  error_message  TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_conversations_company_time_idx ON public.ai_conversations(company_id, created_at DESC);
CREATE INDEX ai_conversations_agent_idx        ON public.ai_conversations(company_id, agent_name, created_at DESC);
CREATE INDEX ai_conversations_entity_idx       ON public.ai_conversations(entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 14. ai_prompts (per-company prompt overrides)
-- ----------------------------------------------------------------------------

CREATE TABLE public.ai_prompts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  content      TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name, version)
);

CREATE UNIQUE INDEX ai_prompts_one_active_per_name
  ON public.ai_prompts(company_id, name) WHERE is_active IS TRUE;

-- ----------------------------------------------------------------------------
-- 15. adk_sessions_v2 (durable ADK sessions)
-- ----------------------------------------------------------------------------

CREATE TABLE public.adk_sessions_v2 (
  app_name    TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  state       JSONB NOT NULL DEFAULT '{}'::jsonb,
  events      JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_name, user_id, session_id)
);

CREATE INDEX adk_sessions_v2_expires_idx ON public.adk_sessions_v2(expires_at)
  WHERE expires_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 16. notification_prefs
-- ----------------------------------------------------------------------------

CREATE TABLE public.notification_prefs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  channels     JSONB NOT NULL DEFAULT jsonb_build_object(
                 'email', TRUE,
                 'sms', FALSE,
                 'push', FALSE,
                 'in_app', TRUE
               ),
  quiet_hours  JSONB NOT NULL DEFAULT jsonb_build_object('start', '22:00', 'end', '07:00'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. webhooks_inbound (idempotent inbound event log)
-- ----------------------------------------------------------------------------

CREATE TABLE public.webhooks_inbound (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL CHECK (source IN ('stripe','dropbox_sign','twilio','lemonsqueezy','other')),
  event_id      TEXT,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  signature     TEXT,
  status        public.webhook_status NOT NULL DEFAULT 'pending',
  processed_at  TIMESTAMPTZ,
  error_message TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, event_id)
);

CREATE INDEX webhooks_inbound_status_idx ON public.webhooks_inbound(status, created_at DESC);
CREATE INDEX webhooks_inbound_source_idx ON public.webhooks_inbound(source, created_at DESC);

-- ============================================================================
-- 18. Triggers (updated_at + NOTIFY hooks)
-- ============================================================================

CREATE TRIGGER trg_companies_updated_at        BEFORE UPDATE ON public.companies        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_users_updated_at            BEFORE UPDATE ON public.users            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customers_updated_at        BEFORE UPDATE ON public.customers        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_catalog_items_updated_at    BEFORE UPDATE ON public.catalog_items    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_work_items_updated_at       BEFORE UPDATE ON public.work_items       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated_at         BEFORE UPDATE ON public.invoices         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_doc_embeddings_updated_at   BEFORE UPDATE ON public.document_embeddings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_adk_sessions_updated_at     BEFORE UPDATE ON public.adk_sessions_v2  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_notif_prefs_updated_at      BEFORE UPDATE ON public.notification_prefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep work_items.kind derived from status. Trigger (not GENERATED) because the
-- `status::text LIKE ...` expression is not IMMUTABLE per Postgres.
CREATE OR REPLACE FUNCTION public.set_work_item_kind()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.kind := CASE
    WHEN NEW.status = 'lead' THEN 'lead'
    WHEN NEW.status = 'archived' THEN 'archived'
    WHEN NEW.status::text LIKE 'quote_%' THEN 'quote'
    WHEN NEW.status::text LIKE 'job_%'   THEN 'job'
    ELSE 'unknown'
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_items_set_kind
  BEFORE INSERT OR UPDATE OF status ON public.work_items
  FOR EACH ROW EXECUTE FUNCTION public.set_work_item_kind();

-- Populate document_embeddings.tsv on write (to_tsvector is STABLE, not IMMUTABLE).
CREATE OR REPLACE FUNCTION public.set_document_embedding_tsv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.tsv := to_tsvector('simple', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_embeddings_set_tsv
  BEFORE INSERT OR UPDATE OF content ON public.document_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.set_document_embedding_tsv();

-- Notify indexer worker when embeddings need refresh
CREATE OR REPLACE FUNCTION public.notify_indexer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  channel TEXT;
  payload JSONB;
BEGIN
  IF TG_TABLE_NAME = 'work_items' THEN
    channel := 'work_item_indexed';
  ELSIF TG_TABLE_NAME = 'catalog_items' THEN
    channel := 'catalog_item_indexed';
  ELSE
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'id', NEW.id,
    'company_id', NEW.company_id,
    'op', TG_OP
  );

  PERFORM pg_notify(channel, payload::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_items_notify_indexer
  AFTER INSERT OR UPDATE ON public.work_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_indexer();

CREATE TRIGGER trg_catalog_items_notify_indexer
  AFTER INSERT OR UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_indexer();

-- ============================================================================
-- 19. RLS helpers (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, auth AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, auth AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, auth AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_owner_or_office()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, auth AS $$
  SELECT public.get_user_role() IN ('owner', 'office');
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, auth AS $$
  SELECT public.get_user_role() = 'owner';
$$;

REVOKE ALL ON FUNCTION public.get_user_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, service_role;

-- ============================================================================
-- 20. Row Level Security
-- ============================================================================

ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_options        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adk_sessions_v2      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_inbound     ENABLE ROW LEVEL SECURITY;

-- companies: users see & update their own; service role bypasses.
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id());
CREATE POLICY companies_update_owner_office ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id() AND public.is_owner_or_office())
  WITH CHECK (id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY companies_service ON public.companies FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- users: everyone in company reads; only owners can insert/update/delete.
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR id = auth.uid());
CREATE POLICY users_insert_owner ON public.users FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner());
CREATE POLICY users_update_owner ON public.users FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner());
CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));
CREATE POLICY users_delete_owner ON public.users FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner() AND id != auth.uid());
CREATE POLICY users_service ON public.users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- customers: company-scoped for all roles.
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY customers_write ON public.customers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY customers_delete_owner ON public.customers FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner());
CREATE POLICY customers_service ON public.customers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- customer_addresses: gated through customer's company.
CREATE POLICY customer_addresses_select ON public.customer_addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.company_id = public.get_user_company_id()));
CREATE POLICY customer_addresses_write ON public.customer_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.company_id = public.get_user_company_id()));
CREATE POLICY customer_addresses_update ON public.customer_addresses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.company_id = public.get_user_company_id()));
CREATE POLICY customer_addresses_delete ON public.customer_addresses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.company_id = public.get_user_company_id()) AND public.is_owner_or_office());
CREATE POLICY customer_addresses_service ON public.customer_addresses FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- catalog_items: all read; owner/office write.
CREATE POLICY catalog_items_select ON public.catalog_items FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY catalog_items_write ON public.catalog_items FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY catalog_items_update ON public.catalog_items FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner_or_office())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY catalog_items_delete ON public.catalog_items FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner());
CREATE POLICY catalog_items_service ON public.catalog_items FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- work_items: role-scoped read; write allowed with company match; delete owner-only.
CREATE POLICY work_items_select ON public.work_items FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id() AND (
      public.is_owner_or_office()
      OR (public.get_user_role() = 'sales' AND (created_by = auth.uid() OR assigned_to = auth.uid()))
      OR (public.get_user_role() = 'technician' AND assigned_to = auth.uid())
    )
  );
CREATE POLICY work_items_insert ON public.work_items FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id() AND public.get_user_role() IN ('owner','office','sales')
  );
CREATE POLICY work_items_update ON public.work_items FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id() AND (
      public.is_owner_or_office()
      OR (public.get_user_role() = 'sales' AND created_by = auth.uid())
      OR (public.get_user_role() = 'technician' AND assigned_to = auth.uid())
    )
  )
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY work_items_delete_owner ON public.work_items FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner());
CREATE POLICY work_items_service ON public.work_items FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- quote_items: gated via parent work_item.
CREATE POLICY quote_items_select ON public.quote_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_items_write ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_items_update ON public.quote_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_items_delete ON public.quote_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_items_service ON public.quote_items FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- quote_options: same gating as quote_items.
CREATE POLICY quote_options_select ON public.quote_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_options_write ON public.quote_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_options_update ON public.quote_options FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_options_delete ON public.quote_options FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = work_item_id AND w.company_id = public.get_user_company_id()));
CREATE POLICY quote_options_service ON public.quote_options FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- invoices: read by company; write by owner/office.
CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY invoices_write ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY invoices_update ON public.invoices FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner_or_office())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY invoices_delete ON public.invoices FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner());
CREATE POLICY invoices_service ON public.invoices FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- payments: read/write gated via invoice's company.
CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id()));
CREATE POLICY payments_write ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id())
    AND public.is_owner_or_office()
  );
CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id())
    AND public.is_owner_or_office()
  );
CREATE POLICY payments_service ON public.payments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- document_embeddings: read by authenticated in company; writes typically via service_role.
CREATE POLICY document_embeddings_select ON public.document_embeddings FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY document_embeddings_service ON public.document_embeddings FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- activity_log: append-only, company-scoped read.
CREATE POLICY activity_log_select ON public.activity_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY activity_log_insert ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY activity_log_service ON public.activity_log FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ai_conversations: read by company; write mostly via service_role.
CREATE POLICY ai_conversations_select ON public.ai_conversations FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY ai_conversations_service ON public.ai_conversations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ai_prompts: read by company; owner/office write.
CREATE POLICY ai_prompts_select ON public.ai_prompts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY ai_prompts_write ON public.ai_prompts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY ai_prompts_update ON public.ai_prompts FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner_or_office())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner_or_office());
CREATE POLICY ai_prompts_service ON public.ai_prompts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- adk_sessions_v2: user-scoped.
CREATE POLICY adk_sessions_select ON public.adk_sessions_v2 FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY adk_sessions_service ON public.adk_sessions_v2 FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- notification_prefs: user-scoped.
CREATE POLICY notification_prefs_select ON public.notification_prefs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.company_id = public.get_user_company_id()));
CREATE POLICY notification_prefs_upsert ON public.notification_prefs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY notification_prefs_update ON public.notification_prefs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notification_prefs_service ON public.notification_prefs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- webhooks_inbound: service_role only.
CREATE POLICY webhooks_inbound_service ON public.webhooks_inbound FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- 21. Views
-- ============================================================================

CREATE OR REPLACE VIEW public.quote_details_view AS
SELECT
  w.id,
  w.company_id,
  w.customer_id,
  c.name        AS customer_name,
  c.email       AS customer_email,
  c.phone       AS customer_phone,
  w.job_name,
  w.description,
  w.status,
  w.kind,
  w.subtotal,
  w.tax_rate,
  w.tax_amount,
  w.discount_amount,
  w.total,
  w.public_token,
  w.created_at,
  w.updated_at,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
       'id', qi.id, 'name', qi.name, 'description', qi.description,
       'quantity', qi.quantity, 'unit_price', qi.unit_price, 'total', qi.total,
       'option_tier', qi.option_tier, 'is_upsell', qi.is_upsell,
       'is_discount', qi.is_discount, 'discount_target', qi.discount_target,
       'sort_order', qi.sort_order
     ) ORDER BY qi.sort_order)
     FROM public.quote_items qi WHERE qi.work_item_id = w.id),
    '[]'::jsonb
  ) AS items
FROM public.work_items w
JOIN public.customers c ON c.id = w.customer_id
WHERE w.kind IN ('quote', 'lead');

CREATE OR REPLACE VIEW public.job_schedule_view AS
SELECT
  w.id,
  w.company_id,
  w.customer_id,
  c.name AS customer_name,
  w.job_name,
  w.status,
  w.assigned_to,
  u.profile AS assignee_profile,
  w.scheduled_start,
  w.scheduled_end,
  w.total,
  w.created_at
FROM public.work_items w
JOIN public.customers c ON c.id = w.customer_id
LEFT JOIN public.users u ON u.id = w.assigned_to
WHERE w.kind = 'job';

CREATE OR REPLACE VIEW public.customer_overview_view AS
SELECT
  c.id,
  c.company_id,
  c.name,
  c.email,
  c.phone,
  c.created_at,
  (SELECT COUNT(*)::int FROM public.work_items w WHERE w.customer_id = c.id AND w.kind = 'quote') AS quotes_count,
  (SELECT COUNT(*)::int FROM public.work_items w WHERE w.customer_id = c.id AND w.kind = 'job')   AS jobs_count,
  (SELECT COALESCE(SUM(total), 0) FROM public.invoices i WHERE i.customer_id = c.id AND i.status = 'paid') AS lifetime_paid
FROM public.customers c;

CREATE OR REPLACE VIEW public.analytics_daily_view AS
SELECT
  w.company_id,
  date_trunc('day', w.created_at)::date AS day,
  COUNT(*) FILTER (WHERE w.kind = 'lead')                                            AS leads_created,
  COUNT(*) FILTER (WHERE w.status = 'quote_sent')                                    AS quotes_sent,
  COUNT(*) FILTER (WHERE w.status IN ('quote_accepted','job_scheduled','job_in_progress','job_completed')) AS quotes_won,
  COALESCE(SUM(w.total) FILTER (WHERE w.status IN ('quote_accepted','job_scheduled','job_in_progress','job_completed')), 0) AS revenue_booked
FROM public.work_items w
GROUP BY w.company_id, day;

CREATE OR REPLACE VIEW public.ai_cost_view AS
SELECT
  ac.company_id,
  date_trunc('day', ac.created_at)::date AS day,
  ac.agent_name,
  ac.model,
  COUNT(*)                                AS calls,
  SUM(ac.tokens_input)                    AS tokens_input,
  SUM(ac.tokens_output)                   AS tokens_output,
  ROUND(SUM(ac.cost_usd), 4)              AS cost_usd,
  ROUND(AVG(ac.latency_ms))               AS avg_latency_ms
FROM public.ai_conversations ac
GROUP BY ac.company_id, day, ac.agent_name, ac.model;

-- ============================================================================
-- 22. RPC functions
-- ============================================================================

-- Hybrid retrieval: BM25 tsvector rank + cosine similarity via RRF.
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding  vector(768),
  query_text       TEXT,
  match_company_id UUID,
  match_entity_type TEXT DEFAULT NULL,
  match_count      INT DEFAULT 10,
  vector_threshold FLOAT DEFAULT 0.6,
  rrf_k            INT DEFAULT 60
)
RETURNS TABLE (
  id           UUID,
  entity_type  TEXT,
  entity_id    UUID,
  content      TEXT,
  metadata     JSONB,
  vector_score FLOAT,
  bm25_score   FLOAT,
  rrf_score    FLOAT
)
LANGUAGE sql STABLE AS $$
  WITH vec AS (
    SELECT
      de.id,
      de.entity_type,
      de.entity_id,
      de.content,
      de.metadata,
      1 - (de.embedding <=> query_embedding) AS score,
      ROW_NUMBER() OVER (ORDER BY de.embedding <=> query_embedding) AS rank
    FROM public.document_embeddings de
    WHERE de.company_id = match_company_id
      AND (match_entity_type IS NULL OR de.entity_type = match_entity_type)
      AND 1 - (de.embedding <=> query_embedding) >= vector_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 4
  ),
  bm25 AS (
    SELECT
      de.id,
      de.entity_type,
      de.entity_id,
      de.content,
      de.metadata,
      ts_rank_cd(de.tsv, plainto_tsquery('english', query_text)) AS score,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(de.tsv, plainto_tsquery('english', query_text)) DESC) AS rank
    FROM public.document_embeddings de
    WHERE de.company_id = match_company_id
      AND (match_entity_type IS NULL OR de.entity_type = match_entity_type)
      AND de.tsv @@ plainto_tsquery('english', query_text)
    ORDER BY score DESC
    LIMIT match_count * 4
  ),
  merged AS (
    SELECT id, entity_type, entity_id, content, metadata, score AS vector_score, 0::float AS bm25_score,
           1.0 / (rrf_k + rank) AS rrf_from_vec, 0::float AS rrf_from_bm25
    FROM vec
    UNION ALL
    SELECT id, entity_type, entity_id, content, metadata, 0::float AS vector_score, score AS bm25_score,
           0::float AS rrf_from_vec, 1.0 / (rrf_k + rank) AS rrf_from_bm25
    FROM bm25
  )
  SELECT
    id, entity_type, entity_id, content, metadata,
    MAX(vector_score)             AS vector_score,
    MAX(bm25_score)               AS bm25_score,
    SUM(rrf_from_vec + rrf_from_bm25) AS rrf_score
  FROM merged
  GROUP BY id, entity_type, entity_id, content, metadata
  ORDER BY rrf_score DESC
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_documents(vector, TEXT, UUID, TEXT, INT, FLOAT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_documents(vector, TEXT, UUID, TEXT, INT, FLOAT, INT) TO authenticated, service_role;

-- Atomic: create customer + work_item in one call.
CREATE OR REPLACE FUNCTION public.create_work_item_with_customer(
  p_company_id       UUID,
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_customer_email   TEXT,
  p_address          TEXT,
  p_description      TEXT,
  p_status           public.work_item_status DEFAULT 'lead'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_customer_id UUID;
  v_address_id  UUID;
  v_work_id     UUID;
BEGIN
  IF p_company_id != public.get_user_company_id() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: company mismatch';
  END IF;

  -- Upsert customer by phone or email
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE company_id = p_company_id
    AND (
      (p_customer_phone IS NOT NULL AND phone = p_customer_phone)
      OR (p_customer_email IS NOT NULL AND lower(email) = lower(p_customer_email))
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (company_id, name, email, phone)
    VALUES (p_company_id, p_customer_name, p_customer_email, p_customer_phone)
    RETURNING id INTO v_customer_id;
  END IF;

  IF p_address IS NOT NULL AND length(trim(p_address)) > 0 THEN
    SELECT id INTO v_address_id
      FROM public.customer_addresses
     WHERE customer_id = v_customer_id AND address = p_address
     LIMIT 1;

    IF v_address_id IS NULL THEN
      INSERT INTO public.customer_addresses (customer_id, address, is_primary)
      SELECT v_customer_id, p_address,
             NOT EXISTS (SELECT 1 FROM public.customer_addresses WHERE customer_id = v_customer_id)
      RETURNING id INTO v_address_id;
    END IF;
  END IF;

  INSERT INTO public.work_items (
    company_id, customer_id, address_id, description, status, created_by
  ) VALUES (
    p_company_id, v_customer_id, v_address_id, p_description, p_status, auth.uid()
  ) RETURNING id INTO v_work_id;

  RETURN v_work_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_work_item_with_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.work_item_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_work_item_with_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, public.work_item_status) TO authenticated, service_role;

-- ============================================================================
-- 23. Auth trigger — auto-create public.users row on auth.users signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- If the user was provisioned with a company_id in raw_user_meta_data, use it.
  v_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;

  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.users (id, company_id, role)
    VALUES (
      NEW.id,
      v_company_id,
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'technician')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 24. Comments
-- ============================================================================

COMMENT ON FUNCTION public.match_documents IS 'Hybrid vector+BM25 retrieval with Reciprocal Rank Fusion.';
COMMENT ON FUNCTION public.create_work_item_with_customer IS 'Atomic customer + work_item creation for /api/leads and /api/quotes flows.';
COMMENT ON FUNCTION public.get_user_company_id IS 'Returns caller company_id from public.users. Used by every RLS policy.';
COMMENT ON FUNCTION public.notify_indexer IS 'Emits pg_notify() so the indexer worker can refresh embeddings.';

-- ============================================================================
-- End of baseline schema
-- ============================================================================
