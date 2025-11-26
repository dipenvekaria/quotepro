# QuotePro

**Win more jobs in seconds, not minutes.**

AI-powered quote generation for field service contractors (HVAC, plumbing, electrical, roofing, landscaping). Generate professional quotes from simple descriptions using AI, with automatic tax calculation based on customer location.

---

## ✨ Key Features

### 🤖 AI-Powered Quote Generation
- **Groq AI Integration**: Uses llama-3.3-70b-versatile model
- **Smart Pricing**: Matches job descriptions to your pricing catalog
- **Auto-Upsells**: Suggests common add-ons based on industry best practices
- **Instant Generation**: Professional quotes in seconds, not minutes

### 📍 Address-Based Tax Calculation
- **All 50 US States**: Automatic tax rate detection from customer address
- **Smart Parsing**: Handles various address formats
- **Fallback Protection**: Uses company default if state can't be determined
- **No Manual Entry**: Tax rates automatically updated and applied

### 👥 Team Management (RBAC)
- **Admin Role**: Full access (settings, team, quotes)
- **Sales Role**: Quote creation and viewing only
- **Row-Level Security**: Database-enforced permissions
- **Easy Invites**: Add team members by email

### 📊 Professional Features
- **Quote Editing**: Edit, add, or delete line items after generation
- **Photo Uploads**: Attach job site photos to quotes
- **PDF Export**: Download professional-looking PDFs
- **Status Tracking**: Draft → Sent → Signed workflow

---

## 🛠 Tech Stack

**Frontend:**
- Next.js 14 (App Router) + React 18
- TypeScript
- Tailwind CSS + Shadcn/ui
- Supabase Auth & Storage

**Backend:**
- Python 3.11 + FastAPI
- Groq AI (llama-3.3-70b-versatile)
- Supabase PostgreSQL
- Pydantic validation

**Infrastructure:**
- Supabase (Database + Auth + Storage)
- Vercel (Next.js hosting - planned)
- Railway/Fly.io (Python backend - planned)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18+ 
- **Python**: 3.11+
- **Supabase Account**: [Create one](https://supabase.com)
- **Groq API Key**: [Get free key](https://console.groq.com)

### 1. Clone & Install

```bash
git clone <repository-url>
cd quotepro

# Frontend
npm install

# Backend
cd python-backend
./setup.sh
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
```

**Create `python-backend/.env`:**
```bash
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_anon_key
```

### 3. Set Up Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Run migrations from `supabase/migrations/` in order (001 → 005)
4. Create a storage bucket named `logos` (public access)

### 4. Start Development Servers

```bash
# Terminal 1: Next.js Frontend
npm run dev

# Terminal 2: Python Backend
cd python-backend && ./start-server.sh
```

### 5. Open Application

- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture & data flow
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guide & best practices
- **[QUICK_START.md](./QUICK_START.md)** - Detailed setup instructions
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database setup details
- **[MOBILE_TESTING.md](./MOBILE_TESTING.md)** - Mobile testing guide
- **[TAX_CALCULATION_FEATURE.md](./TAX_CALCULATION_FEATURE.md)** - Tax feature docs
- **[python-backend/README.md](./python-backend/README.md)** - Python backend docs

---

## 📱 Key Features Explained

### AI Quote Generation

```
1. Enter customer info + job description
   ↓
2. AI matches description to your pricing catalog
   ↓
3. Suggests appropriate items + quantities
   ↓
4. Calculates tax based on customer address
   ↓
5. Returns professional, editable quote
```

**Example:**
- **Input**: "Install new AC unit in 2000 sq ft home in Austin, TX"
- **Output**: Professional quote with:
  - 3-ton AC unit
  - Installation labor
  - Thermostat upgrade (upsell)
  - Permit fees
  - **Tax**: 6.25% (Texas state rate)
  - **Total**: Calculated automatically

### Address-Based Tax

Supports all 50 US states with automatic detection:

| Address | Detected State | Tax Rate |
|---------|----------------|----------|
| "123 Main St, Austin, TX 78701" | TX | 6.25% |
| "456 Oak Ave, Los Angeles, CA 90001" | CA | 7.25% |
| "789 Pine Rd, Portland, OR 97201" | OR | 0% (no sales tax) |

### Team Roles

| Role | Permissions |
|------|-------------|
| **Admin** | • Manage settings<br>• Add/remove team members<br>• Edit pricing catalog<br>• Create quotes |
| **Sales** | • Create quotes<br>• View quotes<br>• Edit own quotes |

---

## � Database Schema

```sql
companies              # Company information
├── user_id           # Owner (references auth.users)
├── name, logo_url
└── tax_rate          # Default tax rate

team_members          # Team members with roles
├── company_id
├── user_id
└── user_role         # 'admin' | 'sales'

quotes                # Generated quotes
├── company_id
├── customer_name, email, phone, address
├── subtotal, tax_rate, tax_amount, total
└── status            # 'draft' | 'sent' | 'signed'

quote_items           # Line items for quotes
├── quote_id
├── name, description
├── quantity, unit_price, total
└── is_upsell         # Boolean flag

pricing_items         # Company pricing catalog
├── company_id
├── name, price
└── category, unit
```

---

## 🔒 Security

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Role-based permissions** (Admin/Sales)
- ✅ **Company data isolation** (users only see own company)
- ✅ **Supabase Auth** (email + Google OAuth)
- ✅ **Environment variables** for secrets
- ✅ **CORS protection**
- ✅ **SQL injection prevention** (parameterized queries)

---

## � Roadmap

### In Progress
- [ ] Google ADK agents integration (Python backend ready)

### Planned
- [ ] Email quote delivery (SendGrid/Resend)
- [ ] E-signature integration (Dropbox Sign)
- [ ] SMS notifications (Twilio)
- [ ] Payment processing (Stripe)
- [ ] Quote templates
- [ ] Mobile app (React Native)
- [ ] QuickBooks integration

---

## � Contributing

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## � License

MIT License

---

## 🙏 Acknowledgments

- **Groq** - Lightning-fast AI inference
- **Supabase** - Backend infrastructure
- **Vercel** - Hosting & deployment
- **Shadcn/ui** - Beautiful component library

---

**Built with ❤️ for hardworking contractors who deserve better tools.**

For questions or support, see [DEVELOPMENT.md](./DEVELOPMENT.md) or create an issue.
