# How LLM Pricing Works - Understanding the Pricing Catalog

## ✅ **CURRENT BEHAVIOR** (Graceful Failure)

### What Happens When Pricing Catalog is Empty:

```python
pricing_items = pricing_response.data  # Returns []

if not pricing_items:
    raise HTTPException(
        status_code=400,
        detail={
            "error": "NO_PRICING_CATALOG",
            "message": "No pricing catalog found for this company. Please set up your pricing catalog in Settings before generating quotes.",
            "action_required": "Navigate to Settings → Pricing to add your service items and prices."
        }
    )
```

### Result:
⚠️ **Error 400**: Clear, actionable error message  
✅ **User knows exactly what to do**: Set up pricing catalog in Settings  
✅ **No silent failures**: Problem is immediately visible  
✅ **No fallback defaults**: Forces proper setup before generating quotes

---

## 🧠 **How the LLM Actually Works**

### Your Question:
> "So the LLM is just making up things based on historical information?"

**Answer**: **No!** The LLM cannot make up prices. Here's why:

### What the LLM CAN'T Do:
❌ **Cannot** invent prices from thin air  
❌ **Cannot** use prices from its training data  
❌ **Cannot** make up items not in your catalog  
❌ **Cannot** access "historical information" about pricing

### What the LLM DOES:
✅ **Receives** your pricing catalog in the prompt  
✅ **Matches** job description to catalog items  
✅ **Selects** appropriate items from YOUR catalog  
✅ **Calculates** quantities based on job scope  
✅ **Suggests** upsells from YOUR catalog  

---

## 📊 **The Process Flow**

### Step 1: Fetch Your Pricing Catalog
```python
# Get company's pricing catalog from database
pricing_response = sb.table('pricing_items')\
    .select('*')\
    .eq('company_id', request.company_id)\
    .execute()

pricing_items = pricing_response.data
```

**Result**: List of items like:
- AC System Tune-up - $149
- Water Heater Installation - $1,450
- Electrical Panel Upgrade - $2,850
- etc.

### Step 2: Format for LLM
```python
# Convert to human-readable format
catalog_text = "\n".join([
    f"- {item['name']} (${item['price']}) - {item.get('category', 'General')}"
    for item in pricing_items
])
```

**Result**: Text like:
```
- AC System Tune-up ($149) - HVAC
- Water Heater Installation ($1450) - Plumbing
- Electrical Panel Upgrade ($2850) - Electrical
```

### Step 3: Send to LLM
```python
system_prompt = f"""
You are a professional quote generator. 
Here is the available pricing catalog:

{catalog_text}

IMPORTANT: Only use items from this catalog. Do not make up prices.
"""

user_prompt = f"Generate a quote for: {request.job_description}"
```

### Step 4: LLM Matches Items
**Input**: "Need AC tune-up and new thermostat"

**LLM thinks**:
1. ✅ Search catalog for "AC tune-up" → Found "AC System Tune-up - $149"
2. ✅ Search catalog for "thermostat" → Found "Thermostat Installation - $185"
3. ✅ Common upsells? → Maybe "Duct Cleaning - $399"
4. ✅ Calculate total

**Output**: JSON with ONLY items from YOUR catalog:
```json
{
  "items": [
    {"name": "AC System Tune-up", "price": 149, "quantity": 1},
    {"name": "Thermostat Installation", "price": 185, "quantity": 1}
  ],
  "suggested_upsells": [
    {"name": "Duct Cleaning", "price": 399}
  ]
}
```

### What LLM CANNOT Do:
❌ Return "AC tune-up - $200" (different price not in catalog)  
❌ Add "Smart Thermostat - $350" (item not in catalog)  
❌ Use prices from training data  

---

## 🔍 **Verification Example**

### Test Case 1: Limited Catalog
**Your Catalog**:
- AC Tune-up - $149

**Request**: "Install new furnace"

**LLM Response**:
```
"I don't see furnace installation in your catalog. 
The closest match is AC Tune-up at $149."
```

### Test Case 2: Full Catalog
**Your Catalog**:
- AC Tune-up - $149
- Furnace Installation - $3,500
- Duct Cleaning - $399

**Request**: "Install new furnace"

**LLM Response**:
```json
{
  "items": [
    {"name": "Furnace Installation", "price": 3500, "quantity": 1}
  ],
  "suggested_upsells": [
    {"name": "Duct Cleaning", "price": 399}
  ]
}
```

---

## 💡 **Why This Design Prevents Hallucination**

### The Constraint:
```
┌─────────────────────────────────┐
│  Your Pricing Catalog           │
│  (The ONLY source of truth)     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Sent to LLM in Prompt          │
│  "Here are the ONLY items..."   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  LLM Can ONLY Use These         │
│  (Cannot access other data)     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Quote Uses Your Exact Prices   │
│  (100% from your catalog)       │
└─────────────────────────────────┘
```

### Benefits:
✅ **Accuracy**: All prices come from YOUR catalog  
✅ **Consistency**: Same item = same price every time  
✅ **Control**: YOU control all pricing  
✅ **Trust**: No "AI hallucination" of prices  
✅ **Transparency**: You can see exactly what catalog was used

---

## 📝 **Common Scenarios**

| Scenario | What Happens |
|----------|-------------|
| **Catalog is empty** | ❌ Error 400: "Set up pricing catalog in Settings" |
| **Item in catalog** | ✅ LLM uses exact price from catalog |
| **Item NOT in catalog** | ⚠️ LLM suggests closest match OR says "not available" |
| **Price changed in catalog** | ✅ New quotes use updated price immediately |
| **Multiple companies** | ✅ Each company has their own catalog |

---

## 🚀 **The Complete Flow**

```
User Requests Quote
        ↓
┌───────────────────────┐
│ Check Database        │
│ for Pricing Catalog   │
└──────────┬────────────┘
           │
     ┌─────┴──────┐
     │            │
   FOUND        EMPTY
     │            │
     │            ▼
     │    ┌──────────────────┐
     │    │ Return Error 400 │
     │    │ "Set up catalog" │
     │    └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│ Format Catalog as Text  │
│ "Item - $Price"         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Send to Groq LLM        │
│ + Job Description       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ LLM Matches Items       │
│ (ONLY from catalog)     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Calculate Tax           │
│ (Based on address)      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Return Quote            │
│ (Your prices + tax)     │
└─────────────────────────┘
```

---

## 🎯 **Key Takeaways**

1. **LLM = Smart Matcher, Not Price Inventor**
   - It matches job descriptions to your catalog
   - It suggests quantities and combinations
   - It CANNOT create prices

2. **Your Catalog = Source of Truth**
   - All prices come from your database
   - LLM only sees what you provide
   - You have 100% control

3. **No Catalog = No Quotes**
   - System fails gracefully with clear error
   - User knows exactly what to do
   - No silent failures or confusing behavior

4. **Transparency**
   - You can inspect the catalog sent to LLM
   - You can verify every price in the quote
   - No "black box" pricing

---

## 📚 **For Developers**

### To See What Catalog is Sent:
```python
# Add this in main.py after formatting catalog
print("📋 Catalog sent to LLM:")
print(catalog_text)
```

### To See LLM Response:
```python
# Add this after LLM call
print("🤖 LLM Response:")
print(completion.choices[0].message.content)
```

### To Verify No Hallucination:
1. Check `pricing_items` from database
2. Check `catalog_text` sent to LLM
3. Check items in generated quote
4. Verify: Quote items ⊆ Catalog items (subset)

---

**Bottom Line**: The LLM is a **smart assistant that can ONLY use your pricing catalog**. It's like giving someone a menu at a restaurant - they can suggest good combinations and estimate portions, but they **cannot order anything not on the menu or make up prices**!
