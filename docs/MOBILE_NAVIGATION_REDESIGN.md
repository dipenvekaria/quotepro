# Mobile Navigation Redesign

## Summary

Redesigned the mobile navigation to be more intuitive and properly oriented for mobile-first usage.

## Changes Made

### 1. **Bottom Navigation Bar** (Mobile)
**File**: `/src/components/navigation/mobile-bottom-nav.tsx`

**Before**:
- 4 items: "Leads & Quotes", "Work", "Pay", "Settings"
- Text was small and could be unclear

**After**:
- Cleaner labels: "Leads", "Work", "Pay", "Settings"
- Larger icons (6x6 instead of 5x5)
- Better touch targets (flex-1, max-w-[100px])
- Better visual feedback with active:bg-gray-100
- Improved spacing and typography

### 2. **Mobile Section Tabs** (New Component)
**File**: `/src/components/navigation/mobile-section-tabs.tsx`

A new reusable component for section-level tabs on mobile:
- Sticky at top of page
- Shows active state with bottom border
- Displays counts in badges
- Clean tab switching between related pages
- Touch-optimized

**Usage**:
```tsx
<MobileSectionTabs 
  tabs={[
    { label: 'Leads', href: '/leads-and-quotes/leads', count: 5 },
    { label: 'Quotes', href: '/leads-and-quotes/quotes', count: 3 }
  ]}
/>
```

### 3. **Leads Page** (Mobile Optimized)
**File**: `/src/app/(dashboard)/leads-and-quotes/leads/page.tsx`

**Mobile Changes**:
- ✅ Added mobile tabs at top (Leads/Quotes toggle)
- ✅ Compact mobile header with count and "New" button
- ✅ Desktop header hidden on mobile
- ✅ Reduced padding (px-4 instead of px-6 on mobile)
- ✅ Added pb-20 to account for bottom nav bar
- ✅ Shows quote count in tab badge

**Desktop**: No changes - full header with description

### 4. **Quotes Page** (Mobile Optimized)
**File**: `/src/app/(dashboard)/leads-and-quotes/quotes/page.tsx`

**Mobile Changes**:
- ✅ Added mobile tabs at top (Leads/Quotes toggle)
- ✅ Compact mobile header with count and "New" button
- ✅ Desktop header hidden on mobile
- ✅ Reduced padding (px-4 instead of px-6 on mobile)
- ✅ Added pb-20 to account for bottom nav bar
- ✅ Shows lead count in tab badge

**Desktop**: No changes - full header with description

## Mobile Navigation Structure

```
┌─────────────────────────────────────┐
│  [Leads]  [Quotes]                  │ ← Mobile Section Tabs (sticky)
├─────────────────────────────────────┤
│  Leads              [+ New]         │ ← Mobile Header (compact)
│  5 total                            │
├─────────────────────────────────────┤
│                                     │
│  [Search...]          [Status ▼]   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Lead Card 1                 │   │
│  │ Customer Name               │   │
│  │ Address                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Lead Card 2                 │   │
│  └─────────────────────────────┘   │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [Leads] [Work] [Pay] [Settings]    │ ← Bottom Nav Bar (fixed)
└─────────────────────────────────────┘
```

## User Flow

### Bottom Navigation (Primary Categories)
1. **Leads** → `/leads-and-quotes/leads` (shows Leads/Quotes tabs)
2. **Work** → `/work/to-be-scheduled` (will show Work tabs when built)
3. **Pay** → `/pay/invoice` (will show Pay tabs when built)
4. **Settings** → `/settings`

### Section Tabs (Secondary Navigation)
When user taps "Leads" in bottom nav:
1. Lands on **Leads** tab (default)
2. Can swipe/tap to **Quotes** tab
3. Both tabs show counts in badges
4. Active tab has orange text + bottom border

## Mobile-First Improvements

### Touch Targets
- Bottom nav items: `flex-1 max-w-[100px]` for equal distribution
- Tab buttons: Full width with `py-3 px-4` for easy tapping
- Mobile header buttons: `size="sm"` for compact but tappable

### Visual Hierarchy
- **Bottom Bar**: Main categories (Leads, Work, Pay, Settings)
- **Top Tabs**: Sub-sections within category (Leads/Quotes)
- **Mobile Header**: Page title + quick action
- **Filters**: Search + status filters

### Spacing
- Mobile padding: `px-4 py-4` (more compact)
- Desktop padding: `px-6 py-6` (spacious)
- Bottom padding: `pb-20` on pages to account for fixed bottom nav

### Typography
- Bottom nav labels: `text-[11px]` (small but readable)
- Tab labels: `text-sm` (standard)
- Mobile header title: `text-lg font-semibold`
- Mobile header subtitle: `text-xs text-gray-500`

## Responsive Behavior

### Mobile (< 768px)
- Bottom navigation: **Visible** (fixed bottom)
- Mobile tabs: **Visible** (sticky top)
- Mobile header: **Visible** (compact)
- Desktop header: **Hidden**

### Desktop (≥ 768px)
- Bottom navigation: **Hidden** (`md:hidden`)
- Mobile tabs: **Hidden** (`md:hidden`)
- Mobile header: **Hidden** (`md:hidden`)
- Desktop header: **Visible** (full QueueHeader)
- Desktop sidebar: **Visible** (left side)

## Future Enhancements

### Work Section
When building Work pages, add similar tabs:
```tsx
<MobileSectionTabs 
  tabs={[
    { label: 'To Schedule', href: '/work/to-be-scheduled', count: 8 },
    { label: 'Scheduled', href: '/work/scheduled', count: 12 }
  ]}
/>
```

### Pay Section
When building Pay pages, add similar tabs:
```tsx
<MobileSectionTabs 
  tabs={[
    { label: 'Invoice', href: '/pay/invoice', count: 5 },
    { label: 'Paid', href: '/pay/paid', count: 47 }
  ]}
/>
```

### Settings Section
Settings likely won't need tabs (single page)

## Benefits

1. ✅ **Clearer Navigation**: Category in bottom bar, tabs at top
2. ✅ **Better Space Usage**: Compact mobile headers, full desktop headers
3. ✅ **Visual Feedback**: Count badges show items in each section
4. ✅ **Touch Optimized**: Larger tap targets, better spacing
5. ✅ **Consistent Pattern**: Same tab pattern across all sections
6. ✅ **Orientation Fixed**: No more confusion about where things are

## Technical Notes

### Z-Index Layering
- Desktop sidebar: `z-50`
- Mobile bottom nav: `z-50`
- Mobile section tabs: `z-40` (below bottom nav)
- Desktop header: `z-10`

### Safe Areas
Bottom nav includes `safe-area-inset-bottom` for iPhone notch/home indicator

### Backdrop Blur
Both bottom nav and desktop header use `backdrop-blur-lg` for modern glass effect

### Active States
- Bottom nav: Orange background + orange text
- Section tabs: Orange text + bottom border indicator
- Both use same orange colors for consistency (`orange-600 dark:orange-400`)
