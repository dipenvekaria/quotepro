# Address-Based Tax Calculation Feature

## Overview
QuotePro now automatically calculates the correct sales tax rate based on the customer's address! No more manually updating tax rates for different states.

## How It Works

1. **Customer Address Input**: When creating a quote, enter the customer's full address
2. **State Detection**: The system automatically extracts the state from the address
3. **Tax Rate Lookup**: Uses the correct state sales tax rate from our comprehensive database
4. **Automatic Calculation**: Tax is calculated and applied to the quote

## Examples

```
Austin, TX → 6.25% tax
Los Angeles, CA → 7.25% tax  
Miami, FL → 6.0% tax
Portland, OR → 0% tax (no sales tax)
New York, NY → 4.0% tax
```

## Supported Formats

The system recognizes various address formats:

- ✅ `123 Main St, Austin, TX 78701`
- ✅ `456 Oak Ave, Los Angeles, California 90001`
- ✅ `789 Pine Rd, Miami FL 33101`
- ✅ `New York, NY`
- ✅ `Portland, Oregon`

## Tax Rates Database

We maintain accurate tax rates for all 50 US states:

### States with NO Sales Tax
- Alaska (AK)
- Delaware (DE)
- Montana (MT)
- New Hampshire (NH)
- Oregon (OR)

### Highest Tax Rates
- California: 7.25%
- Tennessee: 7.0%
- Mississippi: 7.0%
- Rhode Island: 7.0%
- Indiana: 7.0%

### Lowest Tax Rates (excluding 0%)
- Colorado: 2.9%
- Alabama: 4.0%
- Georgia: 4.0%
- Hawaii: 4.0%
- Wyoming: 4.0%

## Fallback Behavior

- If no address is provided → Uses company's default tax rate
- If state cannot be detected → Uses company's default tax rate (typically 8.5%)
- If address is outside the US → Uses company's default tax rate

## Technical Implementation

### Backend (Python)
```python
from tax_rates import get_tax_rate_for_address

# Automatically determines tax rate
tax_rate = get_tax_rate_for_address(customer_address, default_rate=8.5)
```

### Frontend (TypeScript)
```typescript
// Address is sent to backend for tax calculation
const response = await fetch('/api/generate-quote', {
  body: JSON.stringify({
    customer_address: customerAddress,
    // ... other fields
  }),
})
```

## Files Modified

1. **`python-backend/tax_rates.py`** - Tax rates database and extraction logic
2. **`python-backend/main.py`** - Updated to use address-based tax calculation
3. **`src/app/quotes/new/page.tsx`** - Sends address to backend

## Testing

Run the test suite to verify tax calculation:

```bash
cd python-backend
./venv/bin/python test_tax_rates.py
```

All tests should pass with ✅ marks.

## Future Enhancements

- [ ] Add county/city tax rates for more precise calculations
- [ ] Support international tax systems (VAT, GST)
- [ ] Real-time tax rate updates via API
- [ ] Tax exemption handling for specific industries

## Notes

⚠️ **Important**: These are base state tax rates. Some localities have additional county or city taxes. For the most accurate calculations, consider integrating with a tax API service like TaxJar or Avalara.

📅 **Last Updated**: November 2024

---

**Built with ❤️ for contractors who hate manual tax calculations**
