# Job Type Display Added - Dec 2025

## Changes Made

### 1. Lead/Quote Detail Page Header ✅
**Location:** `/leads/new` and `/quotes/new`  
**Display:** Subtitle below "Edit Lead" or "Edit Quote"  
**Shows:** `job_type` (e.g., "Deck Repair", "Fence Installation")  
**Fallback:** If no job_type, shows customer name

### 2. Lead Cards (Desktop) ✅
**Location:** `/leads-and-quotes/leads`  
**Display:** Second line under customer name  
**Priority:** `job_type` → `description` → `address` → `email`  
**Example:** Shows "Deck Repair" instead of full description

### 3. Quote Cards (Desktop) ✅
**Location:** `/leads-and-quotes/quotes`  
**Display:** Second line under customer name  
**Priority:** `job_type` → `description` → `address` → `email`  
**Example:** Shows "Pool Installation" instead of full description

### 4. Lead Cards (Mobile) ✅
**Location:** Mobile view of leads list  
**Display:** Second row with Wrench icon 🔧  
**Color:** Blue text with icon  
**Example:** "🔧 Deck Repair"

### 5. Quote Cards (Mobile) ✅
**Location:** Mobile view of quotes list  
**Display:** Additional info row with Wrench icon 🔧  
**Color:** Blue text with icon  
**Position:** Shows before phone and address

## Visual Changes

### Desktop Cards:
```
┌─────────────────────────────────────┐
│ John Smith                          │
│ Deck Repair  ← job_type shown here │
│ 🟦 New Lead • 🕒 2 hours ago       │
└─────────────────────────────────────┘
```

### Mobile Cards:
```
┌─────────────────────────────────────┐
│ John Smith 🟦 New Lead              │
│ 📞 555-1234 ✉ john@email.com       │
│ 🔧 Deck Repair ← NEW                │
│ 📅 Visit: Dec 3 • Added 2h ago     │
└─────────────────────────────────────┘
```

### Detail Page Header:
```
🔧 Edit Lead
Deck Repair  ← job_type shown here
```

## Files Modified

- `src/app/(dashboard)/leads/new/page.tsx` - Already showing job_type in header
- `src/components/leads-and-quotes.tsx` - Added job_type to all card views:
  * LeadRow component (desktop)
  * QuoteRow component (desktop)
  * MobileLeadCard component (mobile)
  * MobileQuoteCard component (mobile)
  * Added Wrench icon import

## Benefits

1. **Quick Identification** - See job type at a glance
2. **Better Organization** - Sort/filter by job type easier
3. **Professional** - Shows AI-generated category instead of raw description
4. **Consistent** - Same display across all views (header, cards, mobile)

## AI Job Type Generation

Job types are generated when saving a lead:
- Uses `/api/generate-job-name` endpoint
- 2-second timeout (non-blocking)
- Examples: "Deck Repair", "Fence Installation", "Pool Maintenance"
- Falls back gracefully if AI times out

## Next Steps (Optional)

- Add job_type filter dropdown to lead/quote tabs
- Color-code different job types with badges
- Group leads by job_type in calendar view
