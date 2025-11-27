# QuotePro

**Win more jobs in seconds, not minutes.**

AI-powered quote generation for field service contractors (HVAC, plumbing, electrical, roofing, landscaping). Generate professional quotes from simple descriptions using AI, with automatic tax calculation, professional PDF generation, public quote viewing, and e-signature integration.

---

## ✨ Key Features

### 🤖 AI-Powered Quote Generation
- **Groq AI Integration**: Uses llama-3.3-70b-versatile model
- **Smart Pricing**: Matches job descriptions to your pricing catalog
- **Auto-Upsells**: Suggests common add-ons based on industry best practices
- **Good/Better/Best Tiers**: Automatically categorizes options by tier
- **Instant Generation**: Professional quotes in seconds, not minutes

### 📍 Address-Based Tax Calculation
- **All 50 US States**: Automatic tax rate detection from customer address
- **Smart Parsing**: Handles various address formats via Python backend
- **Fallback Protection**: Uses company default if state can't be determined
- **No Manual Entry**: Tax rates automatically updated and applied
- **Real-Time Calculation**: Tax updates as address changes

### 📄 Professional PDF Generation
- **@react-pdf/renderer**: Contractor-grade PDF documents
- **Universal Compatibility**: Helvetica fonts work in all PDF readers (Adobe, Preview, etc.)
- **Branded Design**: Company logo, orange accent color (#FF6200)
- **Tiered Pricing Display**: Good/Better/Best options clearly presented
- **Upsell Highlighting**: Recommended items with visual emphasis
- **Job Photos**: Embedded images with captions
- **Tax Breakdown**: Detailed subtotal, tax rate, tax amount, total
- **Accept & Sign Button**: Direct link to public quote viewer
- **Local Testing**: Generated PDFs saved to `generated-pdfs/` folder
- **Automatic Generation**: PDF created on quote save/update

### 🔗 Public Quote Viewer
- **No Login Required**: Customers view quotes via `/q/{quote_id}` URL
- **Mobile Responsive**: Beautiful viewing experience on any device
- **View Tracking**: Automatically records when customer views quote
- **Status Display**: Clear badges for Draft/Sent/Signed status
- **Good/Better/Best Display**: Tiered options rendered professionally
- **Accept & Sign CTA**: One-click to initiate SignNow e-signature
- **PDF Download**: Customers can download PDF copy
- **Company Branding**: Logo, contact info, professional layout

### ✍️ E-Signature Integration (SignNow)
- **One-Click Signing**: Customer initiates signing from quote viewer
- **Automatic Document Upload**: Quote PDF uploaded to SignNow
- **Signature Field Placement**: Pre-configured signature locations
- **Webhook Automation**: Status updates when signed/declined/viewed
- **Audit Trail**: All signing events logged to database
- **Status Sync**: Quote status automatically updates to "signed"
- **Timestamp Tracking**: `signed_at` and `viewed_at` columns
- **Email Notifications**: SignNow handles signer notifications

### 👥 Team Management (RBAC)
- **Admin Role**: Full access (settings, team, quotes)
- **Sales Role**: Quote creation and viewing only
- **Row-Level Security**: Database-enforced permissions
- **Easy Invites**: Add team members by email

### 📊 Dashboard & Analytics
- **Interactive Stats Cards**: Click to filter quotes by status
- **Quotes Sent**: View all sent quotes
- **Signed Quotes**: See completed jobs
- **Draft Quotes**: Find unfinished work
- **Win Rate**: Track conversion percentage
- **Average Job Size**: Monitor deal values
- **Recent Quotes**: Quick access to latest 10 quotes
- **Real-Time Filtering**: Client-side filtering for instant results

### 🎨 Quote Editor Features
- **Quote ID Display**: Full UUID visible with copy button
- **Copy to Clipboard**: One-click copy with toast notification
- **Photo Uploads**: Attach multiple job site photos
- **Line Item Management**: Add, edit, delete items
- **Tier Selection**: Assign items to Good/Better/Best tiers
- **Upsell Flagging**: Mark recommended add-ons
- **Real-Time Totals**: Live calculation of subtotal, tax, total
- **Status Management**: Draft → Sent → Signed workflow
- **PDF Generation**: Automatic on save/update

---

## 🎯 Business Logic

### Quote Generation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                               │
│    • Customer: name, email, phone, address                  │
│    • Job description (natural language)                     │
│    • Optional: photos                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AI PROCESSING (Groq API)                                 │
│    • Parse job description                                  │
│    • Match to pricing catalog items                         │
│    • Determine quantities                                   │
│    • Assign Good/Better/Best tiers                          │
│    • Suggest upsells (is_upsell: true)                      │
│    • Return structured JSON response                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TAX CALCULATION (Python Backend)                         │
│    • Extract state from customer address                    │
│    • Look up state tax rate in tax_rates.py                 │
│    • Fallback to company default if parsing fails           │
│    • Calculate: tax_amount = subtotal × tax_rate            │
│    • Return: subtotal, tax_rate, tax_amount, total          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. QUOTE CREATION (Supabase)                                │
│    • Insert into 'quotes' table                             │
│    • Insert line items into 'quote_items' table             │
│    • Status: 'draft'                                        │
│    • Generate quote_number: Q-{timestamp}                   │
│    • Return quote ID                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PDF GENERATION (Auto on Save)                            │
│    • POST /api/quotes/{id}/generate-pdf                     │
│    • Render QuotePDF component with React                   │
│    • Convert to PDF buffer with renderToBuffer              │
│    • DEV: Save to generated-pdfs/quote-{number}.pdf         │
│    • PROD: Upload to Supabase Storage (commented out)       │
│    • Update quotes.pdf_url column                           │
│    • Log success to console                                 │
└─────────────────────────────────────────────────────────────┘
```

### Quote Update Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ USER EDITS QUOTE                                            │
│    • Add/remove/edit line items                             │
│    • Change customer info or address                        │
│    • Upload/remove photos                                   │
│    • Assign tiers (Good/Better/Best)                        │
│    • Mark items as upsells                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TAX RECALCULATION (if address changed)                      │
│    • POST /api/calculate-tax                                │
│    • Extract state from new address                         │
│    • Recalculate all totals                                 │
│    • Update UI in real-time                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ SAVE CHANGES                                                │
│    • Update 'quotes' table (subtotal, tax, total)           │
│    • Delete old quote_items                                 │
│    • Insert new quote_items                                 │
│    • Regenerate PDF automatically                           │
│    • Show success toast                                     │
└─────────────────────────────────────────────────────────────┘
```

### Public Quote Viewing & Signing

```
┌─────────────────────────────────────────────────────────────┐
│ SHARE QUOTE WITH CUSTOMER                                   │
│    • Copy link: https://yourapp.com/q/{quote_id}            │
│    • Send via email, SMS, or text message                   │
│    • No login required for customer                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER VIEWS QUOTE                                        │
│    • GET /q/{quote_id}                                      │
│    • Server-side render with Supabase data                  │
│    • Update quotes.viewed_at timestamp                      │
│    • Display: company info, customer info, photos           │
│    • Show: Good/Better/Best tiers or simple table           │
│    • Display: subtotal, tax breakdown, total                │
│    • Buttons: "Accept & Sign", "Download PDF"               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER CLICKS "ACCEPT & SIGN"                             │
│    • Navigate to /q/{quote_id}/sign                         │
│    • POST /api/quotes/sign with quote_id                    │
│    • Upload PDF to SignNow (if not already uploaded)        │
│    • Create signing link for customer                       │
│    • Update quotes.signnow_document_id                      │
│    • Redirect customer to SignNow signing URL               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER SIGNS IN SIGNNOW                                   │
│    • SignNow embedded signing interface                     │
│    • Customer draws/types signature                         │
│    • Customer submits signature                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK AUTOMATION                                          │
│    • SignNow sends webhook to /api/webhooks/signnow         │
│    • Event: document.signed                                 │
│    • Find quote by signnow_document_id                      │
│    • Update quotes.status = 'signed'                        │
│    • Update quotes.signed_at = current timestamp            │
│    • Insert audit log entry                                 │
│    • Return 200 OK to SignNow                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD UPDATES                                           │
│    • Quote status badge changes to "Signed"                 │
│    • Win rate recalculates                                  │
│    • Signed quotes count increments                         │
│    • Quote appears in "Signed" filter                       │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Filtering Logic

```javascript
// Interactive stat cards filter the quote list
const filterLogic = {
  'Quotes Sent': (quotes) => quotes.filter(q => q.status === 'sent'),
  'Signed Quotes': (quotes) => quotes.filter(q => q.status === 'signed'),
  'Draft Quotes': (quotes) => quotes.filter(q => q.status === 'draft'),
  'All Quotes': (quotes) => quotes // No filter
}

// Client-side state management
const [filter, setFilter] = useState<'all' | 'sent' | 'signed' | 'draft'>('all')

// Click handler on stat cards
<Card onClick={() => setFilter('sent')}>
  <CardContent>
    <div>Quotes Sent: {sentQuotes.length}</div>
  </CardContent>
</Card>

// Filtered display
const filteredQuotes = quotes.filter(quote => {
  if (filter === 'all') return true
  return quote.status === filter
})
```

### Tax Rate Determination

```python
# Python Backend: tax_rates.py
STATE_TAX_RATES = {
    'AL': 4.00, 'AK': 0.00, 'AZ': 5.60, 'AR': 6.50,
    'CA': 7.25, 'CO': 2.90, 'CT': 6.35, 'DE': 0.00,
    # ... all 50 states
}

def get_tax_rate_from_address(address: str) -> float:
    """Extract state from address and return tax rate"""
    
    # Regex patterns for state detection
    patterns = [
        r'\b([A-Z]{2})\s+\d{5}',  # "TX 78701"
        r',\s*([A-Z]{2})\s*$',     # ", TX"
        r'\b(Alabama|Alaska|...)\b' # Full state names
    ]
    
    # Try each pattern
    for pattern in patterns:
        match = re.search(pattern, address, re.IGNORECASE)
        if match:
            state = normalize_state(match.group(1))
            return STATE_TAX_RATES.get(state, 0.0)
    
    # Fallback: return 0 if no state found
    return 0.0
```

### Quote Status State Machine

```
┌─────────┐
│  draft  │ ← Initial state after AI generation
└─────────┘
     ↓
     │ User clicks "Send Quote" (future feature)
     ↓
┌─────────┐
│  sent   │ ← Quote sent to customer
└─────────┘
     ↓
     │ Customer views quote (viewed_at timestamp set)
     │ Customer signs via SignNow
     ↓
┌─────────┐
│ signed  │ ← Final state (signed_at timestamp set)
└─────────┘

Alternative path:
sent → declined (if customer declines in SignNow)
```

### Quote Number Generation

```typescript
// Format: Q-{timestamp}
// Example: Q-20182388

// Generated in Python backend:
def generate_quote_number() -> str:
    timestamp = int(time.time() * 100) % 100000000
    return f"Q-{timestamp}"

// Ensures uniqueness across all quotes
// Easy to communicate to customers
// Short enough for verbal communication
```

---

## 🛠 Tech Stack

**Frontend:**
- Next.js 16.0.4 (App Router) + React 18
- TypeScript 5.x
- Tailwind CSS + Shadcn/ui
- Supabase Auth & Storage
- @react-pdf/renderer v4.3.1 (PDF generation)
- React Hook Form (form management)
- Sonner (toast notifications)

**Backend:**
- Python 3.11 + FastAPI
- Groq AI (llama-3.3-70b-versatile)
- Supabase PostgreSQL
- Pydantic validation
- Custom tax rate calculator (all 50 states)

**Third-Party Services:**
- Supabase (Database + Auth + Storage + RLS)
- Groq AI (LLM inference)
- SignNow (E-signature platform)
- Vercel (Next.js hosting - planned)
- Railway/Fly.io (Python backend - planned)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18+ 
- **Python**: 3.11+
- **Supabase Account**: [Create one](https://supabase.com)
- **Groq API Key**: [Get free key](https://console.groq.com)
- **SignNow Account**: [Sign up](https://www.signnow.com) (optional, for e-signatures)

### 1. Clone & Install

```bash
git clone <repository-url>
cd quotepro

# Frontend
npm install

# Backend
cd python-backend
./setup.sh  # Creates venv and installs dependencies
cd ..
```

### 2. Configure Environment

**Create `.env.local` in root:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Python Backend
PYTHON_BACKEND_URL=http://localhost:8000

# AI
GROQ_API_KEY=your_groq_api_key

# SignNow (optional)
SIGNNOW_CLIENT_ID=your_client_id
SIGNNOW_CLIENT_SECRET=your_client_secret
SIGNNOW_ACCESS_TOKEN=your_access_token
```

**Create `python-backend/.env`:**
```bash
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Run migrations from `supabase/migrations/` in SQL Editor (in order):
   - `001_initial_schema.sql` - Base tables
   - `002_quote_items.sql` - Quote line items
   - `003_add_quote_photos.sql` - Photo storage
   - `004_add_audit_trail.sql` - Audit logging
   - `005_team_roles.sql` - RBAC system
   - `006_add_signnow_fields.sql` - E-signature integration
   - `007_add_pricing_table.sql` - Pricing catalog
   - `008_add_quote_number.sql` - Quote numbering
   - `009_add_pdf_url_to_quotes.sql` - PDF storage
   - `010_add_quote_tracking_columns.sql` - View/sign tracking
4. Create storage buckets:
   - `logos` (public access) - Company logos
   - `quote-photos` (public access) - Job site photos
   - `quotes` (private) - Generated PDFs (for production)

### 4. Start Development Servers

```bash
# Terminal 1: Next.js Frontend
npm run dev
# Runs on http://localhost:3000

# Terminal 2: Python Backend
cd python-backend
./start-server.sh
# Runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 5. Create Your First Quote

1. Open http://localhost:3000
2. Sign up with email or Google OAuth
3. Complete onboarding (company info, logo)
4. Go to "New Quote"
5. Enter customer info and job description
6. Click "Generate Quote with AI"
7. Edit line items, add photos
8. Click "Save Quote"
9. PDF automatically generated to `generated-pdfs/quote-{number}.pdf`
10. View quote at `/q/{quote_id}` (copy link from quote ID)

---

## 📚 Documentation

### Setup & Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Detailed setup instructions
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database setup details
- **[python-backend/README.md](../python-backend/README.md)** - Python backend docs

### Features & Guides
- **[PDF_GENERATION_FEATURE.md](./PDF_GENERATION_FEATURE.md)** - PDF generation system
- **[PDF_LOCAL_TESTING.md](./PDF_LOCAL_TESTING.md)** - Testing PDFs locally
- **[PDF_FONT_FIX.md](./PDF_FONT_FIX.md)** - Font compatibility notes
- **[PUBLIC_QUOTE_VIEWER_COMPLETE.md](./PUBLIC_QUOTE_VIEWER_COMPLETE.md)** - Public viewer guide
- **[SIGNNOW_INTEGRATION.md](./SIGNNOW_INTEGRATION.md)** - E-signature setup
- **[TAX_CALCULATION_FEATURE.md](./TAX_CALCULATION_FEATURE.md)** - Tax feature docs
- **[BULK_UPLOAD_DOCUMENTATION.md](./BULK_UPLOAD_DOCUMENTATION.md)** - Bulk pricing import
- **[AUDIT_TRAIL_FEATURE.md](./AUDIT_TRAIL_FEATURE.md)** - Audit logging system

### Development & Deployment
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture & data flow
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guide & best practices
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[MOBILE_TESTING.md](./MOBILE_TESTING.md)** - Mobile testing guide

### Technical Fixes & Updates
- **[NEXTJS_16_ASYNC_PARAMS_FIX.md](./NEXTJS_16_ASYNC_PARAMS_FIX.md)** - Next.js 16 compatibility
- **[QUOTE_ID_DISPLAY.md](./QUOTE_ID_DISPLAY.md)** - Quote ID feature
- **[UI_IMPROVEMENTS_SUMMARY.md](./UI_IMPROVEMENTS_SUMMARY.md)** - UI enhancements

---

## 📱 Key User Journeys

### Journey 1: Create Quote from Scratch

```
Contractor (Admin/Sales) Journey:
1. Login → Dashboard
2. Click "New Quote" in navigation
3. Fill customer info:
   • Name: "John Smith"
   • Email: "john@example.com"
   • Phone: "555-1234"
   • Address: "123 Main St, Austin, TX 78701"
4. Enter job description:
   • "Replace broken 3-ton AC unit, customer wants 
      efficient model, house is 2000 sq ft"
5. Click "Generate Quote with AI"
6. AI returns:
   • Line items with quantities and prices
   • Items categorized by tier (Good/Better/Best)
   • Upsell items flagged
   • Tax calculated (6.25% for TX)
7. Review and edit:
   • Adjust quantities if needed
   • Add/remove items
   • Upload job site photos
   • Change tiers or upsell flags
8. Click "Save Quote"
9. PDF automatically generated
10. Console shows: "✅ PDF saved to: /generated-pdfs/quote-Q-12345.pdf"
11. Copy quote link from quote ID section
12. Share with customer via email/SMS

Timeline: 60-90 seconds total
```

### Journey 2: Customer Views & Signs Quote

```
Customer (No Login) Journey:
1. Receives link: https://quotepro.com/q/abc-123-def
2. Opens link on phone or desktop
3. Sees professional quote page:
   • Company logo and branding
   • Their contact info
   • Job site photos
   • Good/Better/Best pricing options
   • Clear total with tax breakdown
4. Reviews options, chooses "Better" tier mentally
5. Clicks "Accept & Sign"
6. Redirected to /q/abc-123-def/sign
7. Loading screen: "Preparing document..."
8. Auto-redirected to SignNow signing page
9. Reviews quote PDF in SignNow
10. Draws signature with mouse/finger
11. Clicks "Submit"
12. Success page from SignNow

Backend (Automatic):
1. SignNow webhook → /api/webhooks/signnow
2. Quote status updated: 'draft' → 'signed'
3. Timestamp recorded in signed_at column
4. Audit log entry created
5. Dashboard stats update (win rate increases)

Contractor sees:
• Dashboard shows quote as "Signed"
• Can now proceed with job

Timeline: 2-3 minutes total
```

### Journey 3: Dashboard Analytics

```
Contractor (Admin) Journey:
1. Login → Dashboard
2. View stats at top:
   ┌─────────────┬─────────────┬─────────────┬─────────────┐
   │ Quotes Sent │   Signed    │   Drafts    │  All Quotes │
   │     12      │      8      │      3      │     23      │
   └─────────────┴─────────────┴─────────────┴─────────────┘
3. Click "Signed Quotes" card
4. List filters to show only signed quotes (8 items)
5. Header updates: "Signed Quotes - 8 quotes"
6. "Show All" button appears
7. Review conversion rate: 8/12 = 67% win rate
8. Click specific quote to view details
9. Navigate to quote editor
10. See full quote with "Signed" badge
11. Download PDF for records

Timeline: 30 seconds to review stats
```

### Journey 4: Edit Existing Quote

```
Contractor Journey:
1. Dashboard → Click on draft quote
2. Quote editor loads with saved data
3. Customer changes mind - wants higher tier
4. Contractor:
   • Changes AC unit to 4-ton (Better tier)
   • Adds smart thermostat (upsell)
   • Removes old item
5. Totals recalculate in real-time:
   • Subtotal: $4,500 → $6,200
   • Tax (6.25%): $281.25 → $387.50
   • Total: $4,781.25 → $6,587.50
6. Click "Update Quote"
7. PDF automatically regenerated
8. New PDF overwrites old one
9. Updated quote link still works
10. Customer sees new pricing

Timeline: 1-2 minutes to update
```
## 📱 Technical Deep Dives

### AI Quote Generation

```
1. Enter customer info + job description
   ↓
2. AI matches description to your pricing catalog
   ↓
3. Suggests appropriate items + quantities
   ↓
4. Assigns Good/Better/Best tiers
   ↓
5. Flags upsell opportunities
   ↓
6. Calculates tax based on customer address
   ↓
7. Returns professional, editable quote
```

**Example:**
- **Input**: "Install new AC unit in 2000 sq ft home in Austin, TX"
- **AI Processing**:
  ```json
  {
    "items": [
      {
        "name": "3-Ton AC Unit Installation",
        "quantity": 1,
        "unit_price": 3500,
        "option_tier": "good",
        "is_upsell": false
      },
      {
        "name": "Smart Thermostat",
        "quantity": 1,
        "unit_price": 350,
        "option_tier": "better",
        "is_upsell": true
      },
      {
        "name": "Air Duct Cleaning",
        "quantity": 1,
        "unit_price": 450,
        "option_tier": "best",
        "is_upsell": true
      }
    ]
  }
  ```
- **Output**: Professional quote with:
  - Good: Basic AC install ($3,500)
  - Better: + Smart thermostat ($3,850)
  - Best: + Duct cleaning ($4,300)
  - **Tax**: 6.25% (Texas state rate)
  - **Total**: Calculated for each tier

### Address-Based Tax

Supports all 50 US states with automatic detection:

| Address | Detected State | Tax Rate |
|---------|----------------|----------|
| "123 Main St, Austin, TX 78701" | TX | 6.25% |
| "456 Oak Ave, Los Angeles, CA 90001" | CA | 7.25% |
| "789 Pine Rd, Portland, OR 97201" | OR | 0% (no sales tax) |
| "321 Elm St, New York, NY 10001" | NY | 4% (state only) |

**Tax Calculation Flow:**
```python
# 1. Extract state from address
address = "123 Main St, Austin, TX 78701"
state = extract_state(address)  # Returns "TX"

# 2. Look up tax rate
tax_rate = STATE_TAX_RATES[state]  # 0.0625 (6.25%)

# 3. Calculate tax amount
subtotal = 3500.00
tax_amount = subtotal * tax_rate  # $218.75

# 4. Calculate total
total = subtotal + tax_amount  # $3,718.75
```

### Team Roles & Permissions

| Feature | Admin | Sales |
|---------|-------|-------|
| View Dashboard | ✅ | ✅ |
| Create Quotes | ✅ | ✅ |
| Edit Own Quotes | ✅ | ✅ |
| Edit Others' Quotes | ✅ | ❌ |
| View All Quotes | ✅ | ✅ |
| Company Settings | ✅ | ❌ |
| Manage Team | ✅ | ❌ |
| Edit Pricing Catalog | ✅ | ❌ |
| Upload Logo | ✅ | ❌ |

**Row-Level Security (RLS) Examples:**
```sql
-- Quotes table policy: Users only see own company's quotes
CREATE POLICY "Users can view own company quotes"
ON quotes FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Settings policy: Only admins can update
CREATE POLICY "Only admins can update company"
ON companies FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE company_id = companies.id
    AND user_id = auth.uid()
    AND user_role = 'admin'
  )
);
```

---

## 📊 Database Schema

```sql
-- Core Tables

companies                          # Company information & settings
├── id (uuid, PK)
├── user_id (uuid, FK → auth.users)  # Owner
├── name (text)
├── logo_url (text)
├── tax_rate (numeric)             # Default/fallback tax rate
├── phone, email, address
├── created_at, updated_at
└── RLS: Users see only their company

team_members                       # RBAC: Team access control
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── user_id (uuid, FK → auth.users)
├── user_role (text)               # 'admin' | 'sales'
├── created_at
└── RLS: Users see only own company members

quotes                            # Customer quotes
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── quote_number (text, unique)   # Format: Q-12345678
├── customer_name, email, phone, address
├── subtotal (numeric)
├── tax_rate (numeric)            # Applied rate (from address or default)
├── tax_amount (numeric)          # Calculated tax
├── total (numeric)               # subtotal + tax_amount
├── status (text)                 # 'draft' | 'sent' | 'signed' | 'declined'
├── pdf_url (text)                # Path to generated PDF
├── signnow_document_id (text)    # SignNow integration
├── viewed_at (timestamptz)       # When customer viewed quote
├── signed_at (timestamptz)       # When customer signed
├── sent_at (timestamptz)
├── created_at, updated_at
└── RLS: Users see only own company quotes

quote_items                       # Line items for quotes
├── id (uuid, PK)
├── quote_id (uuid, FK → quotes)
├── name (text)
├── description (text)
├── quantity (numeric)
├── unit_price (numeric)
├── total (numeric)               # quantity × unit_price
├── is_upsell (boolean)           # AI-suggested add-on
├── option_tier (text)            # 'good' | 'better' | 'best' | null
├── created_at
└── RLS: Inherits from quotes

quote_photos                      # Job site photos
├── id (uuid, PK)
├── quote_id (uuid, FK → quotes)
├── photo_url (text)              # Supabase Storage path
├── caption (text)
├── created_at
└── RLS: Inherits from quotes

pricing_items                     # Company pricing catalog
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (text)
├── price (numeric)
├── category (text)               # 'labor' | 'material' | 'equipment'
├── unit (text)                   # 'each' | 'hour' | 'sq ft'
├── description (text)
├── created_at, updated_at
└── RLS: Users see only own company items

quote_audit_log                   # Audit trail for compliance
├── id (uuid, PK)
├── quote_id (uuid, FK → quotes)
├── action (text)                 # 'created' | 'updated' | 'sent' | 'signed'
├── changed_by (uuid, FK → auth.users)
├── changes (jsonb)               # Full change diff
├── created_at
└── RLS: Users see only own company audit logs
```

---

## 🔒 Security

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Role-based permissions** (Admin/Sales)
- ✅ **Company data isolation** (users only see own company)
- ✅ **Supabase Auth** (email + Google OAuth)
- ✅ **Environment variables** for secrets
- ✅ **CORS protection** on API routes
- ✅ **SQL injection prevention** (parameterized queries)
- ✅ **Audit logging** (all quote changes tracked)
- ✅ **Webhook verification** (SignNow events validated)
- ✅ **Public quote viewer** (no login required, but quotes private by ID)

---

## 📈 Roadmap

### ✅ Completed (Current Version)
- [x] AI-powered quote generation (Groq)
- [x] Address-based tax calculation (all 50 states)
- [x] Team management with RBAC
- [x] Professional PDF generation (@react-pdf/renderer)
- [x] Public quote viewer (no login required)
- [x] E-signature integration (SignNow)
- [x] Webhook automation (status updates)
- [x] Audit trail logging
- [x] Dashboard with interactive filtering
- [x] Quote ID display with copy functionality
- [x] Good/Better/Best tier pricing
- [x] Upsell flagging and highlighting
- [x] Photo upload for quotes
- [x] Mobile-responsive design

### 🚧 In Progress
- [ ] Google ADK agents integration (backend ready)
- [ ] Email quote delivery (SendGrid/Resend)

### 📋 Planned
- [ ] SMS notifications (Twilio)
- [ ] Payment processing (Stripe)
- [ ] Quote templates (save common quote structures)
- [ ] Mobile app (React Native)
- [ ] QuickBooks integration
- [ ] Advanced analytics (conversion funnels, revenue tracking)
- [ ] Quote expiration dates
- [ ] Recurring quotes/subscriptions
- [ ] Multi-language support
- [ ] White-label options for agencies
---

## 🙏 Acknowledgments

- **Groq** - Lightning-fast AI inference (llama-3.3-70b-versatile)
- **Supabase** - Backend infrastructure (database, auth, storage)
- **SignNow** - E-signature platform integration
- **Vercel** - Next.js hosting platform
- **Shadcn/ui** - Beautiful component library
- **@react-pdf/renderer** - Professional PDF generation
- **FastAPI** - Python backend framework

---

## 📝 License

MIT License - See LICENSE file for details

---

## 💡 Support & Contributing

### Getting Help
- **Documentation**: See `/docs` folder for detailed guides
- **Issues**: Create GitHub issue for bugs or feature requests
- **Email**: [your-email@example.com] for direct support

### Contributing
See [DEVELOPMENT.md](./DEVELOPMENT.md) for development guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript for type safety
- ESLint + Prettier for formatting
- Conventional commits for messages
- Test coverage for new features

---

**Built with ❤️ for hardworking contractors who deserve better tools.**

*Stop losing jobs to slow quotes. Win more work in seconds with QuotePro.*
