# Bulk Pricing Upload Feature

## 📋 Overview

The bulk upload feature allows you to quickly import large numbers of pricing items into QuotePro using CSV or Excel files. This is ideal for:

- **Initial setup**: Import your entire pricing catalog at once
- **Updates**: Replace all prices with updated catalog
- **Expansion**: Add new items to existing catalog
- **Migration**: Import from other systems or spreadsheets

---

## 🚀 Quick Start

### 1. Download a Template
- Go to **Settings → Products & Services**
- Click **"Download CSV Template"** or **"Download Excel Template"**
- Template includes 5 sample items to show the format

### 2. Fill Out the Template
- Open the template in Excel, Google Sheets, or any spreadsheet app
- Add your pricing items (see format requirements below)
- Save the file

### 3. Upload Your File
- Choose upload mode:
  - **Replace All**: Deletes existing items, uploads new ones
  - **Add to Existing**: Keeps current items, adds new ones
- Click "Select File" and choose your CSV/Excel file
- Click "Upload" button
- Done! Your pricing catalog is updated

---

## 📊 File Format Requirements

### Required Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `name` | Text | Item/service name | "AC System Tune-up" |
| `price` | Number | Price in dollars (no $ symbol) | 149.00 |

### Optional Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `category` | Text | Item category | "HVAC", "Plumbing", "Electrical" |
| `description` | Text | Detailed description | "Complete AC inspection and tune-up" |

### Example CSV Format

```csv
name,price,category,description
AC System Tune-up,149.00,HVAC,Complete AC system inspection and tune-up
Water Heater Installation,1450.00,Plumbing,Standard 50-gallon water heater installation
Electrical Panel Upgrade,2850.00,Electrical,200-amp electrical panel upgrade
Roof Inspection,299.00,Roofing,Comprehensive roof inspection with report
Service Call Fee,95.00,Service Fee,Standard service call fee
```

### Example Excel Format

| name | price | category | description |
|------|-------|----------|-------------|
| AC System Tune-up | 149 | HVAC | Complete AC inspection |
| Water Heater Installation | 1450 | Plumbing | 50-gallon standard installation |
| Panel Upgrade | 2850 | Electrical | 200-amp panel upgrade |

---

## 📁 Supported File Types

✅ **CSV** (`.csv`)
- Comma-separated values
- Can be edited in Excel, Google Sheets, or text editor
- Universal format, works everywhere

✅ **Excel** (`.xlsx`, `.xls`)
- Microsoft Excel format
- Preserves formatting
- Can include formulas (they'll be converted to values)

❌ **Not Supported**:
- PDF files
- Word documents
- Images
- Other formats

---

## 🔀 Upload Modes

### Replace All (Recommended for updates)

**What it does:**
1. Deletes ALL existing pricing items for your company
2. Uploads items from your file
3. Final catalog = only items from file

**When to use:**
- ✅ Complete pricing catalog refresh
- ✅ Annual price updates
- ✅ Standardizing catalog across team
- ✅ Starting fresh with new pricing structure

**⚠️ Warning:** This will delete all existing items. Download current catalog first if needed.

### Add to Existing (Recommended for expansion)

**What it does:**
1. Keeps ALL existing pricing items
2. Adds items from your file
3. Final catalog = old items + new items

**When to use:**
- ✅ Adding new services/products
- ✅ Expanding to new categories
- ✅ Adding seasonal items
- ✅ Gradual catalog growth

**Note:** Duplicate names are allowed. Consider using "Replace All" if you have duplicates.

---

## ✅ Validation & Error Handling

### What Gets Validated

| Check | Error Message |
|-------|---------------|
| File type | "Invalid file format. Please upload CSV or Excel file" |
| Missing `name` column | "Missing required columns: name" |
| Missing `price` column | "Missing required columns: price" |
| Empty `name` field | Row skipped (not uploaded) |
| Empty `price` field | Row skipped (not uploaded) |
| Invalid price (text) | "Price column must contain numeric values" |
| No valid rows | "No valid pricing items found in file" |

### Auto-Cleaning

The system automatically:
- ✅ Removes rows with missing required fields
- ✅ Converts prices to numbers
- ✅ Trims whitespace from text
- ✅ Sets default category to "General" if missing
- ✅ Handles missing descriptions gracefully

### Success Response

```json
{
  "success": true,
  "message": "Successfully uploaded 27 pricing items",
  "items_count": 27
}
```

---

## 🛠️ API Endpoints

### POST `/api/pricing/bulk-upload`
Replace all pricing items for a company

**Request:**
```
POST http://localhost:8000/api/pricing/bulk-upload
Content-Type: multipart/form-data

file: [CSV or Excel file]
company_id: "company-uuid"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully uploaded 27 pricing items",
  "items_count": 27,
  "items": [...]
}
```

### POST `/api/pricing/bulk-append`
Append pricing items (keep existing)

**Request:**
```
POST http://localhost:8000/api/pricing/bulk-append
Content-Type: multipart/form-data

file: [CSV or Excel file]
company_id: "company-uuid"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully appended 15 pricing items",
  "items_count": 15,
  "items": [...]
}
```

### GET `/api/pricing/download-template`
Download sample template file

**Request:**
```
GET http://localhost:8000/api/pricing/download-template?format=csv
GET http://localhost:8000/api/pricing/download-template?format=excel
```

**Response:**
- CSV: `pricing_template.csv`
- Excel: `pricing_template.xlsx`

---

## 💡 Best Practices

### 1. Start with Template
✅ **DO:** Download template first  
❌ **DON'T:** Create file from scratch

### 2. Use Consistent Categories
```
Good:
- HVAC
- Plumbing
- Electrical

Bad:
- hvac
- HVAC 
- heating and cooling
```

### 3. Include Descriptions
**Good:**
```csv
name,price,category,description
AC Tune-up,149,HVAC,Complete AC system inspection and tune-up
```

**Better:**
```csv
name,price,category,description
AC System Tune-up (Standard),149,HVAC,"Includes: filter replacement, refrigerant check, electrical inspection, performance testing"
```

### 4. Backup Before Replace
Before using "Replace All":
1. Go to Settings → Products & Services
2. Export current catalog (manually or screenshot)
3. Then upload new file

### 5. Test with Small File First
- Upload 5-10 items first
- Verify they appear correctly
- Then upload full catalog

### 6. Price Formatting
✅ **Correct:**
- 149
- 149.00
- 1450.50

❌ **Incorrect:**
- $149
- 149.00 USD
- "149"
- 149.00$

---

## 🔍 Troubleshooting

### "Missing required columns" Error

**Problem:** CSV/Excel doesn't have `name` and `price` columns

**Solution:**
1. Check column headers (first row)
2. Must have exactly: `name` and `price`
3. Case-sensitive (lowercase)
4. Download template and compare

### "Price column must contain numeric values" Error

**Problem:** Price column has text or formatting

**Solution:**
1. Remove $ symbols: `$149` → `149`
2. Remove commas: `1,450` → `1450`
3. Remove currency codes: `149 USD` → `149`
4. Format column as Number in Excel

### "No valid pricing items found" Error

**Problem:** All rows have missing name or price

**Solution:**
1. Check for empty rows
2. Ensure name and price are filled for each item
3. Delete empty rows
4. Try uploading just 1-2 rows to test

### File Upload Fails

**Problem:** File won't upload or hangs

**Solution:**
1. Check file size (< 5MB recommended)
2. Verify file format (.csv, .xlsx, .xls)
3. Try CSV instead of Excel
4. Check Python backend is running (port 8000)

### Items Not Appearing After Upload

**Problem:** Upload succeeds but items don't show

**Solution:**
1. Refresh the page
2. Check you're viewing correct company
3. Look under different categories
4. Check browser console for errors

---

## 📦 Example Use Cases

### Use Case 1: New Company Setup
**Scenario:** Setting up QuotePro for the first time

**Steps:**
1. Download CSV template
2. Fill in all your services and prices
3. Use **"Replace All"** mode
4. Upload file
5. ✅ Complete pricing catalog ready!

### Use Case 2: Annual Price Update
**Scenario:** Updating all prices for new year

**Steps:**
1. Export current catalog to spreadsheet
2. Update all prices (e.g., +5% increase)
3. Use **"Replace All"** mode
4. Upload updated file
5. ✅ All prices updated instantly!

### Use Case 3: Adding New Services
**Scenario:** Started offering roofing services

**Steps:**
1. Download template
2. Add only roofing items
3. Use **"Add to Existing"** mode
4. Upload file
5. ✅ Roofing items added, HVAC/Plumbing preserved!

### Use Case 4: Seasonal Items
**Scenario:** Add winter services temporarily

**Steps:**
1. Create CSV with seasonal items
2. Use **"Add to Existing"** mode
3. Upload in fall
4. Manually delete in spring, or
5. Upload non-seasonal catalog with **"Replace All"** in spring

---

## 🔐 Security & Permissions

### Who Can Upload?
- **Admin**: ✅ Full access
- **Manager**: ✅ Full access (if MANAGE_PRICING permission)
- **Sales**: ❌ View only
- **Estimator**: ❌ View only

### Data Privacy
- Files are processed in memory (not stored permanently)
- Items are linked to your `company_id`
- Other companies cannot see your pricing
- RLS policies ensure data isolation

---

## 🚦 Performance

| File Size | Items | Upload Time | Recommended |
|-----------|-------|-------------|-------------|
| < 100 KB | < 500 | < 2 seconds | ✅ Excellent |
| 100-500 KB | 500-2000 | 2-5 seconds | ✅ Good |
| 500 KB - 1 MB | 2000-5000 | 5-10 seconds | ⚠️ OK |
| > 1 MB | > 5000 | > 10 seconds | ❌ Consider splitting |

**Recommendations:**
- For catalogs > 5000 items, split into multiple files
- Use CSV for better performance than Excel
- Upload during off-peak hours for large files

---

## 📞 Support

If you encounter issues:

1. **Check this documentation** for troubleshooting
2. **Verify Python backend is running**: `http://localhost:8000/docs`
3. **Check browser console** for JavaScript errors
4. **Review Python logs** for backend errors
5. **Test with sample template** to isolate issue

---

## 🔄 Future Enhancements

Planned features:
- [ ] Export current catalog to CSV/Excel
- [ ] Preview upload before confirming
- [ ] Duplicate detection and merging
- [ ] Import from QuickBooks/other accounting software
- [ ] Scheduled price updates
- [ ] Bulk edit capabilities
- [ ] Import history and rollback

---

**Last Updated:** November 26, 2025  
**Feature Version:** 1.0.0  
**Backend Endpoints:** Added in main.py lines 290-577
