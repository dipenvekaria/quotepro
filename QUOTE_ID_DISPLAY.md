# Quote ID Display - Added to Edit Quote Page

## ✅ What Was Added

The quote ID is now displayed in **two places** when editing an existing quote:

### 1. Mobile Header (Always Visible)
```
┌────────────────────────────────────────────┐
│ [☰] [🔧] Edit Quote – John Smith          │
│            Quote ID: abc123-def456-789     │
└────────────────────────────────────────────┘
```

**Location**: Sticky header at top of page  
**Visibility**: Always visible while scrolling  
**Style**: Small, gray text below the main title

### 2. Customer Information Card
```
┌───────────────────────────────────────────────┐
│ Customer Information    [ID: abc123-d...]     │
├───────────────────────────────────────────────┤
│                                               │
│ Customer Name *                               │
│ [John Smith                                ]  │
│                                               │
│ ...                                           │
└───────────────────────────────────────────────┘
```

**Location**: Top-right of Customer Information card  
**Visibility**: When scrolled to customer section  
**Style**: Monospace font in bordered box (shows first 8 chars + ...)

## 📱 Visual Examples

### Desktop View
```
Header:
┌─────────────────────────────────────────────────────────┐
│ [☰] [🔧] Edit Quote – John Smith                       │
│            Quote ID: a1b2c3d4-e5f6-7890-abcd-123456789  │
└─────────────────────────────────────────────────────────┘

Customer Card:
┌─────────────────────────────────────────────────────────┐
│ Customer Information              [ID: a1b2c3d4...]     │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Customer Name *                                         │
│ [John Smith                                          ]  │
│                                                         │
│ Phone               Email                               │
│ [(555) 123-4567]   [john@example.com                 ]  │
│                                                         │
│ Job Address                                             │
│ [123 Main St, City, State 12345                      ]  │
└─────────────────────────────────────────────────────────┘
```

### Mobile View
```
Header (Sticky):
┌──────────────────────────┐
│ [☰] [🔧]                 │
│ Edit Quote – John        │
│ Quote ID: a1b2c3d4...    │
└──────────────────────────┘

Customer Card:
┌──────────────────────────┐
│ Customer Information     │
│ [ID: a1b2c3d4...]        │
│ ──────────────────────── │
│                          │
│ Customer Name *          │
│ [John Smith           ]  │
│                          │
│ Phone                    │
│ [(555) 123-4567       ]  │
│                          │
│ Email                    │
│ [john@example.com     ]  │
└──────────────────────────┘
```

## 🎯 When It Appears

**Shows Quote ID when**:
- ✅ Editing an existing quote (URL: `/quotes/new?id={quote_id}`)
- ✅ Loading a quote from dashboard
- ✅ Updating a saved quote

**Does NOT show when**:
- Creating a brand new quote (no ID yet)
- Quote hasn't been saved to database

## 🎨 Styling Details

### Header ID Display
- **Color**: `text-gray-400` (subtle, not distracting)
- **Size**: `text-xs` (small)
- **Truncation**: Full ID shown, truncates if too long

### Card ID Display  
- **Font**: Monospace (`font-mono`)
- **Background**: `bg-gray-100 dark:bg-gray-800`
- **Padding**: `px-3 py-1`
- **Border**: Thin border for definition
- **Format**: Shows first 8 characters + "..." (e.g., `a1b2c3d4...`)

## 💡 Use Cases

### For Users:
- 🔍 **Easy reference** when talking to customers
- 📋 **Copy/paste** for support tickets
- 🔗 **Share quote link** `/q/{quote_id}`
- 📊 **Track in analytics** or external systems

### For Support/Debugging:
- 🐛 Quick ID for database queries
- 📞 Reference when customer calls
- 📧 Include in email support
- 🔎 Search in audit logs

## 🔧 Technical Details

**Files Modified**: 1
- `/src/app/quotes/new/page.tsx`

**Lines Changed**: ~15 lines

**Changes Made**:
1. Added quote ID display below header title (line ~852)
2. Added quote ID badge in Customer Info card header (line ~874)

**Code Added**:

```tsx
// In header (line ~852)
{quoteId && (
  <p className="text-xs text-gray-400 truncate mt-1">
    Quote ID: {quoteId}
  </p>
)}

// In card header (line ~874)
{quoteId && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded border">
      ID: {quoteId.slice(0, 8)}...
    </span>
  </div>
)}
```

## 📋 Example Full IDs

Quote IDs are UUIDs that look like:
```
a1b2c3d4-e5f6-7890-abcd-1234567890ab
```

Displayed as:
- **Header**: Full ID
- **Card**: `a1b2c3d4...` (truncated)

## ✨ Benefits

✅ **Easy to spot** - Two locations ensure visibility
✅ **Copy-friendly** - Full ID in header can be selected/copied
✅ **Professional** - Monospace font looks technical and official
✅ **Non-intrusive** - Subtle gray color doesn't distract
✅ **Mobile-optimized** - Works on small screens
✅ **Dark mode ready** - Adapts to dark theme

## 🧪 Test It

1. **Open an existing quote**:
   ```
   http://localhost:3000/quotes/new?id={quote_id}
   ```

2. **Check header** - Should see full quote ID

3. **Scroll to Customer Info card** - Should see truncated ID badge

4. **Create a new quote** - Should NOT see ID (until saved)

5. **Save the new quote** - ID should appear after save

---

**The quote ID is now prominently displayed when editing quotes!** 🎉
