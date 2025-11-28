# Discount Feature Documentation

## Overview
The quote system now supports discount line items, allowing you to add partial or full discounts (up to 100%) on services and materials. Discounts appear as separate line items with negative amounts.

## How It Works

### 1. AI-Generated Discounts
The AI can automatically detect discount requests in your job description and generate discount line items. Just mention phrases like:
- "no charge for labor"
- "10% off materials"
- "free trip charge"
- "50% senior discount"
- "100% discount on inspection"

**Example:**
```
Job: Install new thermostat. No charge for labor, customer is a family friend.
```

The AI will generate:
- Install thermostat materials: $150
- Discount: No charge for labor: -$100
- **Subtotal: $50**

### 2. Manual Discount Entry
You can manually add discounts using the "Add Item" button:

1. Click "+ Add Item"
2. Check the "This is a discount" checkbox
3. Enter the discount name (e.g., "Discount: 10% off labor")
4. Enter a **negative** amount (e.g., -100)
5. Click "Add Item"

**Important:** Discount amounts must be negative numbers (e.g., -100, not 100)

### 3. Editing Existing Items as Discounts
You can convert any line item to a discount:

1. Click the edit button on a line item
2. Check the "This is a discount" checkbox
3. The price will automatically convert to negative if needed
4. Save the changes

## Visual Indicators

Discount line items are displayed with:
- 💰 Money bag emoji prefix
- Green background (light mode) or dark green background (dark mode)
- Green text for item name and total
- Green border

Example:
```
Regular Item:      ⚙️ Labor - 4 hours × $75.00 = $300.00
Discount Item:     💰 Discount: No charge for labor - 1 × -$300.00 = -$300.00
```

## Calculations

The system properly handles negative amounts in calculations:

1. **Subtotal** = Sum of all line items (including negative discounts)
2. **Tax** = Subtotal × Tax Rate (based on reduced subtotal)
3. **Total** = Subtotal + Tax

**Example:**
```
Materials:              $500.00
Labor (4 hrs):          $300.00
Discount: 10% off:     -$80.00
────────────────────────────────
Subtotal:              $720.00
Tax (8.5%):            $61.20
Total:                 $781.20
```

## Validation Rules

- Discount items **must** have negative unit_price
- Regular items **cannot** have negative prices
- If you enter a negative price, you must check the discount checkbox
- Discounts can be up to 100% (completely free)
- The system validates and shows helpful error messages

## Use Cases

### Senior Citizen Discount (10%)
```
Item: Senior discount (10%)
Quantity: 1
Unit Price: -$50.00
```

### No Charge for Friend/Family
```
Item: Discount: No charge for labor
Quantity: 1
Unit Price: -$300.00
```

### Promotional Discount
```
Item: Discount: New customer promotion
Quantity: 1
Unit Price: -$100.00
```

### Free Service Call
```
Item: Discount: Free inspection
Quantity: 1
Unit Price: -$75.00
```

## Backend Implementation

The Python backend AI prompt includes comprehensive discount handling:
- Detects discount keywords in job descriptions
- Formats discount items with "Discount: " prefix
- Uses negative numbers for unit_price and total
- Includes discount examples in AI training

## Frontend Implementation

### QuoteItem Interface
```typescript
interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  option_tier?: string | null
  is_upsell?: boolean
  is_discount?: boolean  // New field
}
```

### Validation Logic
```typescript
// Discount items must have negative prices
if (newItem.is_discount && newItem.unit_price > 0) {
  toast.error('Discount amounts must be negative (e.g., -100)')
  return
}

// Regular items cannot have negative prices
if (!newItem.is_discount && newItem.unit_price < 0) {
  toast.error('Regular items cannot have negative prices. Check "Discount" checkbox for discounts.')
  return
}
```

### Visual Styling
```tsx
<div className={`${
  item.is_discount || item.unit_price < 0 
    ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' 
    : 'bg-gray-50 dark:bg-gray-800'
}`}>
  <div className={`font-semibold ${
    item.is_discount || item.unit_price < 0 
      ? 'text-green-700 dark:text-green-400' 
      : ''
  }`}>
    {item.is_discount || item.unit_price < 0 ? '💰 ' : ''}{item.name}
  </div>
</div>
```

## Testing Checklist

- [x] AI generates discounts from natural language
- [x] Manual discount entry with checkbox
- [x] Edit existing items as discounts
- [x] Negative price validation
- [x] Visual styling (green background, green text, emoji)
- [x] Subtotal calculation with negative amounts
- [x] Tax calculation on reduced subtotal
- [x] Total calculation accuracy
- [x] Audit log tracking for discount items
- [x] Quote saving with discount line items
- [x] PDF generation with discounts (to be tested)

## Future Enhancements

Potential improvements:
- Preset discount buttons (10%, 25%, 50%, 100%)
- Auto-calculate discount from percentage
- Show discount percentage next to amount
- "Apply to all items" bulk discount
- Discount reason tracking for reporting
- Discount approval workflow for large amounts
