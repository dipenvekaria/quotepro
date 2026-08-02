-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 8.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing items table
CREATE TABLE pricing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  description TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, signed, rejected
  photos JSONB DEFAULT '[]',
  sent_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote items table
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  pricing_item_id UUID REFERENCES pricing_items(id),
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  option_tier TEXT, -- null, 'good', 'better', 'best'
  is_upsell BOOLEAN DEFAULT false,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signed documents table
CREATE TABLE signed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  dropbox_signature_request_id TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, signed, declined
  signed_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_pricing_items_company_id ON pricing_items(company_id);
CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_signed_documents_quote_id ON signed_documents(quote_id);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view their own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for pricing_items
CREATE POLICY "Users can view their company pricing items" ON pricing_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = pricing_items.company_id AND companies.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their company pricing items" ON pricing_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = pricing_items.company_id AND companies.user_id = auth.uid())
  );

CREATE POLICY "Users can update their company pricing items" ON pricing_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = pricing_items.company_id AND companies.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their company pricing items" ON pricing_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = pricing_items.company_id AND companies.user_id = auth.uid())
  );

-- RLS Policies for quotes
CREATE POLICY "Users can view their company quotes" ON quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = quotes.company_id AND companies.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their company quotes" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = quotes.company_id AND companies.user_id = auth.uid())
  );

CREATE POLICY "Users can update their company quotes" ON quotes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = quotes.company_id AND companies.user_id = auth.uid())
  );

-- RLS Policies for quote_items
CREATE POLICY "Users can view their quote items" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = quote_items.quote_id AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their quote items" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = quote_items.quote_id AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their quote items" ON quote_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = quote_items.quote_id AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their quote items" ON quote_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = quote_items.quote_id AND companies.user_id = auth.uid()
    )
  );

-- RLS Policies for signed_documents
CREATE POLICY "Users can view their signed documents" ON signed_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = signed_documents.quote_id AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their signed documents" ON signed_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = signed_documents.quote_id AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their signed documents" ON signed_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes 
      JOIN companies ON companies.id = quotes.company_id 
      WHERE quotes.id = signed_documents.quote_id AND companies.user_id = auth.uid()
    )
  );
