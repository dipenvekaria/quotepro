# QuotePro Redesign - Technical Specification

**Version:** 2.0  
**Date:** November 28, 2025  
**Status:** Implementation Ready

---

## 🎯 Executive Summary

Complete redesign of QuotePro to simplify the contractor workflow into 3 main categories with 2 queues each (6 total pages). All existing features (AI generation, tax calculation, PDF, SignNow, etc.) remain 100% intact — only the organization and navigation structure changes.

**Goal:** Dead simple workflow - contractors see exactly what they need to do at each stage.

---

## 📐 New Architecture

### Three Main Categories (3x2 Structure)

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUOTEPRO 2.0                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LEADS & QUOTES                                              │
│     ├─ Leads Queue         (New customer calls, schedule visit)│
│     └─ Quotes Queue        (Draft/send quotes with AI)         │
│                                                                 │
│  2. WORK                                                        │
│     ├─ To be Scheduled     (Accepted quotes + shared calendar) │
│     └─ Scheduled           (Scheduled jobs, complete action)   │
│                                                                 │
│  3. PAY                                                         │
│     ├─ Invoice             (Completed work, send invoice)      │
│     └─ Paid                (Payment received, revenue stats)   │
│                                                                 │
│  + SETTINGS                                                     │
│     └─ Company, Team, Products, etc.                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

### New Routes (Next.js App Router)

```
src/app/(dashboard)/
├── leads-and-quotes/
│   ├── leads/
│   │   └── page.tsx              # Leads queue
│   ├── quotes/
│   │   └── page.tsx              # Quotes queue
│   └── layout.tsx                # Shared layout for category
│
├── work/
│   ├── to-be-scheduled/
│   │   └── page.tsx              # To be Scheduled queue + calendar
│   ├── scheduled/
│   │   └── page.tsx              # Scheduled queue
│   └── layout.tsx                # Shared layout for category
│
├── pay/
│   ├── invoice/
│   │   └── page.tsx              # Invoice queue (RENAMED from current /pay)
│   ├── paid/
│   │   └── page.tsx              # Paid queue (SPLIT from current /pay)
│   └── layout.tsx                # Shared layout for category
│
└── settings/                      # EXISTING - keep as-is
    └── page.tsx
```

### New Components

```
src/components/
├── navigation/
│   ├── mobile-bottom-nav.tsx      # NEW - Mobile bottom navigation bar
│   ├── desktop-sidebar.tsx        # NEW - Desktop sidebar navigation
│   └── navigation-wrapper.tsx     # NEW - Adaptive navigation container
│
├── floating-action-menu.tsx       # NEW - Floating + button menu
│
├── shared-calendar/
│   ├── calendar-grid.tsx          # NEW - Shared calendar component
│   ├── event-card.tsx             # NEW - Calendar event display
│   ├── schedule-modal.tsx         # ENHANCED - Schedule visit/job modal
│   └── calendar-filters.tsx       # NEW - Tech/date filters
│
├── queue-components/
│   ├── queue-header.tsx           # NEW - Standard queue page header
│   ├── queue-search.tsx           # NEW - Search bar component
│   ├── queue-filters.tsx          # NEW - Filter dropdown component
│   ├── queue-card.tsx             # NEW - Generic queue item card
│   └── empty-queue.tsx            # NEW - Empty state display
│
└── [existing components...]       # KEEP ALL - No deletions
```

---

## 📱 Navigation Design

### Mobile Bottom Navigation Bar

**Position:** Fixed at bottom of screen  
**Icons:** 4 main items  
**Active State:** Orange (#FF6200) with label

```tsx
Navigation Items:
1. Leads & Quotes  (Icon: Users + FileText)
2. Work            (Icon: Calendar)
3. Pay             (Icon: DollarSign)
4. Settings        (Icon: Settings)
```

**Behavior:**
- Tapping icon navigates to that category's default queue
- Active state shown with orange background
- Label always visible on mobile
- Height: 64px with safe area insets

### Desktop Sidebar Navigation

**Position:** Fixed on left side  
**Width:** 240px collapsed, 280px expanded  
**Structure:** Expandable sections

```tsx
Navigation Structure:
├─ QuotePro Logo (top)
├─ [Separator]
├─ Leads & Quotes ▼
│  ├─ Leads (with count badge)
│  └─ Quotes (with count badge)
├─ Work ▼
│  ├─ To be Scheduled (with count badge)
│  └─ Scheduled (with count badge)
├─ Pay ▼
│  ├─ Invoice (with count badge)
│  └─ Paid
├─ [Separator]
└─ Settings
```

**Features:**
- Collapsible sections (remember state in localStorage)
- Count badges show number of items in each queue
- Active page highlighted in orange
- Smooth expand/collapse animations

---

## 🎨 Floating Action Menu

**Position:** Bottom-right corner (above mobile nav on mobile)  
**Trigger:** Circular button with "+" icon  
**Color:** Orange (#FF6200)

**Menu Items:**
```tsx
1. New Lead           → Opens lead creation modal
2. Schedule Visit     → Opens calendar modal (for quote visits)
3. New Quote          → Opens quote creation flow
```

**Behavior:**
- Click "+" to expand menu upward
- Click outside or item to close
- Each item shows icon + label
- Smooth slide-up animation
- Z-index ensures it's always on top

---

## 📄 Queue Pages Specification

### General Queue Page Structure

All 6 queue pages follow this consistent pattern:

```tsx
<QueuePage>
  <QueueHeader 
    title="Queue Name"
    count={items.length}
    description="What this queue shows"
  />
  
  <QueueToolbar>
    <QueueSearch 
      placeholder="Search customers..."
      onSearch={handleSearch}
    />
    <QueueFilters 
      filters={['Tech', 'Date', 'Status']}
      onFilterChange={handleFilter}
    />
  </QueueToolbar>

  <QueueContent>
    {filteredItems.length === 0 ? (
      <EmptyQueue message="No items in this queue" />
    ) : (
      <QueueGrid>
        {filteredItems.map(item => (
          <QueueCard key={item.id} item={item} actions={actions} />
        ))}
      </QueueGrid>
    )}
  </QueueContent>
</QueuePage>
```

---

## 📋 Detailed Queue Specifications

### 1. Leads Queue (`/leads-and-quotes/leads`)

**Purpose:** First point of contact - new customer calls/inquiries

**Data Source:** `quotes` table where `lead_status IN ('new', 'contacted')`

**Card Display:**
```tsx
- Customer Name (large, bold)
- Phone Number (clickable tel: link)
- Email (if provided)
- Address (if provided)
- Date Added
- Lead Status badge (new/contacted)
- Actions:
  ├─ Schedule Quote Visit (primary button, orange)
  ├─ Create Quote (secondary button)
  └─ Edit Lead Info (icon button)
```

**Filters:**
- Search: Customer name, phone, email
- Status: New, Contacted
- Date Added: Today, This Week, This Month, All Time

**Special Features:**
- "Schedule Quote Visit" button opens calendar modal
- Calendar modal shows availability and schedules visit
- After scheduling, lead moves to "contacted" status
- Can convert directly to quote with "Create Quote" button

**Auto-Transitions:**
- Lead → (Create Quote) → Quotes Queue
- Lead → (Schedule Visit) → stays in Leads with "contacted" status

---

### 2. Quotes Queue (`/leads-and-quotes/quotes`)

**Purpose:** Draft and send quotes using AI generation

**Data Source:** `quotes` table where `lead_status = 'quoted'` AND `(status IN ('draft', 'sent') OR (accepted_at IS NULL AND signed_at IS NULL))`

**Card Display:**
```tsx
- Quote Number (Q-XXXXX)
- Customer Name (large, bold)
- Address
- Total Amount ($X,XXX.XX in orange)
- Quote Status badge (draft/sent)
- Date Created
- Last Updated
- Actions:
  ├─ Edit Quote (pencil icon)
  ├─ Send to Customer (if draft)
  ├─ View Public Link (if sent)
  └─ Delete (trash icon)
```

**Filters:**
- Search: Customer name, quote number, address
- Status: Draft, Sent
- Amount Range: <$1k, $1k-$5k, $5k-$10k, >$10k
- Date: Today, This Week, This Month, All Time

**Workflow:**
1. Click "New Quote" from floating menu OR convert from lead
2. Use EXISTING quote creation flow (AI generation, editor, photos, etc.)
3. Save as draft (stays in queue)
4. Send to customer (updates status to 'sent', stays in queue)
5. Customer accepts/signs → AUTO-MOVE to Work > To be Scheduled

**Integration Points:**
- KEEP: AI generation (`/api/ai/generate-quote`)
- KEEP: Quote editor (`/quotes/new?id=X`)
- KEEP: PDF generation
- KEEP: Public viewer (`/q/[id]`)
- KEEP: SignNow integration
- KEEP: Instant acceptance fallback

**Auto-Transitions:**
- Quote Accepted/Signed → Work > To be Scheduled Queue
- Quote remains in Quotes Queue until customer accepts

---

### 3. Work > To be Scheduled Queue (`/work/to-be-scheduled`)

**Purpose:** Accepted quotes waiting for job scheduling

**Data Source:** `quotes` table where `(status = 'accepted' OR status = 'signed')` AND `scheduled_at IS NULL` AND `completed_at IS NULL`

**Page Layout:**
```tsx
<TwoColumnLayout>
  <LeftColumn width="40%">
    <QueueHeader />
    <QueueToolbar />
    <QueueList>
      {jobs.map(job => (
        <CompactJobCard 
          customer={job.customer_name}
          address={job.customer_address}
          total={job.total}
          acceptedDate={job.accepted_at}
          onClick={() => selectJob(job)}
        />
      ))}
    </QueueList>
  </LeftColumn>
  
  <RightColumn width="60%">
    <SharedCalendar 
      events={allScheduledEvents}
      selectedJob={selectedJob}
      onSchedule={handleScheduleJob}
    />
  </RightColumn>
</TwoColumnLayout>
```

**Card Display (Compact List):**
```tsx
- Customer Name (bold)
- Address (truncated)
- Total ($X,XXX.XX in orange)
- Accepted Date
- Quick Info: Phone icon (clickable)
```

**Shared Calendar Features:**
- Monthly grid view
- Color-coded events:
  - Orange: Quote Visits (from Leads)
  - Green: Scheduled Jobs (from this queue)
- Tech filter dropdown
- Date navigation (prev/next month, today)
- Click day to select
- Time slot selection (8 AM - 5 PM, hourly)
- Shows tech availability
- Drag-and-drop scheduling (future enhancement)

**Workflow:**
1. Job appears automatically when customer accepts quote
2. Click job in list to select
3. Click date on calendar
4. Choose time slot
5. Assign technician
6. Click "Schedule Job" button
7. Confirmation dialog
8. AUTO-MOVE to Work > Scheduled Queue

**Filters:**
- Search: Customer name, address
- Amount Range
- Date Accepted: This Week, This Month, All Time
- Sort: Newest First, Oldest First, Amount High-Low

**Auto-Transitions:**
- Job Scheduled → Work > Scheduled Queue

---

### 4. Work > Scheduled Queue (`/work/scheduled`)

**Purpose:** Jobs with confirmed date/time, ready to work

**Data Source:** `quotes` table where `scheduled_at IS NOT NULL` AND `completed_at IS NULL`

**Card Display:**
```tsx
- Scheduled Date & Time (large, blue highlight)
- Customer Name (bold)
- Address (with map pin icon)
- Phone Number (clickable tel: link)
- Total Amount ($X,XXX.XX in orange)
- Technician Assigned (avatar + name)
- Job Description (truncated)
- Actions:
  ├─ View Job Details (eye icon)
  ├─ Reschedule (calendar icon)
  └─ Complete Job (primary button, green)
```

**Filters:**
- Search: Customer name, address, tech name
- Technician: Dropdown of all techs
- Date Range: Today, Tomorrow, This Week, This Month, Custom
- Sort: Soonest First, Latest First, Tech Name

**Complete Job Workflow:**
1. Click "Complete Job" button
2. Modal opens with:
   - Job summary
   - Customer signature capture (canvas)
   - OR SignNow option
   - Notes field (optional)
   - Checkbox: "Job completed successfully"
3. Click "Mark Complete"
4. Updates `completed_at` timestamp
5. Triggers invoice generation (future)
6. AUTO-MOVE to Pay > Invoice Queue

**Integration Points:**
- KEEP: SignNow signature capture
- KEEP: Fallback to simple acceptance
- NEW: Canvas signature option (future)

**Auto-Transitions:**
- Job Completed → Pay > Invoice Queue

---

### 5. Pay > Invoice Queue (`/pay/invoice`)

**Purpose:** Completed work awaiting payment

**Data Source:** `quotes` table where `completed_at IS NOT NULL` AND `paid_at IS NULL`

**Card Display:**
```tsx
- Invoice Number (same as Quote Number)
- Customer Name (bold)
- Address
- Completed Date
- Total Amount ($X,XXX.XX large, orange)
- Days Outstanding (badge: <7 green, 7-30 yellow, >30 red)
- Actions:
  ├─ View Job Details (eye icon)
  ├─ Send Invoice (primary button, orange) [STUB]
  └─ Mark as Paid (secondary button)
```

**Summary Banner:**
```tsx
<SummaryBanner>
  Total Outstanding: $XX,XXX.XX
  Number of Invoices: X
  Average Days Outstanding: X days
</SummaryBanner>
```

**Filters:**
- Search: Customer name, invoice number
- Amount Range
- Date Completed: This Week, This Month, All Time
- Days Outstanding: <7, 7-30, >30
- Sort: Newest First, Oldest First, Amount High-Low

**Send Invoice Workflow (STUB):**
```tsx
// Future implementation
1. Click "Send Invoice"
2. Modal shows:
   - Email to send to
   - Invoice PDF preview
   - Payment methods available (Email, Apple Pay, etc.)
   - Message to customer
3. Click "Send"
4. Future: Integrate with payment gateway
5. For now: Just shows "Invoice Sent" confirmation
```

**Mark as Paid Workflow:**
1. Click "Mark as Paid"
2. Confirmation modal:
   - Payment amount
   - Payment method (dropdown: Cash, Check, Card, Transfer, Other)
   - Payment date (defaults to today)
   - Reference/Notes field
3. Click "Confirm Payment"
4. Updates `paid_at` timestamp
5. Records payment details to audit log
6. AUTO-MOVE to Pay > Paid Queue

**Auto-Transitions:**
- Invoice Paid → Pay > Paid Queue

---

### 6. Pay > Paid Queue (`/pay/paid`)

**Purpose:** Archive of all paid jobs, revenue tracking

**Data Source:** `quotes` table where `paid_at IS NOT NULL`

**Card Display (Read-Only):**
```tsx
- Invoice Number
- Customer Name
- Completed Date
- Paid Date (green badge)
- Amount Paid ($X,XXX.XX in green)
- Payment Method (badge)
- Actions:
  └─ View Details (eye icon only)
```

**Summary Dashboard:**
```tsx
<RevenueDashboard>
  <StatCard>
    Total Revenue (All Time): $XXX,XXX.XX
  </StatCard>
  <StatCard>
    This Month: $XX,XXX.XX
  </StatCard>
  <StatCard>
    This Year: $XXX,XXX.XX
  </StatCard>
  <StatCard>
    Number of Jobs: X,XXX
  </StatCard>
</RevenueDashboard>

<RevenueChart>
  Monthly revenue bar chart (last 12 months)
</RevenueChart>
```

**Filters:**
- Search: Customer name, invoice number
- Amount Range
- Date Paid: This Month, This Year, All Time
- Payment Method: Cash, Check, Card, Transfer, Other
- Sort: Newest First, Oldest First, Amount High-Low

**Export Options (Future):**
- Download CSV
- Download PDF Report
- Send to Accounting Software (QuickBooks, Xero)

**Auto-Transitions:**
- None - this is the final state

---

## 🔄 Automatic Status Transitions

### Transition Flow Chart

```
NEW LEAD
   ↓ (Create Quote)
DRAFT QUOTE
   ↓ (Send to Customer)
SENT QUOTE
   ↓ (Customer Accepts/Signs)
TO BE SCHEDULED
   ↓ (Schedule Job)
SCHEDULED
   ↓ (Complete Job)
INVOICE
   ↓ (Mark as Paid)
PAID
```

### Database State Management

**Key Timestamps:**
```sql
-- Existing
sent_at          TIMESTAMP  -- When quote sent to customer
signed_at        TIMESTAMP  -- When customer signs via SignNow
accepted_at      TIMESTAMP  -- When customer accepts (instant)

-- Existing
scheduled_at     TIMESTAMP  -- When job scheduled
completed_at     TIMESTAMP  -- When job completed
paid_at          TIMESTAMP  -- When invoice paid

-- NEW - Add to migration
quote_visit_scheduled_at  TIMESTAMP  -- When quote visit scheduled (from Leads)
```

**Status Logic:**
```typescript
function getQueueLocation(quote: Quote): QueueLocation {
  // Paid - final state
  if (quote.paid_at) return 'pay/paid'
  
  // Completed but not paid
  if (quote.completed_at) return 'pay/invoice'
  
  // Scheduled but not completed
  if (quote.scheduled_at) return 'work/scheduled'
  
  // Accepted/Signed but not scheduled
  if (quote.accepted_at || quote.signed_at) return 'work/to-be-scheduled'
  
  // Sent or Draft quote
  if (quote.lead_status === 'quoted') return 'leads-and-quotes/quotes'
  
  // New lead
  return 'leads-and-quotes/leads'
}
```

### API Updates for Auto-Transitions

**1. Quote Acceptance Hook**
```typescript
// src/app/api/quotes/accept/route.ts
// EXISTING - Just add redirect logic

After updating accepted_at:
1. Update lead_status if needed
2. Return success with redirect: '/work/to-be-scheduled'
```

**2. Job Scheduling Hook**
```typescript
// src/app/api/quotes/[id]/schedule/route.ts
// EXISTING - Just add redirect logic

After updating scheduled_at:
1. Refresh quotes cache
2. Return success with redirect: '/work/scheduled'
```

**3. Job Completion Hook**
```typescript
// src/app/api/quotes/[id]/complete/route.ts
// EXISTING - Just add redirect logic

After updating completed_at:
1. Optionally generate invoice (future)
2. Return success with redirect: '/pay/invoice'
```

**4. Payment Hook**
```typescript
// src/app/api/quotes/[id]/mark-paid/route.ts
// EXISTING - Just add redirect logic

After updating paid_at:
1. Log payment details to audit trail
2. Return success with redirect: '/pay/paid'
```

---

## 🎯 Performance Optimizations

### Client-Side Filtering

**Goal:** Instant filtering without API calls

**Implementation:**
```typescript
// All queue pages use client-side filtering
const [searchTerm, setSearchTerm] = useState('')
const [filters, setFilters] = useState<Filters>({})

const filteredItems = useMemo(() => {
  return items.filter(item => {
    // Search filter
    if (searchTerm && !matchesSearch(item, searchTerm)) return false
    
    // Tech filter
    if (filters.tech && item.tech !== filters.tech) return false
    
    // Date filter
    if (filters.dateRange && !inDateRange(item, filters.dateRange)) return false
    
    // Status filter
    if (filters.status && item.status !== filters.status) return false
    
    return true
  })
}, [items, searchTerm, filters])
```

### Single Data Fetch

**Strategy:** Fetch all quotes once, filter in memory

```typescript
// Dashboard context (EXISTING - enhance)
const { quotes } = useDashboard() // Already fetches all quotes

// Each queue page filters from this data
const leadsQueueData = quotes.filter(q => isInLeadsQueue(q))
const quotesQueueData = quotes.filter(q => isInQuotesQueue(q))
// ... etc
```

### Count Badges

**Real-time counts in navigation:**
```typescript
const counts = useMemo(() => ({
  leads: quotes.filter(q => isInLeadsQueue(q)).length,
  quotes: quotes.filter(q => isInQuotesQueue(q)).length,
  toBeScheduled: quotes.filter(q => isInToBeScheduledQueue(q)).length,
  scheduled: quotes.filter(q => isInScheduledQueue(q)).length,
  invoice: quotes.filter(q => isInInvoiceQueue(q)).length,
  paid: quotes.filter(q => isInPaidQueue(q)).length,
}), [quotes])
```

---

## 🔐 Preserved Features

### All Existing Features MUST Remain Working

**✅ AI Quote Generation**
- Keep: `/api/ai/generate-quote`
- Keep: `/api/ai/update-quote`
- Keep: Groq integration
- Keep: Pricing catalog matching
- Keep: Auto-upsell suggestions
- Access: From Quotes Queue page

**✅ Tax Calculation**
- Keep: `/api/tax/calculate`
- Keep: Python backend state parsing
- Keep: All 50 states tax rates
- Keep: Address-based calculation
- Access: Automatic in quote editor

**✅ PDF Generation**
- Keep: `@react-pdf/renderer`
- Keep: PDF template design
- Keep: Logo, branding, colors
- Keep: Photo embedding
- Keep: Tiered pricing display
- Access: From quote editor, public viewer

**✅ Public Quote Viewer**
- Keep: `/q/[id]` route
- Keep: No-login access
- Keep: Mobile responsive design
- Keep: PDF download
- Keep: Accept & Sign button
- Keep: Status display
- Access: Via link from Quotes Queue

**✅ SignNow Integration**
- Keep: `/api/signnow/*` routes
- Keep: Document upload
- Keep: Signing URL generation
- Keep: Webhook handling
- Keep: Instant acceptance fallback
- Access: From public viewer

**✅ Quote Editor**
- Keep: `/quotes/new` page
- Keep: Line item editing
- Keep: Photo upload
- Keep: Notes/description
- Keep: AI assist for changes
- Access: From Quotes Queue

**✅ Team Management / RBAC**
- Keep: `/settings` pages
- Keep: Admin/Sales roles
- Keep: Row-level security
- Keep: Team member management
- Access: From Settings

**✅ Audit Trail**
- Keep: All audit logging
- Keep: `quote_audit_log` table
- Keep: Action tracking
- Keep: Audit viewer component
- Access: From job detail views

**✅ Pricing Catalog**
- Keep: Products table
- Keep: Bulk upload
- Keep: CSV import
- Access: From Settings

**✅ Photo Upload**
- Keep: Supabase storage
- Keep: Image optimization
- Keep: Multiple photos per quote
- Access: From quote editor

---

## 📱 Responsive Design

### Breakpoints

```scss
// Mobile: < 768px
- Bottom navigation visible
- Sidebar hidden
- Single column layouts
- Floating action button lower

// Tablet: 768px - 1024px
- Bottom navigation visible
- Sidebar optional (toggle)
- Two column layouts where appropriate
- Floating action button standard

// Desktop: > 1024px
- Bottom navigation hidden
- Sidebar always visible
- Multi-column layouts
- Floating action button standard
```

### Adaptive Layouts

**Queue Pages:**
- Mobile: Single column, cards stack
- Tablet: Two columns for cards
- Desktop: Grid layout (3 columns)

**Work > To be Scheduled:**
- Mobile: Stack list above calendar, tab between them
- Tablet: Side-by-side 50/50 split
- Desktop: 40% list, 60% calendar

**Navigation:**
- Mobile: Bottom bar (64px height)
- Desktop: Left sidebar (240px width)

---

## 🎨 Design System

### Colors

```scss
// Primary
--orange-primary: #FF6200;
--orange-hover: #E55800;
--orange-light: #FF8534;

// Status Colors
--status-draft: #6B7280;      // Gray
--status-sent: #3B82F6;       // Blue
--status-accepted: #10B981;   // Green
--status-scheduled: #3B82F6;  // Blue
--status-completed: #059669;  // Emerald
--status-paid: #10B981;       // Green
--status-overdue: #EF4444;    // Red

// Calendar Events
--event-quote-visit: #FF6200; // Orange
--event-scheduled-job: #10B981; // Green

// UI Elements
--background: #FFFFFF;
--background-secondary: #F9FAFB;
--border: #E5E7EB;
--text-primary: #111827;
--text-secondary: #6B7280;
```

### Typography

```scss
// Headers
--font-size-h1: 2rem;      // Queue page titles
--font-size-h2: 1.5rem;    // Section headers
--font-size-h3: 1.25rem;   // Card titles

// Body
--font-size-base: 1rem;    // Default text
--font-size-sm: 0.875rem;  // Secondary info
--font-size-xs: 0.75rem;   // Labels, badges

// Weights
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Spacing

```scss
// Consistent spacing scale
--space-xs: 0.25rem;   // 4px
--space-sm: 0.5rem;    // 8px
--space-md: 1rem;      // 16px
--space-lg: 1.5rem;    // 24px
--space-xl: 2rem;      // 32px
--space-2xl: 3rem;     // 48px
```

---

## 🛣️ Migration Strategy

### Phase 1: Foundation (Week 1)
- [ ] Create new navigation components
- [ ] Update dashboard layout
- [ ] Add floating action menu
- [ ] Set up new route structure
- [ ] Test navigation flow

### Phase 2: Leads & Quotes (Week 2)
- [ ] Build Leads queue page
- [ ] Build Quotes queue page
- [ ] Integrate existing quote creation
- [ ] Add schedule visit modal
- [ ] Test auto-transitions to Work

### Phase 3: Work (Week 3)
- [ ] Build To be Scheduled page
- [ ] Build shared calendar component
- [ ] Build Scheduled queue page
- [ ] Add complete job modal
- [ ] Test auto-transitions to Pay

### Phase 4: Pay (Week 4)
- [ ] Build Invoice queue page
- [ ] Build Paid queue page
- [ ] Add payment tracking
- [ ] Build revenue dashboard
- [ ] Test complete workflow end-to-end

### Phase 5: Polish (Week 5)
- [ ] Add search/filters to all pages
- [ ] Performance optimizations
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit
- [ ] User acceptance testing

---

## 🧪 Testing Plan

### Automated Tests
- [ ] Navigation component tests
- [ ] Queue filtering logic tests
- [ ] Auto-transition logic tests
- [ ] Calendar scheduling tests
- [ ] Payment workflow tests

### Manual Testing
- [ ] Complete workflow: Lead → Paid
- [ ] All existing features still work
- [ ] Mobile responsive on real devices
- [ ] Performance: load times < 1s
- [ ] Search/filter performance
- [ ] Calendar drag-and-drop

### User Acceptance
- [ ] Contractor walkthrough
- [ ] Sales rep testing
- [ ] Admin testing
- [ ] Customer public viewer testing

---

## 📊 Success Metrics

### Performance
- [ ] All queue pages load < 500ms
- [ ] Search filters respond < 100ms
- [ ] Navigation transitions smooth 60fps
- [ ] Calendar interactions < 200ms

### User Experience
- [ ] Contractor can find any job in < 5 clicks
- [ ] New user can navigate without training
- [ ] Mobile usage increases 50%
- [ ] Time to create quote < 2 minutes

### Business
- [ ] 100% feature parity with v1.0
- [ ] Zero data loss during migration
- [ ] No downtime during rollout
- [ ] User satisfaction > 4.5/5

---

## 🚀 Deployment Plan

### Rollout Strategy

**Phase 1: Beta (Internal)**
- Deploy to staging environment
- Internal testing with team
- Gather feedback
- Fix critical bugs

**Phase 2: Soft Launch**
- Deploy to 20% of users (feature flag)
- Monitor performance metrics
- Gather user feedback
- Iterate on UX issues

**Phase 3: Full Launch**
- Deploy to 100% of users
- Announce new design
- Provide user training materials
- Monitor for 2 weeks

**Phase 4: Cleanup**
- Remove old code paths
- Archive deprecated components
- Update documentation
- Performance tuning

### Rollback Plan

If critical issues arise:
1. Feature flag → revert to v1.0 navigation
2. Keep v2.0 routes available
3. Fix issues in hotfix branch
4. Redeploy when stable

---

## 📝 Documentation Updates Needed

### User Documentation
- [ ] Getting Started Guide (updated for new nav)
- [ ] Queue Workflows Guide
- [ ] Calendar Scheduling Guide
- [ ] Payment Tracking Guide
- [ ] Video Tutorials (screen recordings)

### Developer Documentation
- [ ] Architecture Diagrams
- [ ] Component API Reference
- [ ] State Management Guide
- [ ] Testing Guide
- [ ] Deployment Process

### Marketing Materials
- [ ] Feature Comparison (v1 vs v2)
- [ ] Benefits Overview
- [ ] Screenshots/GIFs
- [ ] Blog Post: "QuotePro 2.0 Launch"

---

## ✅ Checklist Before Launch

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.errors in production
- [ ] ESLint passing
- [ ] Prettier formatting consistent
- [ ] No unused imports/variables

### Performance
- [ ] Lighthouse score > 90
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] No memory leaks
- [ ] Database queries optimized

### Security
- [ ] RBAC still enforced
- [ ] No exposed API keys
- [ ] SQL injection protected
- [ ] XSS vulnerabilities fixed
- [ ] CORS configured correctly

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels correct
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

### Browser Compatibility
- [ ] Chrome (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android 11+)

---

## 🎯 End State

After full implementation, contractors will have:

1. **Dead Simple Navigation**
   - 3 categories, 2 queues each
   - Always know where to find things
   - Clear visual hierarchy

2. **Automatic Workflow**
   - Jobs move between queues automatically
   - No manual status updates
   - Clear progression path

3. **Unified Calendar**
   - One place to schedule everything
   - Quote visits and jobs together
   - Color-coded for clarity

4. **Instant Performance**
   - Client-side filtering
   - No loading spinners
   - Smooth transitions

5. **100% Feature Retention**
   - All AI capabilities
   - All integrations
   - All existing workflows
   - Nothing lost

**Result:** Contractors spend less time clicking, more time closing deals and completing work.

---

## 📞 Support

Questions during implementation:
- Technical Lead: Review this spec before coding
- Designer: Confirm colors/spacing match design system
- Product: Validate queue logic matches business needs
- QA: Use testing plan for comprehensive coverage

---

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** November 28, 2025  
**Next Step:** Begin Phase 1 - Foundation
