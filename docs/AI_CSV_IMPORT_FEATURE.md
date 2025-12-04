# AI-Powered CSV Import for Products & Services

## Overview
Smart CSV import system that uses Google Gemini AI to automatically map user's CSV columns to database schema. Users can upload any CSV format (QuickBooks, ServiceTitan, Excel exports, etc.) and the system will intelligently figure out the mapping.

## Features

### ✨ AI Column Mapping
- Upload any CSV with any column names
- Gemini 2.0 Flash analyzes headers and sample data
- Automatically suggests best column mappings
- Provides confidence scores for each mapping
- Detects product vs service based on context

### 🎯 Interactive Mapping UI
- Shows AI-suggested mappings in clean table
- Left column: Database fields (name, price, category, etc.)
- Right column: User's CSV columns (dropdown to adjust)
- Displays sample values from CSV
- Confidence badges (95% confident, etc.)
- Highlights required vs optional fields

### 📊 Smart Validation
- Flags unmapped columns (will be ignored)
- Warns about missing required fields
- Shows preview of first 3 rows
- Row count display
- Error handling with detailed messages

### 🔄 Upload Modes
1. **Append** (default) - Add new items, keep existing
2. **Replace** - Delete all existing, start fresh (with warning)

## Database Schema

```typescript
interface CatalogItem {
  name: string          // REQUIRED - Product/service name
  type: 'product' | 'service'  // REQUIRED - Item type
  unit_price: number    // REQUIRED - Price in dollars
  category?: string     // Optional - Department/category
  description?: string  // Optional - Detailed description
  unit?: string        // Optional - hour, each, sq ft, etc.
  sku?: string         // Optional - Stock keeping unit
  cost?: number        // Optional - Cost for margin calc
  company_id: uuid     // Auto-added
  is_active: boolean   // Auto-set to true
}
```

## User Flow

```
1. User uploads CSV
   ↓
2. AI analyzes columns and data
   ↓
3. Shows mapping table:
   ┌──────────────────┬────────────────────┐
   │ Database Field   │ Your CSV Column    │
   ├──────────────────┼────────────────────┤
   │ Name (required)  │ [Product Name ▼]   │
   │ Price (required) │ [Unit Price   ▼]   │
   │ Category         │ [Department   ▼]   │
   └──────────────────┴────────────────────┘
   ↓
4. User adjusts mappings if needed
   ↓
5. Click "Import X Items"
   ↓
6. Items inserted into database
```

## API Endpoints

### POST /api/catalog/analyze-csv
**Step 1: Analyze uploaded CSV**

Request:
```
Content-Type: multipart/form-data
file: <CSV file>
```

Response:
```json
{
  "mappings": [
    {
      "csv_column": "Product Name",
      "db_field": "name",
      "confidence": 0.95,
      "sample_values": ["Widget", "Service Call", "Part #123"]
    }
  ],
  "unmapped_columns": ["Internal Code", "Vendor"],
  "missing_required_fields": [],
  "row_count": 150,
  "preview_rows": [...]
}
```

### POST /api/catalog/import-with-mapping
**Step 2: Import with confirmed mapping**

Request:
```
Content-Type: multipart/form-data
file: <CSV file>
mapping: {
  "mappings": {
    "Product Name": "name",
    "Unit Price": "unit_price",
    "Type": "type"
  },
  "upload_mode": "append"
}
```

Response:
```json
{
  "success": true,
  "imported_count": 148,
  "error_count": 2,
  "errors": [
    "Row 5: Missing price",
    "Row 23: Invalid price format"
  ],
  "items": [...]
}
```

## AI Prompt Strategy

The system sends Gemini:
1. **Database schema** - Field names, types, descriptions, examples
2. **CSV headers** - Actual column names from uploaded file
3. **Sample data** - First 3-5 rows for context
4. **Task instructions** - Map columns, detect type, flag issues

AI returns structured JSON with:
- Column mappings with confidence scores
- Product vs service detection
- Unmapped columns
- Missing required fields

Fallback: If AI fails, uses heuristic pattern matching on column names.

## Files Created

### Backend
- `python-backend/routers/catalog_import.py` - FastAPI endpoints
- Updated `python-backend/main.py` - Route registration

### Frontend
- `src/components/features/settings/SmartCSVImport.tsx` - React component

## Integration

In settings page, add:
```tsx
import { SmartCSVImport } from '@/components/features/settings/SmartCSVImport'

<SmartCSVImport
  companyId={company.id}
  onImportComplete={() => {
    // Refresh catalog items
  }}
/>
```

## Example CSV Formats Supported

**QuickBooks Export:**
```csv
Item,Description,Price,Type
Widget A,Standard widget,29.99,Service
Part B,Replacement part,15.00,Non-inventory Part
```

**ServiceTitan:**
```csv
Service Name,Business Unit,Sold Price,Sold Price Unit
Plumbing - Hourly,Plumbing,150.00,Hour
Pipe Repair,Plumbing,300.00,Job
```

**Excel/Custom:**
```csv
Product Name,Category,Unit Cost,Retail Price,UOM
Widget Pro,Hardware,10.00,25.00,Each
Labor - Electrical,Services,85.00,150.00,Hour
```

All formats work - AI figures out the mapping!

## Next Steps

1. ✅ Backend API created
2. ✅ React component created
3. ⏭️ Add to settings page
4. ⏭️ Test with real CSV files
5. ⏭️ Add import history/logs (optional)
6. ⏭️ Add duplicate detection (optional)
7. ⏭️ Add batch edit after import (optional)

## Benefits

✅ **No template required** - Any CSV works
✅ **Time saver** - No manual column mapping
✅ **Smart** - Learns from data patterns
✅ **User-friendly** - Visual mapping review
✅ **Flexible** - Override AI suggestions
✅ **Safe** - Preview before import
✅ **Fast** - Bulk import in seconds
