# QuotePro 🚀

**Win more jobs in seconds, not minutes.**

AI-powered quote generation for field service contractors (HVAC, plumbing, electrical, roofing, landscaping). Generate professional quotes from simple descriptions using AI, with automatic tax calculation, professional PDF generation, public quote viewing, and e-signature integration.

---

## 📋 Table of Contents

- [Features](#-features)
- [Business Flow](#-business-flow)
- [User Guide](#-user-guide)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Documentation](#-documentation)

---

## ✨ Features

### 🤖 AI-Powered Quote Generation
- **Groq AI Integration**: Uses llama-3.3-70b-versatile model for instant quote generation
- **Smart Pricing**: Automatically matches job descriptions to your pricing catalog
- **Auto-Upsells**: Suggests common add-ons based on industry best practices
- **Natural Language Input**: Describe the job in plain English, get a professional quote
- **Instant Generation**: Professional quotes in seconds, not minutes

### 📍 Address-Based Tax Calculation
- **All 50 US States**: Automatic tax rate detection from customer address
- **Smart Parsing**: Handles various address formats via Python backend
- **Fallback Protection**: Uses company default if state can't be determined
- **Real-Time Calculation**: Tax updates automatically as address changes

### 📄 Professional PDF Generation
- **@react-pdf/renderer**: Contractor-grade PDF documents
- **Branded Design**: Company logo, orange accent color (#FF6200)
- **Tiered Pricing Display**: Good/Better/Best options clearly presented
- **Job Photos**: Embedded images with captions
- **Tax Breakdown**: Detailed subtotal, tax rate, tax amount, total
- **Universal Compatibility**: Works in all PDF readers (Adobe, Preview, etc.)

### 🔗 Public Quote Viewer & Customer Acceptance
- **No Login Required**: Customers view quotes via `/q/{quote_id}` URL
- **Mobile Responsive**: Beautiful viewing experience on any device
- **Accept & Sign**: One-click customer acceptance (SignNow or instant acceptance fallback)
- **Smart Status Display**: Shows "Accepted" or "Signed" status with dates
- **Auto-Hide Button**: Accept button disappears after customer accepts/signs
- **PDF Download**: Customers can download PDF copy

### ✍️ E-Signature Integration (SignNow)
- **One-Click Signing**: Customer initiates signing from quote viewer
- **Automatic Fallback**: If SignNow fails, instant acceptance mode activates
- **Webhook Automation**: Status updates when signed/declined/viewed
- **Audit Trail**: All signing events logged to database

### � Work Management & Scheduling
- **To be Scheduled Tab**: Shows all accepted/signed quotes waiting for scheduling
- **Quick Scheduling Modal**: Date and time picker (8 AM - 5 PM slots)
- **Scheduled Tab**: Shows all scheduled jobs with date/time
- **Complete Job Action**: Mark jobs complete when finished
- **Auto-Workflow**: Jobs automatically move between sections

### 📆 Master Calendar
- **Clean Monthly View**: See all scheduled jobs at a glance
- **Orange Dot Indicators**: Visual markers for days with scheduled jobs
- **Job Details Panel**: Click any day to see scheduled jobs with time, customer, address, total
- **Quick Navigation**: Today button and month arrows
- **Clickable Jobs**: Click any job to view full quote details

### 💰 Payment Tracking & Invoicing
- **Invoice Tab**: Completed jobs awaiting payment with total outstanding
- **Mark as Paid Action**: One-click dummy payment tracking
- **Paid Archive**: All paid invoices with total revenue tracking
- **Financial Visibility**: Clear separation of pending vs. received payments

### 📊 Quote Follow-Up Status Tracking
- **Enhanced Status Values**: draft, sent, accepted, signed, declined
- **Color-Coded Badges**: Visual status indicators with icons
- **Timestamp Tracking**: accepted_at, scheduled_at, completed_at, paid_at
- **Auto-Progression**: Quotes move through workflow automatically

### 👥 Team Management (RBAC)
- **Admin Role**: Full access (settings, team, quotes)
- **Sales Role**: Quote creation and viewing only
- **Row-Level Security**: Database-enforced permissions

### 📱 Mobile-First Design
- **Responsive UI**: Optimized for phones, tablets, and desktop
- **Touch-Friendly**: Large tap targets, easy navigation
- **Bottom Navigation**: Quick access to key features on mobile

---

## 💼 Business Flow

### Complete Quote-to-Payment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LEAD CAPTURE                                             │
│    • Customer calls/texts/emails about a job                │
│    • Sales rep creates new quote in QuotePro                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. QUOTE CREATION (30 seconds)                              │
│    • Enter: customer name, phone, email, address            │
│    • Describe job: "Replace 3-ton AC unit, add UV light"    │
│    • Optional: Upload job site photos                       │
│    • Click "Generate Quote"                                 │
│    • AI analyzes description                                │
│    • AI matches to pricing catalog                          │
│    • AI suggests upsells (warranty, maintenance, etc.)      │
│    • Tax calculated from customer address                   │
│    • Professional quote generated instantly                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. QUOTE REVIEW & CUSTOMIZATION                             │
│    • Sales rep reviews AI-generated line items              │
│    • Adjust quantities, prices, descriptions                │
│    • Add/remove items as needed                             │
│    • Add internal notes (hidden from customer)              │
│    • Preview PDF before sending                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. QUOTE DELIVERY                                           │
│    • Click "Send Quote"                                     │
│    • Status changes to "Sent"                               │
│    • Customer receives email with link to public viewer     │
│    • Quote appears in "Leads & Quotes" section              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CUSTOMER ACCEPTANCE                                      │
│    • Customer clicks email link → Public quote viewer       │
│    • Reviews job details, photos, pricing                   │
│    • Clicks "Accept & Sign This Quote"                      │
│    • SignNow opens for signature (or instant acceptance)    │
│    • Status changes to "Signed" or "Accepted"               │
│    • Button disappears, shows confirmation message          │
│    • Quote REMOVED from Leads & Quotes section              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. JOB SCHEDULING                                           │
│    • Accepted quote appears in "Work > To be Scheduled"     │
│    • Contractor clicks "Schedule" button                    │
│    • Scheduling modal opens                                 │
│    • Select date from calendar picker                       │
│    • Select time slot (8 AM - 5 PM)                         │
│    • Click "Schedule Job"                                   │
│    • Quote moves to "Work > Scheduled" tab                  │
│    • Job appears on Calendar page with date/time            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. JOB COMPLETION                                           │
│    • Job visible in "Work > Scheduled" tab                  │
│    • Contractor completes the work                          │
│    • Clicks "Complete" button                               │
│    • Confirmation dialog appears                            │
│    • Quote moves to "Pay > Invoice" tab                     │
│    • completed_at timestamp recorded                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. PAYMENT TRACKING                                         │
│    • Completed job in "Pay > Invoice" section               │
│    • Shows total outstanding across all invoices            │
│    • Contractor receives payment from customer              │
│    • Clicks "Mark as Paid" button                           │
│    • Confirmation dialog appears                            │
│    • Invoice moves to "Pay > Paid" tab                      │
│    • paid_at timestamp recorded                             │
│    • Total revenue tracking updated                         │
└─────────────────────────────────────────────────────────────┘

RESULT: Complete workflow from lead to payment, fully tracked! 🎉
```

### Workflow States

```
QUOTE STATUS VALUES:
draft → sent → accepted/signed → (scheduled) → (completed) → (paid)
  ↓       ↓          ↓                ↓            ↓            ↓
Gray    Blue   Green/Emerald       Orange       Green        Green

DATABASE TIMESTAMPS:
• sent_at       - When quote was sent to customer
• accepted_at   - Customer accepted (instant acceptance)
• signed_at     - Customer signed via SignNow
• scheduled_at  - Job scheduled with date/time
• completed_at  - Job finished
• paid_at       - Invoice paid

UI SECTIONS:
• Leads & Quotes  - Active sales pipeline (draft, sent)
• Work            - Operations (to be scheduled, scheduled)
• Pay             - Financials (invoice, paid)
• Calendar        - All scheduled jobs in monthly view
```
│    • Review AI-generated line items                         │
│    • Add/edit/remove items as needed                        │
│    • Adjust prices, quantities, descriptions                │
│    • Add installation notes                                 │
│    • AI can make changes: "add labor for 2 hours"          │
│    • PDF auto-generates on save                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SEND TO CUSTOMER                                         │
│    • Copy customer quote link (e.g., yourapp.com/q/Q-123)  │
│    • Send via:                                              │
│      - Email                                                │
│      - Text message                                         │
│      - WhatsApp                                             │
│    • Set status to "Sent"                                   │
│    • Quote appears in dashboard "Sent Quotes"               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CUSTOMER VIEWS QUOTE                                     │
│    • Opens link (no login needed)                           │
│    • Sees:                                                  │
│      - Company branding & logo                              │
│      - Job site photos                                      │
│      - Detailed pricing breakdown                           │
│      - Tax calculation                                      │
│      - Total cost                                           │
│    • System records view timestamp                          │
│    • Can download PDF                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. FOLLOW-UP WORKFLOW                                       │
│    • Day 1: Quote sent (blue badge)                         │
│    • Day 3: Send Reminder 1 (yellow badge)                  │
│    • Day 5: Send Reminder 2 (orange badge)                  │
│    • Day 7: Mark expired if no response (red badge)         │
│    • OR Customer accepts (green badge)                      │
│    • Dashboard shows color-coded status for all quotes      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. CUSTOMER ACCEPTS & SIGNS                                 │
│    • Clicks "Accept & Sign" button                          │
│    • Redirected to SignNow signing page                     │
│    • Signs electronically                                   │
│    • SignNow webhook fires                                  │
│    • Quote status → "Accepted" (green badge)                │
│    • signed_at timestamp recorded                           │
│    • Job scheduling unlocked (calendar icon enabled)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. JOB SCHEDULING & EXECUTION                               │
│    • Click calendar icon next to accepted quote             │
│    • Schedule job date/time                                 │
│    • Assign technician                                      │
│    • Complete job                                           │
│    • Win rate & revenue stats update                        │
└─────────────────────────────────────────────────────────────┘
```

### Quote Status State Machine

```
         ┌─────────┐
         │  DRAFT  │  Gray badge • Clock icon
         └────┬────┘
              │
              ↓ [Send to customer]
         ┌─────────┐
         │  SENT   │  Blue badge • Send icon
         └────┬────┘
              │
              ↓ [3 days later]
      ┌───────────────┐
      │  REMINDER_1   │  Yellow badge • Bell icon
      └───────┬───────┘
              │
              ↓ [2 days later]
      ┌───────────────┐
      │  REMINDER_2   │  Orange badge • Bell Ring icon
      └───────┬───────┘
              │
              ↓ [No response after 2 more days]
      ┌───────────────┐         ┌────────────┐
      │   EXPIRED     │  OR     │  ACCEPTED  │  Green badge • Check icon
      │  Red badge    │         │            │  ✅ Can schedule job
      │  X icon       │         │            │
      └───────────────┘         └────────────┘
```

### Dashboard Analytics Flow

```
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD VIEW                                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Quotes Sent  │  │    Signed    │  │  Win Rate    │      │
│  │     24       │  │      12      │  │     50%      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                 │                                  │
│         │                 │ [Click to filter]                │
│         ↓                 ↓                                  │
│  ┌────────────────────────────────────────────────┐         │
│  │ FILTERED QUOTE LIST                            │         │
│  │                                                │         │
│  │  Q-123  John Smith   $4,500  🟢 Accepted      │         │
│  │  Q-124  Jane Doe     $3,200  🔵 Sent          │         │
│  │  Q-125  Bob Jones    $5,800  🟢 Accepted      │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  [Click "All Quotes" to clear filter]                       │
└──────────────────────────────────────────────────────────────┘
```

### Tax Calculation Logic

```
Customer Address: "123 Main St, Austin, TX 78701"
                            ↓
              [Parse address in Python backend]
                            ↓
              Extract state code: "TX"
                            ↓
              Look up: STATE_TAX_RATES['TX'] = 8.25%
                            ↓
              Calculate:
              Subtotal:        $4,000.00
              Tax (8.25%):     $  330.00
              ──────────────────────────
              Total:           $4,330.00
                            ↓
              Return to frontend, display in quote
```

---

## 📖 User Guide

### For Sales Reps: Creating & Sending Quotes

**Step 1: Start New Quote**
1. Click "New Quote" from dashboard
2. Or click phone icon on a lead to convert to quote

**Step 2: Enter Customer Information**
```
Customer Name: John Smith
Phone: (555) 123-4567
Email: john@example.com
Job Address: 123 Main St, Austin, TX 78701
```

**Step 3: Describe the Job**
```
Job Description (be specific):
"Customer needs new 3-ton AC unit installed. Current unit is 15 years old.
Also add UV light sanitizer and 5-year warranty."
```

**Step 4: Optional - Upload Photos**
- Click "Upload Photos" button
- Select job site photos from your phone/computer
- Photos will appear in the PDF and public quote viewer

**Step 5: Generate Quote**
1. Click "Generate Quote" button
2. AI analyzes your description in 2-3 seconds
3. Quote appears with:
   - Line items (equipment, labor, materials)
   - Suggested upsells (warranty, maintenance plan)
   - Automatic tax calculation based on address
   - Total price

**Step 6: Review & Edit**
- Review each line item
- Click pencil icon to edit price, quantity, or description
- Click trash icon to remove items
- Click "Add Item" to add new line items
- Use AI to make changes: "add 2 hours of labor"

**Step 7: Save & Send Quote**
1. Click "Save Quote"
2. PDF automatically generates
3. Quote appears in "Leads & Quotes" section
4. Copy customer link and send via email/text/WhatsApp
5. Quote status changes to "Sent" (blue badge)

---

### For Customers: Accepting a Quote

**Step 1: Open Quote Link**
- Click the link sent by the contractor
- No login required
- Works on phone, tablet, or computer

**Step 2: Review Quote**
- View company information and branding
- See job site photos (if provided)
- Review detailed pricing breakdown
- Check tax calculation and total

**Step 3: Accept & Sign**
1. Click "Accept & Sign This Quote" button
2. SignNow opens for electronic signature
3. OR instant acceptance mode if SignNow unavailable
4. Quote status changes to "Accepted" or "Signed"
5. Button disappears, confirmation message shows

**What Happens Next:**
- Contractor is notified
- Job moves to "Work > To be Scheduled"
- Contractor will contact you to schedule the work

---

### For Contractors: Scheduling Jobs

**Step 1: View Accepted Jobs**
1. Go to "Work" page
2. Click "To be Scheduled" tab
3. See all accepted/signed quotes waiting for scheduling

**Step 2: Schedule a Job**
1. Click "Schedule" button on any job
2. Scheduling modal opens
3. Select date from calendar picker (today or future)
4. Select time slot (8 AM - 5 PM, hourly increments)
5. Click "Schedule Job"

**Step 3: Verify Scheduling**
- Job automatically moves to "Scheduled" tab
- Shows scheduled date and time
- Appears on Calendar page

**View on Calendar:**
1. Click "Calendar" button in Leads page header
2. OR go to Calendar page from navigation
3. See monthly calendar with orange dots on days with jobs
4. Click any day to see job details in right panel
5. Click job card to view full quote details

---

### For Contractors: Completing Jobs & Payment

**Step 1: Complete a Job**
1. Go to "Work > Scheduled" tab
2. After finishing the work, click "Complete" button
3. Confirm in dialog
4. Job moves to "Pay > Invoice" section

**Step 2: Track Outstanding Invoices**
1. Go to "Pay" page
2. Click "Invoice" tab
3. See all completed jobs awaiting payment
4. Top banner shows total outstanding amount
5. Each invoice shows customer, address, amount, completion date

**Step 3: Mark as Paid**
1. When customer pays, click "Mark as Paid" button
2. Confirm in dialog
3. Invoice moves to "Paid" tab
4. Total revenue tracking updates

**Step 4: View Payment History**
1. Click "Paid" tab in Pay section
2. See all paid invoices
3. Green highlighting shows paid status
4. Top banner shows total revenue received
5. Click any invoice to view full quote details
   - Text message
   - WhatsApp
3. Example: `https://yourapp.com/q/Q-1234567`

**Step 9: Track Status**
- Dashboard shows color-coded status badge
- Gray = Draft (not sent yet)
- Blue = Sent (waiting for customer)
- Yellow = Reminder 1 sent
- Orange = Reminder 2 sent
- Green = Accepted (customer signed!)
- Red = Expired (no response)

**Step 10: Follow Up**
- Click quote row to view details
- See when customer viewed quote (viewed_at timestamp)
- Send reminder emails based on status
- Update status manually as needed

**Step 11: Schedule Job (After Acceptance)**
- Calendar icon lights up blue when quote is accepted
- Click calendar icon to schedule job
- (If not accepted, calendar is grayed out)

---

### For Customers: Viewing & Accepting a Quote

**Step 1: Receive Quote Link**
- Get link via email, text, or WhatsApp
- Example: `https://yourapp.com/q/Q-1234567`

**Step 2: Open Quote**
- Click link (works on phone, tablet, or computer)
- No login or account needed
- Loads professional quote view

**Step 3: Review Quote**
You'll see:
- **Company Info**: Logo, name, contact details
- **Your Info**: Name, address, contact
- **Job Photos**: Pictures of your property
- **Pricing Breakdown**:
  - Each line item with description
  - Quantity × Price = Total
  - Subtotal
  - Tax rate & amount
  - **Grand Total**

**Step 4: Accept & Sign (Optional)**
1. Click "Accept & Sign" button
2. Redirected to secure signing page (SignNow)
3. Review one more time
4. Sign with finger (mobile) or mouse (desktop)
5. Click "Submit"
6. Done! You'll receive confirmation email

**Step 5: Download PDF**
- Click "Download PDF" button
- Save copy for your records
- Can print if needed

---

### For Admins: Team Management

**Add Team Member**
1. Go to Settings → Team
2. Click "Invite Team Member"
3. Enter email address
4. Select role:
   - **Admin**: Full access to everything
   - **Sales**: Can only create/view quotes
5. Click "Send Invite"
6. Team member receives email invitation

**Manage Roles**
- View all team members in list
- See current role for each member
- Change roles as needed
- Remove team members

**Company Settings**
1. Go to Settings → Company Profile
2. Update:
   - Company name
   - Logo (for quotes and PDFs)
   - Default tax rate (fallback)
   - Contact information
3. Click "Save Changes"

---

### For Admins: Monitoring Performance

**Dashboard Metrics**

| Metric | What It Means | How to Use |
|--------|---------------|------------|
| **Quotes Sent** | Total quotes sent to customers | Click to filter and see all sent quotes |
| **Signed Quotes** | Quotes that customers accepted | Click to see won jobs |
| **Win Rate** | % of sent quotes that got signed | Track sales effectiveness |
| **Avg Job Size** | Average total of signed quotes | Monitor revenue per job |

**Filtering Quotes**
- Click any stat card to filter
- View quotes by status (sent, signed, draft)
- Click "All Quotes" to clear filter

**Quote Details**
- Click any quote row to view full details
- See audit trail of all changes
- View AI update history
- Check when customer viewed quote

---

### Common Workflows

**Scenario 1: Quick Quote on the Phone**
```
1. Customer calls: "How much to replace my AC?"
2. You ask: "What's your address?"
3. Create new quote, enter customer info
4. Describe: "Replace 3-ton AC unit"
5. Generate quote (3 seconds)
6. Read total to customer: "$4,500"
7. Customer says "Send it to me"
8. Click quote ID, copy link
9. Text link to customer
10. Done! (under 2 minutes)
```

**Scenario 2: Complex Multi-Item Quote**
```
1. Site visit, take photos
2. Create quote, upload photos
3. Describe job: "Replace HVAC unit, add ductwork,
   install smart thermostat, UV light, 5-year warranty"
4. Generate quote
5. AI breaks into line items:
   - 3-ton HVAC unit: $3,500
   - Ductwork (50 ft): $800
   - Labor (8 hours): $800
   - Smart thermostat: $300
   - UV light: $400
   - 5-year warranty: $500
6. Review, adjust prices if needed
7. Save & send to customer
8. Customer views, accepts, signs
9. Schedule installation
```

**Scenario 3: Quote Needs Changes**
```
1. Customer calls: "Can you add a maintenance plan?"
2. Open quote in editor
3. Either:
   A) Use AI: "add annual maintenance plan for $200/year"
   B) Click "Add Item" manually
4. Quote recalculates automatically
5. Click "Update Quote"
6. New PDF generates
7. Customer link updates automatically
8. Customer sees updated quote
```

**Scenario 4: Following Up on Sent Quotes**
```
1. Dashboard shows quote status badges
2. Yellow badge = Reminder 1 stage (3 days after sent)
3. Click quote to see details
4. Check if customer viewed it (viewed_at timestamp)
5. If viewed but not signed:
   - Call customer: "Did you have any questions?"
   - Address concerns
   - Send reminder email
6. Update status after call
7. Monitor for acceptance
```

---

## 🛠 Tech Stack

**Frontend:**
- Next.js 16.0.4 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS + Shadcn/ui
- Supabase Auth & Client
- @react-pdf/renderer (PDF generation)
- React Hook Form
- Sonner (toasts)
- Lucide React (icons)

**Backend:**
- Python 3.11
- FastAPI
- Groq AI (llama-3.3-70b-versatile)
- Pydantic validation
- Custom tax rate calculator (50 states)

**Database & Services:**
- Supabase (PostgreSQL + Auth + Storage + RLS)
- SignNow (E-signatures)

**Deployment:**
- Vercel (Next.js frontend)
- Railway/Fly.io (Python backend)
- Supabase Cloud (Database)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account ([Create free account](https://supabase.com))
- Groq API key ([Get free key](https://console.groq.com))

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd quotepro

# 2. Install frontend dependencies
npm install

# 3. Install Python backend
cd python-backend
./setup.sh  # Creates venv and installs dependencies
cd ..
```

### Configuration

**Create `.env.local` in root:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
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
```

### Database Setup

```bash
# Apply all migrations
npx supabase db push

# Migrations include:
# - 001: Initial schema (companies, quotes, quote_items)
# - 003: Team members & RBAC
# - 009: PDF URL support
# - 012: Profiles table
# - 013: Quote follow-up status tracking
```

### Run Development Servers

```bash
# Terminal 1: Frontend (Next.js)
npm run dev
# → http://localhost:3000

# Terminal 2: Backend (Python/FastAPI)
cd python-backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### First Login

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Create account with email/password
4. Complete onboarding:
   - Company name
   - Upload logo (optional)
   - Default tax rate
5. Dashboard loads → Start creating quotes!

---

## 💻 Development

### Project Structure

```
quotepro/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── api/                # API routes
│   │   ├── auth/               # Auth pages (login, signup)
│   │   ├── q/                  # Public quote viewer
│   │   └── quotes/             # Quote editor
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn/ui components
│   │   ├── dashboard-*.tsx     # Dashboard components
│   │   ├── leads-and-quotes.tsx
│   │   └── quote-status-badge.tsx
│   ├── lib/                    # Utilities
│   │   ├── supabase/          # Supabase clients
│   │   └── roles.ts           # RBAC helpers
│   └── styles/                # Global styles
├── python-backend/
│   ├── main.py                # FastAPI app
│   ├── tax_rates.py           # US state tax rates
│   └── pricing_template.csv   # Default pricing catalog
├── supabase/
│   └── migrations/            # Database migrations
├── docs/                      # Feature documentation
└── public/                    # Static assets
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app/quotes/new/page.tsx` | Quote creation & editing UI |
| `src/components/leads-and-quotes.tsx` | Dashboard quote list with status badges |
| `src/components/quote-status-badge.tsx` | Color-coded status badge component |
| `src/app/q/[id]/page.tsx` | Public quote viewer (no login) |
| `python-backend/main.py` | AI quote generation & tax calculation |
| `supabase/migrations/013_*.sql` | Quote follow-up status tracking schema |

### Adding New Features

**1. Database Changes**
```bash
# Create new migration
npx supabase migration new add_new_feature

# Edit migration file in supabase/migrations/

# Apply migration
npx supabase db push
```

**2. API Endpoints**
```typescript
// src/app/api/your-endpoint/route.ts
export async function POST(request: Request) {
  const supabase = createServerClient()
  // Your logic here
  return NextResponse.json({ success: true })
}
```

**3. Components**
```typescript
// src/components/your-component.tsx
'use client'

export function YourComponent() {
  return <div>Your UI</div>
}
```

### Testing

```bash
# Run Next.js in dev mode
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Debugging

**Frontend (Next.js):**
- Use browser DevTools
- Check Network tab for API calls
- Console.log in components
- React DevTools extension

**Backend (Python):**
- Check terminal where `uvicorn` is running
- Logs show all AI requests & responses
- FastAPI auto-docs at http://localhost:8000/docs

**Database (Supabase):**
- Check Table Editor in Supabase Dashboard
- Use SQL Editor to run queries
- Check Auth → Users for user accounts
- Monitor Storage for uploaded files

---

## 📚 Documentation

### Feature Documentation

All features have detailed docs in `/docs`:

- **[QUICK_START.md](docs/QUICK_START.md)** - Get started in 5 minutes
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture overview
- **[QUOTE_FOLLOWUP_STATUS_FEATURE.md](docs/QUOTE_FOLLOWUP_STATUS_FEATURE.md)** - Status tracking system
- **[QUOTE_STATUS_QUICK_START.md](docs/QUOTE_STATUS_QUICK_START.md)** - Status badges setup
- **[PUBLIC_QUOTE_VIEWER_COMPLETE.md](docs/PUBLIC_QUOTE_VIEWER_COMPLETE.md)** - Public quote viewer
- **[PDF_GENERATION_FEATURE.md](docs/PDF_GENERATION_FEATURE.md)** - PDF generation
- **[SIGNNOW_INTEGRATION.md](docs/SIGNNOW_INTEGRATION.md)** - E-signature setup
- **[TAX_CALCULATION_FEATURE.md](docs/TAX_CALCULATION_FEATURE.md)** - Tax calculation
- **[BULK_UPLOAD_FEATURE_SUMMARY.md](docs/BULK_UPLOAD_FEATURE_SUMMARY.md)** - Bulk product upload

### Migration History

| Migration | Description |
|-----------|-------------|
| 001 | Initial schema (companies, quotes, quote_items) |
| 003 | Team members & RBAC |
| 009 | PDF URL column |
| 012 | Profiles table |
| 013 | Quote follow-up status tracking |

### API Documentation

**Python Backend:**
- FastAPI auto-docs: http://localhost:8000/docs
- Endpoints:
  - `POST /generate-quote` - AI quote generation
  - `POST /calculate-tax` - Address-based tax calculation

**Next.js API Routes:**
- `POST /api/quotes/{id}/generate-pdf` - Generate quote PDF
- `POST /api/quotes/sign` - Initiate SignNow signing
- `POST /api/webhooks/signnow` - SignNow webhook handler

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Make changes and test thoroughly
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📝 License

Proprietary - All rights reserved

---

## 🆘 Support

- **Documentation**: `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@quotepro.com (if configured)

---

## 🎯 Roadmap

- [ ] Email integration (send quotes via email from app)
- [ ] SMS integration (send quotes via SMS)
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Automated follow-up reminders
- [ ] Quote templates
- [ ] Multi-company support
- [ ] Advanced analytics dashboard
- [ ] Mobile apps (iOS/Android)

---

**Built with ❤️ for field service contractors**
