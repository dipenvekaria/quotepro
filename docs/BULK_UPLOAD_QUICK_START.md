# Bulk Upload Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Download Template
Go to **Settings → Products & Services**

Click one of these buttons:
```
┌─────────────────────────────┬─────────────────────────────┐
│  📄 Download CSV Template   │ 📊 Download Excel Template  │
└─────────────────────────────┴─────────────────────────────┘
```

### Step 2: Fill Your Pricing Data

Open the template and add your items:

```
name                          | price  | category    | description
------------------------------|--------|-------------|---------------------------
AC System Tune-up             | 149.00 | HVAC        | Complete AC inspection
Water Heater Installation     | 1450.00| Plumbing    | 50-gallon standard install
Electrical Panel Upgrade      | 2850.00| Electrical  | 200-amp panel upgrade
```

**Important:**
- ✅ Don't use `$` symbols in price
- ✅ Price must be numbers only: `149` or `149.00`
- ✅ Keep column names exactly: `name`, `price`, `category`, `description`

### Step 3: Upload Your File

Choose your upload mode:

```
┌──────────────────┬──────────────────────┐
│  🔄 Replace All  │  ➕ Add to Existing  │
│  (Delete old     │  (Keep existing +    │
│   Upload new)    │   Add new)           │
└──────────────────┴──────────────────────┘
```

Then:
1. Click **"Click to select CSV or Excel file"**
2. Choose your file
3. Click **"Upload"** button
4. ✅ Done!

---

## 📊 File Format Cheat Sheet

### CSV Example (`pricing.csv`)
```csv
name,price,category,description
AC Tune-up,149,HVAC,Complete inspection
Furnace Repair,275,HVAC,Basic repair service
Drain Cleaning,195,Plumbing,Main drain line
```

### Excel Example (`pricing.xlsx`)

| name | price | category | description |
|------|-------|----------|-------------|
| AC Tune-up | 149 | HVAC | Complete inspection |
| Furnace Repair | 275 | HVAC | Basic repair service |
| Drain Cleaning | 195 | Plumbing | Main drain line |

---

## ⚠️ Common Mistakes

### ❌ Wrong Price Format
```csv
name,price,category
AC Tune-up,$149,HVAC        ❌ Don't use $
AC Tune-up,"149",HVAC       ❌ Don't use quotes
AC Tune-up,149 USD,HVAC     ❌ Don't add currency
```

### ✅ Correct Price Format
```csv
name,price,category
AC Tune-up,149,HVAC         ✅ Just the number
AC Tune-up,149.00,HVAC      ✅ Decimals are fine
```

### ❌ Wrong Column Names
```csv
item_name,cost,type         ❌ Wrong headers
Item,Price,Category         ❌ Wrong capitalization
```

### ✅ Correct Column Names
```csv
name,price,category         ✅ Exactly like this
name,price                  ✅ Category optional
```

---

## 🎯 When to Use Each Mode

### 🔄 Replace All
**Use when:**
- ✅ Updating all prices (e.g., annual increase)
- ✅ Complete catalog refresh
- ✅ Standardizing across team
- ✅ Starting fresh

**Example:** "Increase all prices by 5% for 2026"
```
Old catalog: 100 items
Your file: 100 items (updated prices)
Result: 100 items (new prices only)
```

### ➕ Add to Existing
**Use when:**
- ✅ Adding new services/products
- ✅ Expanding categories
- ✅ Seasonal items
- ✅ Gradual growth

**Example:** "Add roofing services to HVAC/Plumbing catalog"
```
Old catalog: 50 items (HVAC, Plumbing)
Your file: 20 items (Roofing)
Result: 70 items (HVAC, Plumbing, Roofing)
```

---

## 🔍 Troubleshooting

### Problem: "Missing required columns" error

**Fix:**
1. Check your first row has: `name,price`
2. Spelling must be exact (lowercase)
3. No spaces: `name,price` not `name, price`

### Problem: "Price must be numeric" error

**Fix:**
1. Remove $ symbols: `$149` → `149`
2. Remove commas: `1,450` → `1450`
3. No text: `149 dollars` → `149`

### Problem: "No valid pricing items" error

**Fix:**
1. Check for empty rows
2. Make sure name and price are filled
3. Try uploading just 1-2 rows first

### Problem: Upload button is disabled

**Fix:**
1. Make sure you selected a file
2. Check file extension is .csv, .xlsx, or .xls
3. Try refreshing the page

---

## 📞 Quick Help

**Can't find the upload section?**
→ Go to Settings → Click "Products & Services" tab

**Not sure which format to use?**
→ Use CSV (works everywhere, faster)

**Worried about breaking things?**
→ Use "Add to Existing" mode first

**Need to update prices?**
→ Use "Replace All" mode

**File too large?**
→ Keep under 5MB (2000-5000 items)

---

## ✅ Quick Checklist

Before uploading, verify:
- [ ] File is CSV or Excel (.csv, .xlsx, .xls)
- [ ] First row has column names: `name,price`
- [ ] Prices are numbers (no $ symbols)
- [ ] Name column is filled for every row
- [ ] Price column is filled for every row
- [ ] Chose correct upload mode (Replace vs Add)
- [ ] Python backend is running (if testing locally)

---

## 🎉 You're Ready!

That's all you need to know! The system handles:
- ✅ Automatic validation
- ✅ Error detection
- ✅ Data cleaning
- ✅ Duplicate handling
- ✅ Category assignment

Just follow the 3 steps above and you're good to go! 🚀
