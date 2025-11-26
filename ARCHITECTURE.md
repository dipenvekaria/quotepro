# QuotePro Architecture

## System Overview

QuotePro is a modern SaaS application for field service contractors to generate professional quotes using AI. The system consists of a Next.js frontend, FastAPI Python backend, and Supabase PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                   Next.js 14 + React + TypeScript               │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼──────────┐
│  Next.js API    │    │  Python Backend   │
│    Routes       │    │   FastAPI + Groq  │
│  (Proxy Layer)  │───▶│  (AI Generation)  │
└────────┬────────┘    └────────┬──────────┘
         │                      │
         │         ┌────────────┘
         │         │
┌────────▼─────────▼────────┐
│   Supabase PostgreSQL     │
│   (Database + Auth +      │
│    Storage + RLS)         │
└───────────────────────────┘
```

## Core Components

### 1. Frontend (Next.js 14)

**Location:** `/src`

**Key Technologies:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- Sonner (Toast Notifications)

**Directory Structure:**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/         # Authentication page
│   │   └── onboarding/    # 2-step onboarding flow
│   ├── dashboard/         # Main dashboard
│   ├── quotes/
│   │   └── new/           # Quote creation (1000+ lines)
│   ├── settings/          # Admin settings (RBAC)
│   ├── api/
│   │   ├── generate-quote/  # Proxy to Python backend
│   │   └── quotes/         # Quote PDF, send, sign endpoints
│   └── auth/
│       └── callback/      # OAuth callback handler
├── components/
│   ├── dashboard-nav.tsx  # Sidebar navigation
│   ├── theme-toggle.tsx   # Dark mode toggle
│   └── ui/                # Shadcn components
├── hooks/
│   └── use-user-role.ts   # RBAC permissions hook
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── utils.ts           # Utility functions
│   ├── roles.ts           # RBAC definitions
│   └── default-pricing.ts # Default pricing catalog
└── types/
    └── database.types.ts  # Generated Supabase types
```

### 2. Python Backend (FastAPI)

**Location:** `/python-backend`

**Key Technologies:**
- FastAPI 0.115.5
- Uvicorn (ASGI server)
- Groq AI (llama-3.3-70b-versatile)
- Supabase Python Client
- Pydantic (Data validation)

**Files:**
```
python-backend/
├── main.py              # FastAPI app + quote generation
├── tax_rates.py         # US state tax rate database
├── requirements.txt     # Python dependencies
├── setup.sh            # Virtual env setup script
├── start-server.sh     # Server startup script
└── test_tax_rates.py   # Tax calculation tests
```

**API Endpoints:**
- `GET /health` - Health check
- `POST /api/generate-quote` - AI quote generation

### 3. Database (Supabase PostgreSQL)

**Location:** `/supabase/migrations`

**Schema:**

```sql
-- Core Tables
companies (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text,
  logo_url text,
  tax_rate decimal,
  address text,
  phone text,
  email text
)

team_members (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies,
  user_id uuid REFERENCES auth.users,
  user_role user_role_enum,  -- 'admin' | 'sales'
  UNIQUE(company_id, user_id)
)

quotes (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies,
  quote_number text UNIQUE,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  description text,
  subtotal decimal,
  tax_rate decimal,
  tax_amount decimal NOT NULL,
  total decimal,
  notes text,
  photos jsonb,
  status quote_status_enum,  -- 'draft' | 'sent' | 'signed'
  signed_at timestamp,
  created_at timestamp
)

quote_items (
  id uuid PRIMARY KEY,
  quote_id uuid REFERENCES quotes,
  name text,
  description text,
  quantity decimal,
  unit_price decimal,
  total decimal,
  option_tier text,
  is_upsell boolean,
  sort_order integer
)

pricing_items (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies,
  name text,
  price decimal,
  category text,
  unit text,
  description text
)
```

**Row Level Security (RLS):**
- Companies: Users can only access their own company
- Team Members: Users can see team members of their company
- Quotes: Company owners OR team members can create/view quotes
- Pricing Items: Users can only see their company's pricing

## Data Flow

### Quote Generation Flow

```
1. User enters customer info + job description
   ↓
2. Frontend validates input
   ↓
3. Next.js API route proxies to Python backend
   POST /api/generate-quote {
     company_id, description, customer_name, customer_address
   }
   ↓
4. Python backend:
   a. Fetches pricing catalog from Supabase
   b. Determines tax rate from customer address (50 US states)
   c. Calls Groq API with pricing catalog + description
   d. Parses AI response (JSON with line items)
   e. Calculates totals
   ↓
5. Returns structured quote:
   {
     line_items: [{name, qty, price, total}],
     subtotal, tax_rate, total, notes
   }
   ↓
6. Frontend displays editable quote
   ↓
7. User can:
   - Edit/delete/add line items
   - Save quote to database
   - Send via email (TODO)
   - Get e-signature (TODO)
   - Download PDF
```

### Authentication Flow

```
1. User visits /login
   ↓
2. Options:
   a. Email/Password → Supabase Auth
   b. Google OAuth → Supabase Auth Provider
   ↓
3. Supabase redirects to /auth/callback
   ↓
4. Callback exchanges code for session
   ↓
5. Checks if user has company:
   - No → Redirect to /onboarding
   - Yes → Redirect to /dashboard
```

### RBAC (Role-Based Access Control)

```
Roles:
- Admin: Full access (settings, team management, quotes)
- Sales: Limited access (quotes only, no settings)

Implementation:
1. team_members table stores user_role
2. useUserRole() hook checks permissions
3. hasPermission() checks role + permission
4. RLS policies enforce database-level security

Permissions:
- VIEW_SETTINGS: Admin only
- MANAGE_TEAM: Admin only
- CREATE_QUOTE: Admin + Sales
- VIEW_QUOTES: Admin + Sales
```

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (React 18)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/ui
- **State Management:** React hooks (useState, useEffect)
- **Forms:** Native HTML forms + validation
- **Notifications:** Sonner toasts
- **Icons:** Lucide React
- **Auth:** Supabase Auth
- **File Upload:** Supabase Storage

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11
- **AI Model:** Groq (llama-3.3-70b-versatile)
- **Validation:** Pydantic
- **Server:** Uvicorn
- **Database Client:** Supabase Python SDK

### Database & Infrastructure
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (Email + OAuth)
- **Storage:** Supabase Storage (Company logos)
- **RLS:** PostgreSQL Row Level Security
- **Hosting:** TBD (Vercel for Next.js, Railway/Fly.io for Python)

## Security

### Authentication
- Supabase handles all auth (bcrypt password hashing)
- JWT tokens for session management
- OAuth 2.0 for Google sign-in
- Secure HTTP-only cookies

### Authorization
- Row Level Security (RLS) on all tables
- Role-based permissions (Admin/Sales)
- Company isolation (users can only see their company data)

### Data Protection
- Environment variables for secrets
- CORS configured for specific origins
- SQL injection prevention (parameterized queries)
- XSS protection (React escaping)

## Performance Optimizations

### Frontend
- Server-side rendering for initial load
- Optimistic UI updates (navigation, settings)
- Lazy loading for quote items
- Image optimization (Next.js Image component)

### Backend
- Lazy Supabase client initialization
- Connection pooling (Supabase handles this)
- Efficient SQL queries (indexed foreign keys)

### Database
- Indexes on foreign keys
- Efficient RLS policies (separate OR conditions, not LEFT JOIN)
- Pagination for large result sets (planned)

## Future Enhancements

### Planned Features
- [ ] Google ADK agents integration
- [ ] Email quote delivery (SendGrid/Resend)
- [ ] E-signature integration (Dropbox Sign)
- [ ] SMS notifications (Twilio)
- [ ] Payment processing (Stripe)
- [ ] Advanced analytics dashboard
- [ ] Quote templates
- [ ] Recurring quotes
- [ ] Multi-currency support

### Technical Improvements
- [ ] End-to-end testing (Playwright)
- [ ] Unit tests (Jest + pytest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring (Sentry)
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] API versioning

## Deployment Architecture

### Production Setup (Planned)

```
┌────────────────────┐
│   Vercel (Next.js) │
│  - Edge Functions  │
│  - Static Assets   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Railway/Fly.io    │
│  (Python Backend)  │
│  - FastAPI         │
│  - Groq AI         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Supabase Cloud   │
│  - PostgreSQL      │
│  - Auth            │
│  - Storage         │
└────────────────────┘
```

### Environment Variables

**Next.js (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PYTHON_BACKEND_URL
GROQ_API_KEY  # For fallback/direct calls
```

**Python (python-backend/.env):**
```bash
GROQ_API_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY  # Uses anon key in dev
```

## Development Workflow

1. **Local Development:**
   ```bash
   # Terminal 1: Next.js
   npm run dev  # → http://localhost:3000
   
   # Terminal 2: Python Backend
   cd python-backend
   ./start-server.sh  # → http://localhost:8000
   ```

2. **Database Changes:**
   - Create migration in `supabase/migrations/`
   - Apply via Supabase dashboard or CLI
   - Regenerate types: `supabase gen types typescript`

3. **Adding Features:**
   - Frontend: Create page in `src/app/`
   - Backend: Add endpoint in `python-backend/main.py`
   - Database: Add migration in `supabase/migrations/`
   - Docs: Update this file + README.md

## Troubleshooting

### Common Issues

1. **"Invalid API key" on Python backend**
   - Check `.env` file exists
   - Verify Supabase keys are correct
   - Using anon key? Make sure RLS policies allow access

2. **Quote generation fails**
   - Check Python backend is running (`http://localhost:8000/health`)
   - Verify GROQ_API_KEY is valid
   - Check pricing catalog exists for company

3. **Tax calculation shows 0%**
   - Customer address might not contain valid US state
   - Falls back to company default tax rate

4. **Settings page redirects**
   - User doesn't have admin role
   - Check `team_members` table for correct `user_role`

---

**Last Updated:** November 26, 2024
**Version:** 1.0.0
