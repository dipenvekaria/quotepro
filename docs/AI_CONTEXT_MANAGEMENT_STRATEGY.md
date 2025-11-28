# AI Context Management Strategy for QuotePro

## Problem Statement

**Issue**: When updating a quote with AI (e.g., "add labor charges"), the AI is removing existing items and only following the new instruction, rather than **adding to** the existing quote.

**Root Cause**: Currently sending ALL existing items + catalog as context with EVERY request, but not properly instructing the AI to preserve existing items.

## Current Implementation Analysis

### How It Works Now

1. **Initial Quote Generation** (`/api/generate-quote`):
   ```python
   messages=[
       {"role": "system", "content": SYSTEM_PROMPT},
       {"role": "user", "content": user_prompt}
   ]
   ```
   - Single-turn conversation
   - No conversation history
   - Works perfectly for initial quote

2. **Update Quote** (`/api/update-quote-with-ai`):
   ```python
   # Format existing items
   existing_items_text = '\n'.join([
       f"- {item['name']}: ${item['unit_price']} x {item['quantity']} = ${item['total']}"
       for item in request.existing_items
   ])
   
   user_prompt = f"""
   CURRENT QUOTE ITEMS:
   {existing_items_text}
   
   USER REQUEST: {request.user_prompt}
   
   PRICING CATALOG:
   {catalog_text}
   
   Return ALL items that should be in the quote (both existing and new)
   """
   ```
   - ❌ Still single-turn (no conversation history)
   - ✅ Sends existing items as context
   - ❌ AI interprets "add labor" as "replace everything with labor"

### The Problem

The prompt says:
> "Return ALL items that should be in the quote (both existing and new)"

But the AI treats each request as a **fresh start** and doesn't understand that existing items should be **preserved unless explicitly removed**.

---

## Groq Best Practices (From Documentation)

### 1. Prompt Caching (CRITICAL for Cost Optimization)

**What It Does**:
- Automatically caches repeated prompt prefixes
- 50% discount on cached tokens
- Cached tokens don't count toward rate limits
- Cache expires after 2 hours of inactivity

**Optimal Structure** (from Groq docs):
```
[SYSTEM PROMPT - Static] ← CACHED
[TOOL DEFINITIONS - Static] ← CACHED  
[FEW-SHOT EXAMPLES - Static] ← CACHED
[PRICING CATALOG - Static] ← CACHED
[CONVERSATION HISTORY - Growing] ← PARTIALLY CACHED
[USER QUERY - Dynamic] ← NOT CACHED
```

**For Multi-Turn Conversations** (from Groq docs):
```python
# Turn 1
messages = [
    {"role": "system", "content": "..."},  # Cached
    {"role": "user", "content": "..."}
]

# Turn 2
messages = [
    {"role": "system", "content": "..."},      # Cached (99%+ hit rate)
    {"role": "user", "content": "..."},        # Cached
    {"role": "assistant", "content": "..."},   # Cached
    {"role": "user", "content": "..."}         # New
]

# Turn 3
messages = [
    {"role": "system", "content": "..."},      # Cached
    {"role": "user", "content": "..."},        # Cached
    {"role": "assistant", "content": "..."},   # Cached
    {"role": "user", "content": "..."},        # Cached
    {"role": "assistant", "content": "..."},   # Cached
    {"role": "user", "content": "..."}         # New
]
```

### 2. Supported Models for Caching

Only these models support prompt caching:
- ✅ `moonshotai/kimi-k2-instruct-0905`
- ✅ `openai/gpt-oss-20b`
- ✅ `openai/gpt-oss-120b`
- ✅ `openai/gpt-oss-safeguard-20b`
- ❌ `llama-3.3-70b-versatile` (NOT supported)

**Current Model**: `llama-3.3-70b-versatile` ❌ 
**Issue**: We're NOT getting caching benefits!

---

## Recommended Solutions

### Option 1: Multi-Turn Conversation with History (BEST FOR UX)

**Architecture**:
```
Frontend (React State)
    ↓
    Conversation History Array
    ↓
Backend (FastAPI)
    ↓
    Build Full Message History
    ↓
Groq API (with Prompt Caching)
```

**Implementation**:

```python
# Update endpoint signature
class UpdateQuoteRequest(BaseModel):
    quote_id: str
    company_id: str
    user_prompt: str
    existing_items: List[dict]
    conversation_history: List[dict] = []  # NEW: Previous AI interactions
    customer_name: str
    customer_address: Optional[str] = None

@app.post("/api/update-quote-with-ai")
async def update_quote_with_ai(request: UpdateQuoteRequest):
    # Build message history
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},  # Cached
        {"role": "system", "content": f"PRICING CATALOG:\n{catalog_text}"},  # Cached
    ]
    
    # Add conversation history
    for msg in request.conversation_history:
        messages.append(msg)
    
    # Add current request
    messages.append({
        "role": "user",
        "content": f"USER REQUEST: {request.user_prompt}\n\nCURRENT ITEMS:\n{existing_items_text}"
    })
    
    # Call Groq with full history
    completion = client.chat.completions.create(
        messages=messages,
        model="moonshotai/kimi-k2-instruct-0905",  # Supports caching!
        temperature=0.7,
        max_tokens=2048,
    )
```

**Frontend Changes**:
```typescript
// Store conversation history in state
const [aiConversationHistory, setAiConversationHistory] = useState<Array<{role: string, content: string}>>([])

const handleUpdateWithAI = async () => {
    const response = await fetch('/api/update-quote-with-ai', {
        method: 'POST',
        body: JSON.stringify({
            quote_id: savedQuoteId,
            company_id: companyId,
            user_prompt: aiUpdatePrompt,
            existing_items: generatedQuote.line_items,
            conversation_history: aiConversationHistory,  // Send full history
            customer_name: customerName,
            customer_address: customerAddress
        })
    })
    
    const data = await response.json()
    
    // Update conversation history
    setAiConversationHistory([
        ...aiConversationHistory,
        { role: "user", content: aiUpdatePrompt },
        { role: "assistant", content: JSON.stringify(data.line_items) }
    ])
}
```

**Benefits**:
- ✅ AI remembers previous requests ("add labor" won't remove existing items)
- ✅ 99%+ cache hit rate (50% cost savings)
- ✅ Faster responses (cached computation)
- ✅ Natural conversation flow

**Drawbacks**:
- Token count grows with each turn
- Need to manage history in frontend state
- History lost on page refresh (unless persisted)

---

### Option 2: Database-Persisted Conversation (BEST FOR RELIABILITY)

**Architecture**:
```
Frontend
    ↓
Backend
    ↓
Supabase: quote_ai_sessions table
    ├─ quote_id
    ├─ session_id
    ├─ messages (JSONB array)
    ├─ created_at
    └─ updated_at
```

**Database Schema**:
```sql
CREATE TABLE quote_ai_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(quote_id)
);

CREATE INDEX idx_quote_ai_sessions_quote_id ON quote_ai_sessions(quote_id);
```

**Backend Implementation**:
```python
@app.post("/api/update-quote-with-ai")
async def update_quote_with_ai(request: UpdateQuoteRequest):
    sb = get_supabase()
    
    # Load existing conversation from database
    session_response = sb.table('quote_ai_sessions')\
        .select('messages')\
        .eq('quote_id', request.quote_id)\
        .maybeSingle()\
        .execute()
    
    if session_response.data:
        conversation_history = session_response.data['messages']
    else:
        conversation_history = []
    
    # Build messages
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"PRICING CATALOG:\n{catalog_text}"},
        *conversation_history,
        {"role": "user", "content": request.user_prompt}
    ]
    
    # Call Groq
    completion = client.chat.completions.create(
        messages=messages,
        model="moonshotai/kimi-k2-instruct-0905",
        temperature=0.7
    )
    
    # Update conversation history in database
    new_conversation = [
        *conversation_history,
        {"role": "user", "content": request.user_prompt},
        {"role": "assistant", "content": completion.choices[0].message.content}
    ]
    
    sb.table('quote_ai_sessions').upsert({
        'quote_id': request.quote_id,
        'company_id': request.company_id,
        'messages': new_conversation,
        'updated_at': 'NOW()'
    }).execute()
    
    return data
```

**Benefits**:
- ✅ Conversation persists across page refreshes
- ✅ Can review AI interactions later (audit trail)
- ✅ Multi-device support (same conversation everywhere)
- ✅ Can implement "reset conversation" feature

**Drawbacks**:
- More database queries
- Storage costs for conversation data
- Need migration to add table

---

### Option 3: Improved Single-Turn with Better Prompting (QUICK FIX)

**Change the Prompt**:
```python
user_prompt = f"""You are updating an existing quote for {request.customer_name}.

EXISTING QUOTE ITEMS (DO NOT REMOVE UNLESS EXPLICITLY ASKED):
{existing_items_text}

USER'S NEW REQUEST: {request.user_prompt}

INSTRUCTIONS:
1. If the user says "add", "include", or "also need" → ADD new items WHILE KEEPING existing items
2. If the user says "remove", "delete", or "take out" → REMOVE specified items
3. If the user says "replace" or "change" → MODIFY specified items
4. Default behavior: ADD to existing items, don't replace them

PRICING CATALOG:
{catalog_text}

Return the COMPLETE quote including:
- ALL existing items (unless user explicitly asked to remove them)
- ANY new items the user requested
"""
```

**Benefits**:
- ✅ Quick fix (no architecture changes)
- ✅ Works with current model
- ✅ No database changes needed

**Drawbacks**:
- ❌ No conversation memory
- ❌ No caching benefits
- ❌ Less reliable than conversation history

---

## Recommended Implementation Plan

### Phase 1: Quick Fix (NOW) ⚡
1. Improve prompt wording to be explicit about preserving items
2. Test with current model
3. Add better examples to system prompt

### Phase 2: Switch Model (THIS WEEK) 💰
1. Change from `llama-3.3-70b-versatile` to `moonshotai/kimi-k2-instruct-0905`
2. Verify caching is working (check `cached_tokens` in response)
3. Monitor cost savings (should see 50% reduction)

### Phase 3: Add Conversation History (NEXT SPRINT) 🎯
1. Add `conversation_history` field to UpdateQuoteRequest
2. Store conversation in React state
3. Send full history with each request
4. Display conversation history in UI (optional)

### Phase 4: Persist to Database (FUTURE) 💾
1. Create `quote_ai_sessions` table
2. Store/load conversation from database
3. Add "reset conversation" button
4. Include in audit trail

---

## Cost & Performance Analysis

### Current Approach (Single-Turn)
- Model: `llama-3.3-70b-versatile`
- Tokens per request: ~2000-3000 (catalog + existing items + prompt)
- Caching: ❌ Not supported
- Cost: 100% of tokens billed

### Recommended Approach (Multi-Turn + Caching)
- Model: `moonshotai/kimi-k2-instruct-0905`
- Tokens per request: 
  - Turn 1: ~2500 tokens (no cache)
  - Turn 2: ~3000 tokens (2400 cached = 50% discount)
  - Turn 3: ~3500 tokens (3200 cached = 50% discount)
- Caching: ✅ 99%+ hit rate after first turn
- Cost: ~25-30% of current cost (after first turn)

### Example Cost Calculation

**Scenario**: Customer generates quote, then makes 3 AI updates

Current approach:
```
Turn 1: 2500 tokens × $0.10/1M = $0.00025
Turn 2: 2800 tokens × $0.10/1M = $0.00028
Turn 3: 3000 tokens × $0.10/1M = $0.00030
Turn 4: 3200 tokens × $0.10/1M = $0.00032
Total: $0.00115
```

With caching:
```
Turn 1: 2500 tokens × $0.10/1M = $0.00025
Turn 2: (400 new + 2400 cached×50%) × $0.10/1M = $0.00016
Turn 3: (300 new + 2700 cached×50%) × $0.10/1M = $0.000165
Turn 4: (200 new + 3000 cached×50%) × $0.10/1M = $0.00017
Total: $0.000645 (44% savings!)
```

---

## Implementation Code

### Updated System Prompt
```python
SYSTEM_PROMPT = """You are an expert field-service admin who has written 15,000 winning quotes.

🎯 YOUR PRIMARY GOAL: Help the user build their quote through conversation.

⚠️  CONVERSATION RULES:
1. This is a MULTI-TURN conversation - remember what was discussed before
2. When user says "add", "also include", "need" → ADD to existing items
3. When user says "remove", "delete", "take out" → REMOVE specified items  
4. When user says "replace", "change to" → MODIFY specified items
5. DEFAULT BEHAVIOR: ADD new items while PRESERVING existing ones

🚨 CRITICAL RULES - FOLLOW THESE STRICTLY:

1. ⚠️  USE ONLY THE PROVIDED PRICING CATALOG
   - DO NOT create, invent, or make up any items
   - DO NOT modify prices from the catalog
   
2. ⚠️  PRESERVE EXISTING ITEMS unless explicitly asked to remove/change them
   - If existing quote has "Water Heater" and user says "add pipes"
     → Return BOTH water heater AND pipes
   - If user says "remove water heater" → Remove it
   - If user says "change water heater to tankless" → Replace it

[Rest of prompt...]
"""
```

### Frontend State Management
```typescript
// Add to page.tsx state
const [aiConversationHistory, setAiConversationHistory] = useState<
    Array<{ role: string; content: string }>
>([])

// When loading existing quote, load conversation too
const loadExistingQuote = async (id: string) => {
    // ... existing code ...
    
    // Load AI conversation history from database (future)
    const { data: session } = await supabase
        .from('quote_ai_sessions')
        .select('messages')
        .eq('quote_id', id)
        .maybeSingle()
    
    if (session?.messages) {
        setAiConversationHistory(session.messages)
    }
}

// Update handleUpdateWithAI
const handleUpdateWithAI = async () => {
    const response = await fetch('/api/update-quote-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quote_id: savedQuoteId,
            company_id: companyId,
            user_prompt: aiUpdatePrompt,
            existing_items: generatedQuote.line_items,
            conversation_history: aiConversationHistory,  // NEW
            customer_name: customerName,
            customer_address: customerAddress
        })
    })
    
    const data = await response.json()
    
    // Update conversation history
    const newHistory = [
        ...aiConversationHistory,
        { role: "user", content: aiUpdatePrompt },
        { role: "assistant", content: JSON.stringify(data.line_items) }
    ]
    setAiConversationHistory(newHistory)
    
    // Rest of existing code...
}

// Add "Reset Conversation" button
const handleResetConversation = () => {
    setAiConversationHistory([])
    toast.success("AI conversation reset")
}
```

---

## Testing Plan

### Test Cases

1. **Test: Add Items**
   - Generate quote for "water heater installation"
   - Update: "add labor charges"
   - Expected: Water heater + labor
   - Current Bug: Only labor ❌

2. **Test: Remove Items**
   - Generate quote for "water heater + pipes"
   - Update: "remove pipes"
   - Expected: Only water heater

3. **Test: Modify Items**
   - Generate quote for "water heater"
   - Update: "change to tankless water heater"
   - Expected: Tankless water heater (replace)

4. **Test: Multiple Turns**
   - Turn 1: "water heater"
   - Turn 2: "add pipes"
   - Turn 3: "add labor"
   - Turn 4: "remove pipes"
   - Expected: Water heater + labor

5. **Test: Caching**
   - Monitor `cached_tokens` in API response
   - Verify >90% cache hit rate after turn 1

---

## Summary

**Current Issue**: AI removes existing items when adding new ones

**Root Cause**: 
1. No conversation history
2. Ambiguous prompt wording
3. Wrong model (no caching support)

**Recommended Fix** (3-phase approach):
1. ✅ **Phase 1** (NOW): Improve prompt wording
2. ✅ **Phase 2** (THIS WEEK): Switch to caching-enabled model  
3. ✅ **Phase 3** (NEXT SPRINT): Add conversation history

**Expected Results**:
- ✅ AI preserves existing items correctly
- ✅ 50% cost reduction from prompt caching
- ✅ Faster response times
- ✅ Better user experience (conversational)

**Next Steps**:
1. Update `SYSTEM_PROMPT` with better instructions
2. Test with improved prompt
3. If issues persist, implement conversation history
4. Switch model to enable caching
