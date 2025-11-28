# AI Context Fix Using Existing Audit Trail

## Problem
AI removes existing quote items when asked to add new ones because it lacks conversation context.

## Solution (Using Existing Infrastructure!)
**We already have the audit trail!** We just need to:
1. Load the audit trail history before calling Python backend
2. Send previous AI interactions as conversation context
3. Build multi-turn conversation in Python backend

## Why This Works

The `quote_audit_log` table already stores:
- ✅ `user_prompt` - Every AI request
- ✅ `action_type` - Tracks 'ai_generation', 'ai_update', etc.
- ✅ `changes_made` - Full JSON of what the AI returned
- ✅ `created_at` - Chronological ordering
- ✅ `quote_id` - Linked to specific quote

This is **exactly what we need** for conversation history!

## Implementation

### Step 1: Update Next.js API Route
**File**: `/src/app/api/update-quote-with-ai/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // ... existing auth code ...
  
  const { quote_id, user_prompt, company_id } = body

  // 1. Fetch existing quote
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', quote_id)
    .single()

  // 2. 🆕 LOAD AUDIT TRAIL for conversation history
  const { data: auditHistory } = await supabase
    .from('quote_audit_log')
    .select('user_prompt, changes_made, action_type, created_at')
    .eq('quote_id', quote_id)
    .in('action_type', ['ai_generation', 'ai_update'])
    .order('created_at', { ascending: true })

  // 3. Send to Python backend WITH history
  const response = await fetch(`${PYTHON_BACKEND_URL}/api/update-quote-with-ai`, {
    method: 'POST',
    body: JSON.stringify({
      quote_id,
      company_id,
      user_prompt,
      existing_items: quote.quote_items,
      customer_name: quote.customer_name,
      customer_address: quote.customer_address,
      conversation_history: auditHistory || [],  // 🆕 SEND HISTORY
    }),
  })
  
  // ... rest of code ...
}
```

### Step 2: Update Python Backend
**File**: `/python-backend/main.py`

```python
class UpdateQuoteRequest(BaseModel):
    quote_id: str
    company_id: str
    user_prompt: str
    existing_items: List[dict]
    conversation_history: List[dict] = []  # 🆕 NEW FIELD
    customer_name: str
    customer_address: Optional[str] = None

@app.post("/api/update-quote-with-ai")
async def update_quote_with_ai(request: UpdateQuoteRequest):
    sb = get_supabase()
    
    # Fetch pricing catalog (same as before)
    pricing_response = sb.table('pricing_items')\
        .select('*')\
        .eq('company_id', request.company_id)\
        .execute()
    
    catalog_text = format_catalog(pricing_response.data)
    
    # 🆕 BUILD CONVERSATION HISTORY
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"PRICING CATALOG:\n{catalog_text}"}
    ]
    
    # 🆕 ADD PREVIOUS AI INTERACTIONS
    for entry in request.conversation_history:
        # Add user's previous prompt
        if entry.get('user_prompt'):
            messages.append({
                "role": "user",
                "content": entry['user_prompt']
            })
        
        # Add AI's previous response (from changes_made)
        if entry.get('changes_made'):
            # Extract the line_items that were generated
            changes = entry['changes_made']
            if isinstance(changes, dict):
                # Format the AI's previous response
                ai_response = {
                    "line_items": changes.get('line_items', []),
                    "notes": changes.get('ai_instructions', ''),
                }
                messages.append({
                    "role": "assistant",
                    "content": json.dumps(ai_response)
                })
    
    # 🆕 ADD CURRENT REQUEST (with existing items context)
    existing_items_text = '\n'.join([
        f"- {item['name']}: ${item['unit_price']} x {item['quantity']} = ${item['total']}"
        for item in request.existing_items
    ])
    
    current_prompt = f"""CURRENT QUOTE ITEMS:
{existing_items_text}

USER REQUEST: {request.user_prompt}

Remember: This is a conversation. The user is asking you to UPDATE the existing quote, not create a new one from scratch. Preserve existing items unless explicitly asked to remove them."""
    
    messages.append({
        "role": "user",
        "content": current_prompt
    })
    
    # Call Groq with FULL conversation history
    completion = client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile",  # Or switch to caching-enabled model
        temperature=0.7,
        max_tokens=2048,
    )
    
    # ... rest of response parsing ...
```

### Step 3: Update Audit Trail Storage
**File**: `/src/app/api/update-quote-with-ai/route.ts`

```typescript
// After getting response from Python backend
const updatedQuote = await response.json()

// Log audit trail WITH the AI's full response
await supabase.from('quote_audit_log').insert({
  quote_id,
  action_type: 'ai_update',
  user_prompt,
  description: `User requested: "${user_prompt}"`,
  changes_made: {
    line_items: updatedQuote.line_items,  // 🆕 STORE FULL ITEMS
    added_items: updatedQuote.added_items || [],
    modified_items: updatedQuote.modified_items || [],
    removed_items: updatedQuote.removed_items || [],
    ai_instructions: updatedQuote.notes || '',
  },
  created_by: user.id,
})
```

## Example Flow

### Turn 1: Initial Generation
**User**: "Water heater installation"

**Audit Log**:
```json
{
  "action_type": "ai_generation",
  "user_prompt": "Water heater installation",
  "changes_made": {
    "line_items": [
      {"name": "Water Heater - 50 Gallon", "unit_price": 800, "quantity": 1},
      {"name": "Installation Labor", "unit_price": 300, "quantity": 3}
    ]
  }
}
```

**Messages Sent to Groq**:
```python
[
  {"role": "system", "content": SYSTEM_PROMPT},
  {"role": "system", "content": "PRICING CATALOG: ..."},
  {"role": "user", "content": "Water heater installation"}
]
```

### Turn 2: Add Items
**User**: "add copper piping"

**Audit Trail Loaded**:
- Previous: "Water heater installation" → [Water Heater, Installation Labor]

**Messages Sent to Groq**:
```python
[
  {"role": "system", "content": SYSTEM_PROMPT},
  {"role": "system", "content": "PRICING CATALOG: ..."},
  {"role": "user", "content": "Water heater installation"},  # FROM AUDIT
  {"role": "assistant", "content": "{...water heater items...}"},  # FROM AUDIT
  {"role": "user", "content": "CURRENT ITEMS: [Water Heater, Labor]\n\nUSER REQUEST: add copper piping"}
]
```

**Result**: AI sees full context and adds copper piping while preserving existing items! ✅

### Turn 3: Remove Items  
**User**: "remove installation labor"

**Audit Trail Loaded**:
- Turn 1: "Water heater installation" → [Water Heater, Labor]
- Turn 2: "add copper piping" → [Water Heater, Labor, Copper Piping]

**Messages Sent to Groq**:
```python
[
  {"role": "system", "content": SYSTEM_PROMPT},
  {"role": "system", "content": "PRICING CATALOG: ..."},
  {"role": "user", "content": "Water heater installation"},
  {"role": "assistant", "content": "{...items...}"},
  {"role": "user", "content": "add copper piping"},
  {"role": "assistant", "content": "{...items with piping...}"},
  {"role": "user", "content": "CURRENT ITEMS: [...]\n\nUSER REQUEST: remove installation labor"}
]
```

**Result**: AI understands removal request and keeps Water Heater + Copper Piping ✅

## Benefits

1. ✅ **No New Tables** - Uses existing `quote_audit_log`
2. ✅ **Already Logging** - Audit trail is already being saved
3. ✅ **Full Context** - AI sees entire conversation history
4. ✅ **Persistent** - Works across page refreshes/sessions
5. ✅ **Auditable** - Can review exact AI conversation later
6. ✅ **Multi-Device** - Same history everywhere (stored in DB)

## Prompt Caching Benefits

Once we switch to a caching-enabled model (e.g., `moonshotai/kimi-k2-instruct-0905`):

**Turn 1**: No cache
```
System Prompt: 500 tokens
Catalog: 2000 tokens
User: 20 tokens
Total: 2520 tokens × $0.10/1M = $0.00025
```

**Turn 2**: 99% cache hit
```
System Prompt: 500 tokens (cached, 50% off)
Catalog: 2000 tokens (cached, 50% off)
Turn 1 User: 20 tokens (cached, 50% off)
Turn 1 Assistant: 300 tokens (cached, 50% off)
Turn 2 User: 25 tokens (new, full price)
Total: 2820 cached tokens × $0.05/1M + 25 new × $0.10/1M = $0.000143 + $0.0000025 = $0.0001455
Savings: 42%
```

**Turn 3**: 99.2% cache hit
```
Cached: 3145 tokens × $0.05/1M = $0.00015725
New: 25 tokens × $0.10/1M = $0.0000025
Total: $0.00015975
Savings: 49%
```

## Implementation Checklist

- [ ] Update `/src/app/api/update-quote-with-ai/route.ts`
  - [ ] Add audit trail query
  - [ ] Send `conversation_history` to Python backend
  - [ ] Store full `line_items` in audit log `changes_made`

- [ ] Update `/python-backend/main.py`
  - [ ] Add `conversation_history` field to `UpdateQuoteRequest`
  - [ ] Build messages array from audit history
  - [ ] Add context about "this is a conversation"

- [ ] Test scenarios
  - [ ] Create quote → add items (should preserve existing)
  - [ ] Create quote → remove items (should only remove specified)
  - [ ] Create quote → modify items (should only modify specified)
  - [ ] Multi-turn: create → add → add → remove

- [ ] Optional: Switch to caching-enabled model
  - [ ] Change model to `moonshotai/kimi-k2-instruct-0905`
  - [ ] Monitor cache hit rate
  - [ ] Measure cost savings

## Migration Notes

**No database migration needed!** The `quote_audit_log` table already has all required fields:
- ✅ `user_prompt` (TEXT)
- ✅ `changes_made` (JSONB)
- ✅ `action_type` (TEXT)
- ✅ `created_at` (TIMESTAMP)
- ✅ `quote_id` (UUID with FK)

We just need to:
1. Ensure `changes_made` includes full `line_items` (not just added/modified/removed)
2. Load audit history before calling Python backend
3. Build conversation from audit history

## Why This Is Better Than Separate Conversation Table

**Audit Trail Approach** (Recommended):
- ✅ Already exists
- ✅ Already being populated
- ✅ Serves dual purpose (audit + conversation)
- ✅ No duplicate data
- ✅ Single source of truth

**Separate Conversation Table**:
- ❌ Duplicate data (same info in two tables)
- ❌ Sync issues (audit log vs conversation)
- ❌ Extra maintenance
- ❌ Extra queries

The audit trail **IS** the conversation history!
