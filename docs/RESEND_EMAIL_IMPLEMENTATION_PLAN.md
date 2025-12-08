# Complete Resend Email System Implementation Plan

**Created:** December 8, 2025  
**Status:** Ready to Implement  
**Goal:** Professional transactional emails from custom domain with beautiful branded templates

---

## Overview
Full email system using Resend for transactional emails with beautiful branded templates, domain integration, and automatic triggers.

**Already Complete:**
- ✅ Resend account created
- ✅ API key added to .env.local and python-backend/.env as `RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX`

---

## Phase 1: Installation & Setup (5 minutes)

### Frontend (Next.js)
```bash
cd /Users/dipen/code/quotepro
npm install resend react-email @react-email/components
```

### Backend (Python/FastAPI)
```bash
cd /Users/dipen/code/quotepro/python-backend
source venv/bin/activate
pip install resend
pip freeze > requirements.txt
```

---

## Phase 2: Shared Email Utilities (10 minutes)

### File: `src/lib/email/resend-client.ts`
**Purpose:** Shared Resend client configuration
- Initialize Resend with API key from env
- Export typed client for type safety
- Add retry logic for failed sends

### File: `src/lib/email/email-sender.ts`
**Purpose:** Universal email sending function
```typescript
interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

async function sendEmail(options: EmailOptions)
```
- Handles errors gracefully
- Logs all sends to console (dev) and Supabase (prod)
- Returns success/failure with message ID

### File: `python-backend/services/email_service.py`
**Purpose:** Python equivalent for backend emails
```python
class EmailService:
    def __init__(self):
        self.resend = Resend(api_key=os.getenv("RESEND_API_KEY"))
    
    async def send_email(
        self,
        to: Union[str, List[str]],
        subject: str,
        html: str,
        from_email: str = "Field Genie <hello@fieldgenie.app>",
        reply_to: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> dict
```

---

## Phase 3: React Email Templates (30 minutes)

### Directory Structure:
```
src/emails/
├── components/
│   ├── EmailLayout.tsx          # Shared layout wrapper
│   ├── EmailHeader.tsx          # Logo + brand colors
│   ├── EmailFooter.tsx          # Unsubscribe + contact
│   └── EmailButton.tsx          # Branded CTA button
├── QuoteSentEmail.tsx           # Template 1
├── InvoiceReadyEmail.tsx        # Template 2
├── JobAssignedEmail.tsx         # Template 3
└── SupportAlertEmail.tsx        # Template 4
```

### Template 1: `QuoteSentEmail.tsx`
**Props:**
```typescript
interface QuoteSentEmailProps {
  customerName: string
  quoteNumber: string
  total: string
  publicLink: string          // /quotes/public/[id]
  pdfUrl: string             // Generated PDF URL
  validUntil: string
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
}
```
**Design:**
- Hero: "Your Quote is Ready!"
- Customer name personalization
- Line items table with blue header
- Total amount highlighted (large, bold)
- Big blue "Accept & Pay" button → public link
- PDF download link
- Valid until date
- Footer: Unsubscribe, company address, contact

### Template 2: `InvoiceReadyEmail.tsx`
**Props:**
```typescript
interface InvoiceReadyEmailProps {
  customerName: string
  invoiceNumber: string
  total: string
  dueDate: string
  stripePaymentLink: string
  pdfUrl: string
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
}
```
**Design:**
- Hero: "Invoice #[NUMBER] - Payment Due"
- Due date with urgency indicator if < 3 days
- Line items table
- Total with tax breakdown
- Primary CTA: "Pay Now" → Stripe link
- Secondary: Download PDF
- Payment terms reminder

### Template 3: `JobAssignedEmail.tsx`
**Props:**
```typescript
interface JobAssignedEmailProps {
  technicianName: string
  customerName: string
  address: string
  scheduledDate: string
  scheduledTime: string
  jobType: string
  notes: string
  contactPhone: string
  jobId: string
}
```
**Design:**
- Hero: "New Job Assigned"
- Calendar icon with date/time
- Customer details card:
  - Name
  - Address (with Google Maps link)
  - Phone (clickable tel: link)
- Job details:
  - Type/category
  - Special notes highlighted
- CTA: "View Job Details" → app link
- Emergency contact info

### Template 4: `SupportAlertEmail.tsx`
**Props:**
```typescript
interface SupportAlertEmailProps {
  errorType: string
  errorMessage: string
  stackTrace: string
  timestamp: string
  userId?: string
  companyId?: string
  endpoint: string
  requestData?: any
}
```
**Design:**
- Red urgent banner
- Error type as title
- Timestamp
- User/company context
- Code block for stack trace
- Request details
- CTA: "View in Sentry" (if integrated)

---

## Phase 4: Email Components (15 minutes)

### `EmailLayout.tsx`
```tsx
- Responsive container (600px max width)
- Background: #f3f4f6
- Inner card: white, rounded corners
- Typography: Inter font stack
- Mobile-first media queries
```

### `EmailHeader.tsx`
```tsx
- Field Genie logo (base64 embedded or hosted)
- Blue gradient background (#3b82f6 → #1e40af)
- Company name + tagline
- Height: 120px
```

### `EmailFooter.tsx`
```tsx
- Resend unsubscribe link (required)
- Company address
- Contact: hello@fieldgenie.app
- Social links (optional)
- Copyright year (dynamic)
```

### `EmailButton.tsx`
```tsx
- Blue background (#3b82f6)
- White text, bold
- Padding: 16px 32px
- Border radius: 8px
- Hover state (darker blue)
- Mobile tap-friendly (min 44px height)
```

---

## Phase 5: Backend Email Triggers (20 minutes)

### File: `python-backend/services/quote_email_service.py`
```python
class QuoteEmailService:
    async def send_quote_email(
        self,
        quote_id: str,
        customer_email: str,
        office_email: str
    ):
        # 1. Fetch quote from Supabase
        # 2. Generate PDF using existing logic
        # 3. Upload PDF to Supabase Storage
        # 4. Get public URL for PDF
        # 5. Generate public quote link
        # 6. Render React Email template to HTML
        # 7. Send to customer
        # 8. Send copy to office
        # 9. Log sends in database
```

### File: `python-backend/services/invoice_email_service.py`
```python
class InvoiceEmailService:
    async def send_invoice_email(
        self,
        job_id: str,
        customer_email: str
    ):
        # 1. Generate invoice from completed job
        # 2. Create Stripe payment link
        # 3. Generate PDF
        # 4. Send email with both
        # 5. Update job status to "invoiced"
```

### File: `python-backend/services/job_notification_service.py`
```python
class JobNotificationService:
    async def send_job_assignment(
        self,
        job_id: str,
        technician_email: str
    ):
        # 1. Fetch job + customer details
        # 2. Render template
        # 3. Send to technician
        # 4. Log notification
```

---

## Phase 6: Frontend API Routes (15 minutes)

### File: `src/app/api/emails/send-quote/route.ts`
```typescript
POST /api/emails/send-quote
Body: { quoteId: string }
1. Verify user is authenticated
2. Fetch quote from Supabase
3. Check permissions (owner/office/sales)
4. Render QuoteSentEmail template
5. Send via Resend
6. Return { success, messageId }
```

### File: `src/app/api/emails/send-invoice/route.ts`
```typescript
POST /api/emails/send-invoice
Body: { jobId: string }
1. Verify auth
2. Fetch completed job
3. Generate invoice data
4. Create Stripe payment link
5. Render InvoiceReadyEmail
6. Send to customer
7. Update job.invoice_sent_at
```

### File: `src/app/api/emails/notify-technician/route.ts`
```typescript
POST /api/emails/notify-technician
Body: { jobId: string, technicianId: string }
1. Verify auth (owner/office only)
2. Fetch job + technician email
3. Render JobAssignedEmail
4. Send notification
5. Update job.notification_sent_at
```

---

## Phase 7: Error Monitoring Integration (10 minutes)

### File: `python-backend/middleware/error_handler.py`
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # 1. Log error to console
    # 2. Extract stack trace
    # 3. Send SupportAlertEmail to owner
    # 4. Return 500 response
```

### File: `src/app/error.tsx` (Next.js)
```typescript
// Global error boundary
export default function Error({ error, reset }) {
  // Send error email via API route
  // Show user-friendly message
}
```

---

## Phase 8: UI Integration (15 minutes)

### Update: `src/app/(dashboard)/quotes/[id]/page.tsx`
**Add "Send Quote" button:**
```typescript
const handleSendQuote = async () => {
  setIsSending(true)
  try {
    const response = await fetch('/api/emails/send-quote', {
      method: 'POST',
      body: JSON.stringify({ quoteId: quote.id })
    })
    if (response.ok) {
      toast.success('Quote sent to customer!')
    }
  } catch (error) {
    toast.error('Failed to send quote')
  } finally {
    setIsSending(false)
  }
}
```

### Update: `src/app/(dashboard)/work/page.tsx`
**Auto-send invoice on job completion:**
```typescript
const handleCompleteJob = async (jobId: string) => {
  // 1. Mark job as complete
  // 2. Auto-trigger invoice email
  await fetch('/api/emails/send-invoice', {
    method: 'POST',
    body: JSON.stringify({ jobId })
  })
}
```

### Update: `src/app/(dashboard)/calendar/page.tsx`
**Auto-notify on assignment:**
```typescript
const handleAssignTechnician = async (jobId: string, techId: string) => {
  // 1. Update job assignment
  // 2. Auto-send notification
  await fetch('/api/emails/notify-technician', {
    method: 'POST',
    body: JSON.stringify({ jobId, technicianId: techId })
  })
}
```

---

## Phase 9: Domain Setup (Namecheap → Resend) (20 minutes)

### Step 1: Resend Dashboard
1. Go to resend.com/domains
2. Click "Add Domain"
3. Enter: `fieldgenie.app` (or your actual domain)
4. Resend will show DNS records needed:
   - TXT record for verification
   - CNAME records for DKIM
   - MX record (optional)

### Step 2: Namecheap DNS
1. Login to Namecheap
2. Go to Domain List → Manage → Advanced DNS
3. Add these records (exact values from Resend):

```
Type: TXT
Host: @
Value: resend-verification=XXXXXXXXXXXXX
TTL: Automatic

Type: CNAME
Host: resend._domainkey
Target: resend._domainkey.resend.com
TTL: Automatic

Type: CNAME
Host: resend2._domainkey
Target: resend2._domainkey.resend.com
TTL: Automatic
```

### Step 3: Verify in Resend
1. Wait 5-10 minutes for DNS propagation
2. Click "Verify Domain" in Resend dashboard
3. Status should change to "Verified" ✅

### Step 4: Update Email Sender
**Change from:**
```typescript
from: "Field Genie <onboarding@resend.dev>"
```
**To:**
```typescript
from: "Field Genie <hello@fieldgenie.app>"
```

---

## Phase 10: Testing & Validation (15 minutes)

### Test Checklist:
```
□ Quote email sends successfully
□ PDF attachment works
□ Public link is accessible (no auth required)
□ Invoice email with Stripe link works
□ Job assignment email to technician
□ Error alert emails arrive
□ All emails render correctly on:
  □ Gmail (desktop)
  □ Gmail (mobile)
  □ Apple Mail
  □ Outlook
□ Unsubscribe link works
□ Click tracking works in Resend dashboard
□ Domain verification complete (emails from @fieldgenie.app)
```

### Test Commands:
```typescript
// Send test quote email
POST /api/emails/send-quote
{ "quoteId": "test-quote-id" }

// Send test invoice
POST /api/emails/send-invoice
{ "jobId": "test-job-id" }

// Trigger error alert
throw new Error("Test error for email notification")
```

---

## Phase 11: Database Logging (10 minutes)

### File: `supabase/migrations/20251208_email_logs.sql`
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  template_type TEXT NOT NULL, -- 'quote', 'invoice', 'job', 'alert'
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'bounced', 'opened', 'clicked'
  error_message TEXT,
  metadata JSONB, -- quote_id, job_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_company ON email_logs(company_id);
CREATE INDEX idx_email_logs_created ON email_logs(created_at DESC);
```

**Log every email send:**
```typescript
await supabase.from('email_logs').insert({
  company_id: user.companyId,
  template_type: 'quote',
  recipient_email: customer.email,
  subject: `Quote #${quote.number}`,
  resend_message_id: result.id,
  status: 'sent',
  metadata: { quote_id: quote.id }
})
```

---

## File Structure Summary

```
quotepro/
├── src/
│   ├── lib/
│   │   └── email/
│   │       ├── resend-client.ts       [NEW]
│   │       └── email-sender.ts        [NEW]
│   ├── emails/
│   │   ├── components/
│   │   │   ├── EmailLayout.tsx        [NEW]
│   │   │   ├── EmailHeader.tsx        [NEW]
│   │   │   ├── EmailFooter.tsx        [NEW]
│   │   │   └── EmailButton.tsx        [NEW]
│   │   ├── QuoteSentEmail.tsx         [NEW]
│   │   ├── InvoiceReadyEmail.tsx      [NEW]
│   │   ├── JobAssignedEmail.tsx       [NEW]
│   │   └── SupportAlertEmail.tsx      [NEW]
│   └── app/
│       └── api/
│           └── emails/
│               ├── send-quote/
│               │   └── route.ts        [NEW]
│               ├── send-invoice/
│               │   └── route.ts        [NEW]
│               └── notify-technician/
│                   └── route.ts        [NEW]
│
├── python-backend/
│   └── services/
│       ├── email_service.py            [NEW]
│       ├── quote_email_service.py      [NEW]
│       ├── invoice_email_service.py    [NEW]
│       └── job_notification_service.py [NEW]
│
└── supabase/
    └── migrations/
        └── 20251208_email_logs.sql     [NEW]
```

---

## Implementation Order (Step-by-Step)

1. **Install packages** (frontend + backend)
2. **Create shared utilities** (resend-client.ts, email_service.py)
3. **Build email components** (Layout, Header, Footer, Button)
4. **Create Template 1** (QuoteSentEmail.tsx) + test
5. **Add frontend API route** (/api/emails/send-quote)
6. **Integrate "Send Quote" button** in quotes page
7. **Test quote email end-to-end**
8. **Create Template 2** (InvoiceReadyEmail.tsx)
9. **Add invoice API route** + auto-trigger on completion
10. **Create Template 3** (JobAssignedEmail.tsx)
11. **Add job notification API route** + auto-trigger on assignment
12. **Create Template 4** (SupportAlertEmail.tsx)
13. **Add error handler middleware**
14. **Domain setup** (Namecheap DNS → Resend verification)
15. **Create email_logs table**
16. **Add logging to all sends**
17. **Full testing** (all templates, all devices)

---

## Environment Variables Needed

```bash
# .env.local (frontend)
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_APP_URL=https://fieldgenie.app

# python-backend/.env
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX
APP_URL=https://fieldgenie.app
OWNER_EMAIL=your-email@example.com
```

---

## Success Metrics

- ✅ All 4 email templates render beautifully
- ✅ Emails come from hello@fieldgenie.app (custom domain)
- ✅ Quote sending works with one button click
- ✅ Invoices auto-send on job completion
- ✅ Technicians get notified automatically
- ✅ Errors alert you immediately
- ✅ 100% mobile-responsive
- ✅ Open/click tracking works
- ✅ All sends logged to database

---

## Notes

- Use Gemini models only (per .github/copilot-instructions.md)
- Keep code concise (no verbose comments)
- Test each template individually before integration
- Domain verification may take 5-10 minutes for DNS propagation
- Start with Quote email (highest priority for customer communication)

---

**Status:** Plan complete, ready to implement
**Next Step:** Run Phase 1 installations, then build shared utilities
