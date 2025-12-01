# AI Enhancement Panels - Integration Guide

## Components Created

### 1. QuoteOptimizerPanel
**Location:** `src/components/ai/quote-optimizer-panel.tsx`

**Features:**
- Win probability calculation (0-100%)
- Price position badges (Aggressive, Competitive, Moderate, Premium)
- Pricing recommendations with suggested totals
- AI-powered strategic insights from Gemini
- Market data summary (won/lost quotes, averages)
- Margin analysis with industry benchmarks
- Similar quotes comparison

**Usage:**
```tsx
import { QuoteOptimizerPanel } from '@/components/ai'

<QuoteOptimizerPanel
  companyId={company.id}
  jobDescription="HVAC system replacement"
  proposedTotal={8500}
  lineItems={[
    { name: "Unit", quantity: 1, unit_price: 6000, total: 6000 },
    { name: "Labor", quantity: 8, unit_price: 150, total: 1200 }
  ]}
  customerAddress="123 Main St, CA"
  onApplySuggestion={(suggestedTotal) => {
    // Update quote total
  }}
/>
```

### 2. UpsellSuggestionsPanel
**Location:** `src/components/ai/upsell-suggestions-panel.tsx`

**Features:**
- Pattern-based suggestions from won quotes
- AI-powered contextual recommendations
- Item selection with checkboxes
- Potential revenue increase calculation
- Confidence scoring (high/medium/low)
- Frequency percentages
- Market insights (average won quote, upside potential)
- Bulk add selected items

**Usage:**
```tsx
import { UpsellSuggestionsPanel } from '@/components/ai'

<UpsellSuggestionsPanel
  companyId={company.id}
  jobDescription="Water heater installation"
  currentItems={[
    { name: "Tankless heater", quantity: 1, unit_price: 1800, total: 1800 },
    { name: "Installation", quantity: 1, unit_price: 500, total: 500 }
  ]}
  currentTotal={2300}
  customerAddress="456 Oak Ave, CA"
  onAddItems={(items) => {
    // Add items to quote
    items.forEach(item => addLineItem(item))
  }}
/>
```

## Integration Points

### Quote Creation Flow (NEW LEADS)
**Location:** `src/app/(dashboard)/leads/new/page.tsx`

Add panels in Step 3 (after AI generates initial quote):

```tsx
// After quote is generated
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
  <QuoteOptimizerPanel
    companyId={company.id}
    jobDescription={jobDescription}
    proposedTotal={calculateTotal(lineItems)}
    lineItems={lineItems}
    customerAddress={customerAddress}
    onApplySuggestion={(total) => {
      // Adjust quote total or line items
    }}
  />
  
  <UpsellSuggestionsPanel
    companyId={company.id}
    jobDescription={jobDescription}
    currentItems={lineItems}
    currentTotal={calculateTotal(lineItems)}
    customerAddress={customerAddress}
    onAddItems={(items) => {
      setLineItems([...lineItems, ...items])
    }}
  />
</div>
```

### Quote Editor (EXISTING QUOTES)
**Location:** Quote edit modal or dedicated edit page

Same integration pattern - add panels below line items editor.

## Visual Indicators

### AI-Enhanced Badge
Add to quotes that used AI suggestions:

```tsx
{quote.used_ai_suggestions && (
  <Badge className="bg-purple-100 text-purple-700">
    <Sparkles className="h-3 w-3 mr-1" />
    AI-Enhanced
  </Badge>
)}
```

### Quick Stats
Show AI impact in dashboard:

```tsx
<Card>
  <CardHeader>
    <CardTitle>AI Impact</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-purple-600">
      {aiStats.avgWinProbability}%
    </div>
    <p className="text-sm text-muted-foreground">
      Average win probability
    </p>
  </CardContent>
</Card>
```

## API Endpoints Used

Both panels call the Python backend:

- **POST /api/optimize-quote** - Quote optimizer analysis
- **POST /api/suggest-upsells** - Upsell recommendations

Ensure Python backend is running on port 8000.

## Styling

Both panels use:
- Purple theme for optimizer (matches AI branding)
- Blue theme for upsells (suggests growth)
- Gradient backgrounds for visual appeal
- Responsive design (mobile-friendly)
- Loading states with spinners
- Toast notifications for feedback

## Next Steps

1. ✅ Components built
2. ⏳ Integrate into leads/new page
3. ⏳ Add AI-Enhanced badges
4. ⏳ Track AI usage in analytics
5. ⏳ Build AI analytics dashboard (Day 8)
