# PHASE 3: FRONTEND MODERNIZATION - TECH SPEC

**Status:** 📋 Planning  
**Duration:** 3 weeks  
**Risk Level:** 🟡 MEDIUM (Large refactor, visual regression testing needed)  
**Dependencies:** Phase 2 complete  

---

## 📋 OBJECTIVE

Refactor frontend from monolithic components into modern, maintainable architecture. Extract 2,263-line `/leads/new/page.tsx` into composable components with proper state management, form handling, and API layer.

**Key Goals:**
1. Break monolithic page into feature-based components
2. Implement TanStack Query for server state
3. Add React Hook Form for form management
4. Create API service layer (no scattered fetch calls)
5. Add proper TypeScript types (remove @ts-nocheck)
6. Maintain exact UI/UX and theme (#FF6200 orange)

---

## 🎯 SUCCESS CRITERIA

- ✅ UI looks identical (pixel-perfect)
- ✅ Theme unchanged (#FF6200 orange, shadcn/ui)
- ✅ All features working (quote gen, AI updates, PDF, sending)
- ✅ No performance regression (faster is better)
- ✅ TypeScript errors = 0
- ✅ Component sizes <300 lines
- ✅ Test coverage >70%

---

## 📁 NEW FOLDER STRUCTURE

```
/src/
├── app/
│   └── (dashboard)/
│       ├── leads/
│       │   └── new/
│       │       └── page.tsx           # 50 lines (orchestrator only)
│       ├── work/
│       │   └── page.tsx               # Already good
│       └── pay/
│           └── page.tsx               # Already good
├── components/
│   ├── ui/                            # shadcn/ui components (keep as-is)
│   ├── navigation/                    # Existing navigation (keep)
│   ├── queues/                        # Existing queue cards (keep)
│   └── features/                      # NEW: Feature-specific components
│       ├── leads/
│       │   ├── LeadForm.tsx           # Customer info form
│       │   ├── LeadHeader.tsx         # Title, status, actions
│       │   └── LeadStatusBadge.tsx    # Status display
│       ├── quotes/
│       │   ├── QuoteEditor/
│       │   │   ├── index.tsx          # Main editor orchestrator
│       │   │   ├── QuoteHeader.tsx    # Quote number, job name, actions
│       │   │   ├── AIAssistant.tsx    # AI chat interface
│       │   │   ├── ItemsTable.tsx     # Line items table
│       │   │   ├── ItemRow.tsx        # Single line item
│       │   │   ├── AddItemForm.tsx    # Add new item
│       │   │   ├── PricingSummary.tsx # Subtotal, tax, total, discount
│       │   │   ├── NotesSection.tsx   # Internal notes
│       │   │   └── ActionButtons.tsx  # Save, Send, PDF buttons
│       │   ├── QuoteViewer.tsx        # Read-only quote display
│       │   └── QuotePDF.tsx           # PDF generation (keep existing)
│       ├── customers/
│       │   ├── CustomerSearch.tsx     # Search/select customer
│       │   ├── CustomerCard.tsx       # Display customer info
│       │   └── NewCustomerModal.tsx   # Create new customer
│       └── shared/
│           ├── LoadingSpinner.tsx     # Consistent loading states
│           ├── ErrorAlert.tsx         # Error display
│           └── ConfirmDialog.tsx      # Confirmation modals
├── lib/
│   ├── api/                           # NEW: API service layer
│   │   ├── client.ts                  # Base API client (fetch wrapper)
│   │   ├── quotes.ts                  # Quote API calls
│   │   ├── leads.ts                   # Lead API calls
│   │   ├── customers.ts               # Customer API calls
│   │   ├── jobs.ts                    # Job API calls
│   │   └── invoices.ts                # Invoice API calls
│   ├── hooks/                         # NEW: Custom hooks
│   │   ├── useQuotes.ts               # TanStack Query hooks for quotes
│   │   ├── useLeads.ts                # Lead data hooks
│   │   ├── useCustomers.ts            # Customer data hooks
│   │   ├── useAI.ts                   # AI generation hooks
│   │   └── useDebounce.ts             # Utility hooks
│   ├── schemas/                       # NEW: Zod validation schemas
│   │   ├── lead.ts                    # Lead form schema
│   │   ├── quote.ts                   # Quote schema
│   │   └── customer.ts                # Customer schema
│   ├── utils/
│   │   ├── formatting.ts              # Number/currency formatting
│   │   ├── validation.ts              # Custom validators
│   │   └── quote-calculations.ts      # Quote math (subtotal, tax, total)
│   ├── dashboard-context.tsx          # Keep (global state)
│   └── types.ts                       # Shared TypeScript types
└── types/
    ├── database.ts                    # Generated Supabase types
    └── api.ts                         # API request/response types
```

---

## 🔧 KEY REFACTORINGS

### **1. Extract Monolithic Page**

**BEFORE:** `/leads/new/page.tsx` (2,263 lines)

```tsx
// 30+ useState hooks
const [customerName, setCustomerName] = useState("");
const [description, setDescription] = useState("");
const [items, setItems] = useState([]);
// ... 27 more states

// 1000+ lines of logic
const handleGenerateQuote = async () => {
  // 200 lines of fetch logic
};

// Massive JSX
return (
  <div>
    {/* 500 lines of form fields */}
    {/* 300 lines of items table */}
    {/* 200 lines of AI chat */}
  </div>
);
```

**AFTER:** Clean orchestrator (50 lines)

```tsx
// /app/(dashboard)/leads/new/page.tsx
'use client';

import { QuoteEditor } from '@/components/features/quotes/QuoteEditor';
import { LeadHeader } from '@/components/features/leads/LeadHeader';
import { useQuote } from '@/lib/hooks/useQuotes';

export default function NewLeadPage() {
  const { quote, isLoading, error } = useQuote();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;
  
  return (
    <div className="container mx-auto p-6">
      <LeadHeader />
      <QuoteEditor quote={quote} />
    </div>
  );
}
```

### **2. API Service Layer**

**BEFORE:** Scattered fetch calls

```tsx
// In component (repeated 20+ times)
const handleSave = async () => {
  try {
    const response = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed');
    const result = await response.json();
    // ... manual state updates
  } catch (error) {
    console.error(error);
  }
};
```

**AFTER:** Centralized API service

```typescript
// /lib/api/quotes.ts
import { apiClient } from './client';
import type { Quote, QuoteCreateInput, QuoteUpdateInput } from '@/types/api';

export const quotesApi = {
  /**
   * Generate new quote with AI
   */
  async generate(data: QuoteCreateInput): Promise<Quote> {
    return apiClient.post('/api/generate-quote', data);
  },
  
  /**
   * Update quote with AI conversation
   */
  async updateWithAI(data: QuoteUpdateInput): Promise<Quote> {
    return apiClient.post('/api/update-quote-with-ai', data);
  },
  
  /**
   * Get single quote
   */
  async getById(id: string): Promise<Quote> {
    return apiClient.get(`/api/quotes/${id}`);
  },
  
  /**
   * Update quote fields
   */
  async update(id: string, data: Partial<Quote>): Promise<Quote> {
    return apiClient.patch(`/api/quotes/${id}`, data);
  },
  
  /**
   * Send quote to customer
   */
  async send(id: string): Promise<{ success: boolean }> {
    return apiClient.post(`/api/quotes/${id}/send`);
  },
  
  /**
   * Generate PDF
   */
  async generatePDF(id: string): Promise<{ pdf_url: string }> {
    return apiClient.post(`/api/quotes/${id}/pdf`);
  }
};

// /lib/api/client.ts
class APIClient {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
  }
  
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
```

### **3. TanStack Query Hooks**

**BEFORE:** Manual state management

```tsx
const [quotes, setQuotes] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const data = await fetch('/api/quotes').then(r => r.json());
      setQuotes(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };
  fetchQuotes();
}, []);
```

**AFTER:** TanStack Query hook

```typescript
// /lib/hooks/useQuotes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesApi } from '@/lib/api/quotes';
import type { Quote, QuoteCreateInput } from '@/types/api';

/**
 * Get all quotes for company
 */
export function useQuotes(companyId: string) {
  return useQuery({
    queryKey: ['quotes', companyId],
    queryFn: () => quotesApi.getAll(companyId),
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get single quote by ID
 */
export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => quotesApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Generate new quote with AI
 */
export function useGenerateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: QuoteCreateInput) => quotesApi.generate(data),
    onSuccess: (newQuote) => {
      // Invalidate quotes list to refetch
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
      // Optimistically add new quote to cache
      queryClient.setQueryData(['quotes', newQuote.id], newQuote);
    },
  });
}

/**
 * Update quote with AI
 */
export function useUpdateQuoteWithAI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      quotesApi.updateWithAI(data),
    onSuccess: (updatedQuote, { id }) => {
      // Update cache
      queryClient.setQueryData(['quotes', id], updatedQuote);
    },
  });
}

/**
 * Send quote to customer
 */
export function useSendQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => quotesApi.send(id),
    onSuccess: (_, id) => {
      // Refetch quote to get updated status
      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    },
  });
}
```

**USAGE:**

```tsx
// In component
import { useQuote, useUpdateQuoteWithAI } from '@/lib/hooks/useQuotes';

function QuoteEditor({ quoteId }: { quoteId: string }) {
  const { data: quote, isLoading, error } = useQuote(quoteId);
  const updateMutation = useUpdateQuoteWithAI();
  
  const handleAIUpdate = (prompt: string) => {
    updateMutation.mutate({
      id: quoteId,
      data: { user_prompt: prompt, existing_items: quote.items }
    });
  };
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;
  
  return (
    <div>
      {/* Editor UI */}
      <AIAssistant 
        onSubmit={handleAIUpdate} 
        isLoading={updateMutation.isPending} 
      />
    </div>
  );
}
```

### **4. React Hook Form**

**BEFORE:** Manual form state

```tsx
const [customerName, setCustomerName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [errors, setErrors] = useState({});

const handleSubmit = () => {
  // Manual validation
  const newErrors = {};
  if (!customerName) newErrors.name = "Required";
  if (!email.includes('@')) newErrors.email = "Invalid";
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  // Submit
};
```

**AFTER:** React Hook Form + Zod

```typescript
// /lib/schemas/lead.ts
import { z } from 'zod';

export const leadFormSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\d{10}$/, 'Must be 10 digits').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
```

```tsx
// /components/features/leads/LeadForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leadFormSchema, type LeadFormData } from '@/lib/schemas/lead';

export function LeadForm({ onSubmit }: { onSubmit: (data: LeadFormData) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      urgency: 'medium'
    }
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="customerName">Customer Name</Label>
        <Input
          id="customerName"
          {...register('customerName')}
          className={errors.customerName ? 'border-red-500' : ''}
        />
        {errors.customerName && (
          <p className="text-sm text-red-500">{errors.customerName.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Lead'}
      </Button>
    </form>
  );
}
```

### **5. Component Extraction Example**

**QuoteEditor Index (Orchestrator)**

```tsx
// /components/features/quotes/QuoteEditor/index.tsx
'use client';

import { useState } from 'react';
import { QuoteHeader } from './QuoteHeader';
import { AIAssistant } from './AIAssistant';
import { ItemsTable } from './ItemsTable';
import { PricingSummary } from './PricingSummary';
import { NotesSection } from './NotesSection';
import { ActionButtons } from './ActionButtons';
import { useQuote, useUpdateQuoteWithAI } from '@/lib/hooks/useQuotes';
import type { Quote } from '@/types/api';

interface QuoteEditorProps {
  quoteId?: string;
  initialData?: Partial<Quote>;
}

export function QuoteEditor({ quoteId, initialData }: QuoteEditorProps) {
  const { data: quote, isLoading } = useQuote(quoteId);
  const updateMutation = useUpdateQuoteWithAI();
  
  const [items, setItems] = useState(quote?.items || initialData?.items || []);
  const [notes, setNotes] = useState(quote?.notes || '');
  
  const handleAIUpdate = (prompt: string) => {
    updateMutation.mutate({
      id: quoteId,
      data: {
        user_prompt: prompt,
        existing_items: items,
        customer_name: quote.customer_name
      }
    }, {
      onSuccess: (updatedQuote) => {
        setItems(updatedQuote.items);
      }
    });
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="space-y-6">
      <QuoteHeader
        jobName={quote?.job_name}
        quoteNumber={quote?.quote_number}
        status={quote?.status}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ItemsTable
            items={items}
            onChange={setItems}
            isEditable={quote?.status === 'draft'}
          />
          
          <PricingSummary
            items={items}
            taxRate={quote?.tax_rate || 8.5}
            discount={quote?.discount_amount || 0}
          />
          
          <NotesSection
            notes={notes}
            onChange={setNotes}
          />
        </div>
        
        <div className="lg:col-span-1">
          <AIAssistant
            onSubmit={handleAIUpdate}
            isLoading={updateMutation.isPending}
          />
        </div>
      </div>
      
      <ActionButtons
        quoteId={quoteId}
        canSave={quote?.status === 'draft'}
      />
    </div>
  );
}
```

---

## 🎨 THEME PRESERVATION

### **Guarantee No Visual Changes**

1. **Keep shadcn/ui components as-is** - Don't modify `/components/ui/*`
2. **Preserve all Tailwind classes** - Copy exact className strings
3. **Maintain color palette** - #FF6200 orange primary
4. **Keep spacing/layout** - Same padding, margins, gaps
5. **Visual regression testing** - Screenshot comparison before/after

### **Example: Preserve Exact Styling**

```tsx
// BEFORE (monolithic file)
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-foreground">Quote Items</h2>
  {/* ... */}
</div>

// AFTER (extracted component) - EXACT SAME CLASSES
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-foreground">Quote Items</h2>
  {/* ... */}
</div>
```

---

## ✅ TESTING STRATEGY

### **Visual Regression Testing**

```typescript
// tests/visual/quote-editor.spec.ts
import { test, expect } from '@playwright/test';

test('quote editor looks identical', async ({ page }) => {
  await page.goto('/leads/new');
  
  // Take screenshot
  await expect(page).toHaveScreenshot('quote-editor.png', {
    fullPage: true,
    threshold: 0.01, // 1% tolerance
  });
});
```

### **Component Unit Tests**

```typescript
// tests/components/QuoteEditor/ItemsTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemsTable } from '@/components/features/quotes/QuoteEditor/ItemsTable';

describe('ItemsTable', () => {
  it('renders all items', () => {
    const items = [
      { id: '1', name: 'Item 1', quantity: 1, unit_price: 100, total: 100 }
    ];
    
    render(<ItemsTable items={items} onChange={() => {}} isEditable />);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });
  
  it('allows editing quantity', () => {
    const onChange = jest.fn();
    render(<ItemsTable items={[...]} onChange={onChange} isEditable />);
    
    const quantityInput = screen.getByRole('spinbutton');
    fireEvent.change(quantityInput, { target: { value: '5' } });
    
    expect(onChange).toHaveBeenCalled();
  });
});
```

### **Integration Tests**

```typescript
// tests/integration/quote-generation.spec.ts
import { test, expect } from '@playwright/test';

test('full quote generation flow', async ({ page }) => {
  await page.goto('/leads/new');
  
  // Fill form
  await page.fill('[name="customerName"]', 'Test Customer');
  await page.fill('[name="description"]', 'Install new HVAC system');
  
  // Generate quote with AI
  await page.click('text=Generate with AI');
  
  // Wait for AI response
  await page.waitForSelector('table >> text=HVAC', { timeout: 10000 });
  
  // Verify items appear
  expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);
  
  // Verify total calculated
  const total = await page.textContent('[data-testid="quote-total"]');
  expect(total).toMatch(/\$\d+\.\d{2}/);
});
```

---

## 📊 SUCCESS METRICS

- ✅ `/leads/new/page.tsx` reduced from 2,263 → <100 lines
- ✅ Largest component <300 lines
- ✅ TypeScript errors = 0
- ✅ Test coverage >70%
- ✅ Visual regression tests pass
- ✅ Lighthouse performance score >90
- ✅ Bundle size reduced by 20%

---

## ⏱️ ESTIMATED TIME

- **API Service Layer:** 2 days
- **TanStack Query Hooks:** 2 days
- **Component Extraction:** 5 days
- **React Hook Form Migration:** 2 days
- **TypeScript Types:** 2 days
- **Testing:** 3 days
- **Visual Regression:** 2 days
- **Documentation:** 1 day
- **Total:** ~3 weeks

---

## 🔄 MIGRATION APPROACH

### **Phase 3A: Foundation (Week 1)**
- Create API service layer
- Set up TanStack Query
- Create TypeScript types
- No UI changes yet

### **Phase 3B: Component Extraction (Week 2)**
- Extract one section at a time (Items → AI → Pricing → Notes)
- Keep old code in place temporarily
- A/B test new vs old components
- Visual regression testing

### **Phase 3C: Form Migration (Week 3)**
- Migrate to React Hook Form
- Add Zod validation
- Remove old state management
- Delete old monolithic code

---

## 🔜 NEXT STEPS

After Phase 3:
- **Phase 4:** Data migration (populate new tables)
- **Phase 5:** Deprecate old schema entirely

---

**Ready to proceed with Phase 3 implementation?**
