# Quote Address & Tax Recalculation Feature

## Overview
When editing an existing draft quote, changing the customer address will automatically recalculate the tax rate and update the quote totals in real-time.

## How It Works

### Automatic Tax Rate Updates
1. **User edits address** - When viewing a saved draft quote, the user can change the customer address
2. **Tax rate lookup** - System calls Python backend `/api/calculate-tax-rate` with new address
3. **Quote recalculation** - Subtotal stays same, but tax and total are recalculated with new rate
4. **Database update** - Quote is automatically saved with new address, tax rate, and total
5. **User notification** - Toast message shows updated tax rate

### Triggered By
- **Address suggestion selection** - User clicks on autocomplete suggestion
- **Manual address entry** - User types address and blurs the input field

### Requirements
- Quote must be saved (has `quoteId` or `savedQuoteId`)
- Quote must have line items (`generatedQuote` exists)
- New address must be provided
- Python backend must be running (for tax rate calculation)

## Technical Implementation

### New Function: `recalculateQuoteForAddress()`
```typescript
const recalculateQuoteForAddress = async (newAddress: string) => {
  if (!generatedQuote || !companyId || !newAddress) return

  try {
    // Get new tax rate from Python backend
    const response = await fetch('http://localhost:8001/api/calculate-tax-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        customer_address: newAddress,
      }),
    })

    const { tax_rate } = await response.json()
    
    // Recalculate totals
    const subtotal = generatedQuote.line_items.reduce((sum, item) => sum + item.total, 0)
    const total = subtotal + (subtotal * (tax_rate / 100))
    
    // Update state
    setGeneratedQuote({
      ...generatedQuote,
      tax_rate,
      subtotal,
      total,
    })

    // Update database
    await supabase
      .from('quotes')
      .update({
        customer_address: newAddress,
        tax_rate,
        total,
      })
      .eq('id', savedQuoteId || quoteId)

    toast.success(`Tax rate updated to ${tax_rate.toFixed(2)}%`)
  } catch (error) {
    console.error('Error recalculating quote:', error)
  }
}
```

### Integration Points

**1. Address Suggestion Click**
```typescript
onClick={async () => {
  const newAddress = suggestion.display_name
  setCustomerAddress(newAddress)
  setShowSuggestions(false)
  setAddressSuggestions([])
  
  // Recalculate quote if editing existing quote
  if (generatedQuote && (savedQuoteId || quoteId)) {
    await recalculateQuoteForAddress(newAddress)
  }
}}
```

**2. Address Input Blur**
```typescript
onBlur={async (e) => {
  setTimeout(async () => {
    setShowSuggestions(false)
    // Recalculate if editing existing quote
    if (generatedQuote && (savedQuoteId || quoteId) && e.target.value) {
      await recalculateQuoteForAddress(e.target.value)
    }
  }, 200) // Delay allows clicking suggestions
}}
```

## User Experience

### Before
1. User opens draft quote
2. Changes customer address from "123 Main St, CA" to "456 Oak Ave, TX"
3. Tax rate stays at old California rate (7.25%)
4. User has to manually save and refresh to see correct tax

### After
1. User opens draft quote
2. Changes customer address from "123 Main St, CA" to "456 Oak Ave, TX"
3. **Tax rate automatically updates** to Texas rate (8.25%)
4. **Total recalculates instantly**
5. **Quote auto-saves** to database
6. User sees toast: "Tax rate updated to 8.25%"

## Edge Cases Handled

### No Recalculation When
- Creating new quote (not saved yet) → Tax rate calculated during initial generation
- No address provided → Cannot calculate tax rate
- Quote has no items → Nothing to recalculate
- Python backend unavailable → Silent failure, logs error

### Preserves
- Line items (unchanged)
- Subtotal (unchanged)
- Item quantities and prices (unchanged)
- Only updates: tax_rate, total, customer_address

## Testing

### Manual Test Steps
1. Create and save a quote with a California address
2. Note the tax rate (should be ~7.25%)
3. Edit the draft quote
4. Change address to a Texas address
5. **Expected**: Toast shows "Tax rate updated to ~8.25%"
6. **Expected**: Total recalculates with new tax
7. Refresh page
8. **Expected**: New tax rate and total persist

### Test Scenarios
- ✅ Change address via autocomplete suggestion
- ✅ Change address by typing manually
- ✅ Change from high-tax state to low-tax state
- ✅ Change from low-tax state to high-tax state
- ✅ Backend unavailable (should fail gracefully)
- ✅ Empty address (should not trigger recalculation)

## Benefits

1. **Real-time accuracy** - Tax rates always match current address
2. **User convenience** - No manual recalculation needed
3. **Compliance** - Ensures correct tax for job location
4. **Transparency** - User sees immediate feedback
5. **State management** - Quote state stays synchronized with UI

## Dependencies

- Python backend: `/api/calculate-tax-rate` endpoint
- Supabase: `quotes` table with `tax_rate`, `total`, `customer_address` columns
- React state: `generatedQuote`, `savedQuoteId`, `quoteId`, `companyId`

## Future Enhancements

- [ ] Add loading spinner during recalculation
- [ ] Show old vs new tax rate in toast
- [ ] Log address changes to audit trail
- [ ] Batch updates if multiple fields change
- [ ] Debounce manual typing for better performance
- [ ] Cache tax rates by ZIP code for instant lookup
