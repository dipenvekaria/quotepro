# Column Mapping - Flexible Bulk Upload

## 🎯 What Is Column Mapping?

Column mapping allows you to upload CSV or Excel files with **any column names** - no template required! The system automatically detects your columns and lets you visually map them to our database fields.

**This is how Salesforce, HubSpot, and Shopify do it!**

---

## ✨ Why This Is Better

### ❌ Old Way (Templates)
- Required exact column names: `name`, `price`, `category`
- Had to download template first
- Couldn't import from other systems directly
- Extra reformatting work

### ✅ New Way (Column Mapping)
- Upload files with **any column names**
- **Auto-detects** your columns
- **Visual mapping** with dropdowns
- **Preview data** before upload
- Works with QuickBooks, Excel, ServiceTitan exports
- **No template needed!**

---

## 🚀 How To Use

### Step 1: Upload Your File
```
Settings → Products & Services → Bulk Upload
→ Select your CSV or Excel file
```

### Step 2: Map Your Columns
A dialog automatically appears showing:
- All your column names
- Suggested mappings (auto-detected!)
- Preview of first 5 rows

Map your columns:
- **Item Name** → Select which column has item names
- **Price** → Select which column has prices  
- **Category** → Select which column has categories (optional)
- **Description** → Select which column has descriptions (optional)

### Step 3: Upload
- Review the preview
- Click "Upload X Items"
- Done!

---

## 🧠 Smart Auto-Detection

The system tries to automatically map your columns:

**Your CSV:**
```csv
Service Name,Unit Cost,Service Type,Notes
AC Tune-up,149,HVAC,Complete inspection
```

**Auto-mapped to:**
- `Service Name` → Name ✅
- `Unit Cost` → Price ✅
- `Service Type` → Category ✅
- `Notes` → Description ✅

**Detection patterns:**
- **Name**: Looks for "name", "item", "service", "product"
- **Price**: Looks for "price", "cost", "amount", "rate"
- **Category**: Looks for "category", "type", "group", "dept"
- **Description**: Looks for "description", "desc", "details", "notes"

---

## 💡 Real Examples

### QuickBooks Export
```csv
Item,Rate,Item Type,Description
AC System Tune-up,149.00,Service,Complete AC inspection
```
✅ Auto-maps perfectly!

### ServiceTitan Export
```csv
SKU,Service Description,Price Code,Category
S001,Water Heater Install,$1450,Plumbing
```
✅ Works great! (Auto-removes $ symbol)

### Custom Excel
```
Product | Cost | Department | Info
AC Fix  | 149  | HVAC       | Basic
```
✅ No problem - just map manually!

---

## 📋 Column Mapping Interface

```
┌──────────────────────────────────────────┐
│  Map Your Columns                        │
├──────────────────────────────────────────┤
│  Found 42 rows in "pricing.csv"         │
│                                          │
│  Item Name (Required)   [Service ▼]     │
│  Price (Required)       [Cost    ▼]     │
│  Category (Optional)    [Type    ▼]     │
│  Description (Optional) [Skip    ▼]     │
│                                          │
│  Data Preview (first 5 rows)            │
│  ┌────────┬──────┬──────┬────────┐      │
│  │Service │ Cost │ Type │ Notes  │      │
│  │   →    │  →   │  →   │        │      │
│  ├────────┼──────┼──────┼────────┤      │
│  │AC Fix  │ 149  │ HVAC │ Basic  │      │
│  └────────┴──────┴──────┴────────┘      │
│                                          │
│  [Cancel]       [Upload 42 Items]       │
└──────────────────────────────────────────┘
```

**Features:**
- Dropdowns for easy mapping
- Preview shows your actual data
- Arrows (→) show mapped columns
- Required fields highlighted
- Upload button shows row count

---

## ✅ Requirements

**Required Fields:**
- ✅ Name - Must map a column
- ✅ Price - Must map a column

**Optional Fields:**
- Category - Can skip if not needed
- Description - Can skip if not needed

**Validation:**
- Price must be numeric ($ symbols auto-removed)
- Invalid rows automatically skipped
- Clear error messages

---

## 🎓 Tips

1. **Check the preview** - Always verify first 5 rows look correct
2. **Required fields first** - Map Name and Price to enable upload
3. **Optional fields** - Select "-- Skip --" if you don't have that data
4. **Price format** - Works with: `149`, `149.00`, `$149`, `1,450`
5. **Backup first** - "Replace All" mode deletes existing items

---

## 🐛 Troubleshooting

**Q: Auto-detection didn't work**  
A: Manually select columns from dropdowns

**Q: "Please map at least Name and Price"**  
A: Make sure both required fields are mapped

**Q: Some rows didn't import**  
A: Check for non-numeric data in price column

**Q: Wrong data in columns**  
A: Review preview table, verify mapping is correct

---

## 🎯 Comparison

| Feature | Templates | Column Mapping |
|---------|-----------|----------------|
| Any column names | ❌ | ✅ |
| Import from other tools | ❌ | ✅ |
| Visual interface | ❌ | ✅ |
| Data preview | ❌ | ✅ |
| Auto-detection | ❌ | ✅ |
| Enterprise-grade | ❌ | ✅ |

---

## 🚀 Summary

**Column Mapping = Ultimate Flexibility**

- Upload **any** CSV/Excel file
- **Auto-detects** your columns
- **Visual dropdowns** for mapping
- **Preview** before upload
- Works with **any format**
- **No templates needed!**

Stop reformatting your data - just upload and map! 🎉
