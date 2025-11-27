# Quote Audit Trail & AI Update Feature

## Overview
This feature replaces the old "job description" display with a comprehensive audit trail showing all changes made to a quote, plus adds the ability to update quotes using AI prompts.

## What Was Built

### 1. Database Migration ✅
**File**: `/supabase/migrations/007_add_quote_audit_log.sql`

Creates the `quote_audit_log` table to track:
- AI generations and updates
- Manual edits to items
- Item additions/deletions
- Includes RLS policies for security

**Action Required**: Run this SQL in your Supabase dashboard:
1. Go to Supabase → SQL Editor
2. Paste the contents of `007_add_quote_audit_log.sql`
3. Click "Run"

### 2. Backend API Endpoints ✅

#### a. Update Quote with AI API (Next.js)
**File**: `/src/app/api/update-quote-with-ai/route.ts`
- Accepts quote_id, user_prompt, company_id
- Fetches existing quote and items
- Calls Python backend
- Logs changes to audit trail
- Returns updated quote data

#### b. Python Backend Endpoint
**File**: `/python-backend/main.py` (updated)
- New endpoint: `/api/update-quote-with-ai`
- Takes user prompt like "add labor charges" or "add equipment"
- Uses Groq AI to intelligently add/modify/remove items
- Returns full updated quote with change tracking

### 3. UI Component ✅
**File**: `/src/components/audit-trail.tsx`

Beautiful audit trail display with:
- Timeline view of all changes
- Color-coded badges (AI Generated, Manual Edit, Added Item, etc.)
- Expandable details showing what changed
- Relative timestamps ("2h ago", "Just now")
- Icons for different action types

## Next Steps (What You Need to Do)

### Step 1: Apply Database Migration
```sql
-- Run this in Supabase SQL Editor
-- Copy from: /supabase/migrations/007_add_quote_audit_log.sql
```

### Step 2: Restart Python Backend
The backend has new code, so restart it:
```bash
cd python-backend
./start-server.sh
```

### Step 3: Update Quote Editor Page
You need to integrate these components into `/src/app/quotes/new/page.tsx`:

#### a. Add Audit Trail Display
Replace the section that currently shows the job description when editing with the `AuditTrail` component.

#### b. Add "Update with AI" Section
Add a new card below the quote items with:
- Textarea for user prompt ("add labor charges", etc.)
- Button to submit the AI update
- Call `/api/update-quote-with-ai` endpoint
- Refresh quote data after update

### Step 4: Log Quote Generation Events
Update the quote generation flow to log audit entries when:
- A new quote is generated
- User manually adds an item
- User manually edits an item
- User manually deletes an item

## Example Implementation for Quote Editor

Here's the structure you need in `/src/app/quotes/new/page.tsx`:

```typescript
// Add state
const [auditLogs, setAuditLogs] = useState([])
const [aiUpdatePrompt, setAiUpdatePrompt] = useState('')
const [isUpdatingWithAI, setIsUpdatingWithAI] = useState(false)

// Load audit logs
useEffect(() => {
  if (quoteId) {
    loadAuditLogs(quoteId)
  }
}, [quoteId])

const loadAuditLogs = async (id: string) => {
  const { data } = await supabase
    .from('quote_audit_log')
    .select('*')
    .eq('quote_id', id)
    .order('created_at', { ascending: false })
  
  setAuditLogs(data || [])
}

const handleUpdateWithAI = async () => {
  if (!aiUpdatePrompt.trim()) return
  
  setIsUpdatingWithAI(true)
  try {
    const response = await fetch('/api/update-quote-with-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_id: quoteId,
        company_id: companyId,
        user_prompt: aiUpdatePrompt,
      })
    })
    
    const data = await response.json()
    
    // Update quote items with new data
    setGeneratedQuote({
      ...generatedQuote,
      line_items: data.line_items,
      subtotal: data.subtotal,
      total: data.total,
    })
    
    // Reload audit logs
    await loadAuditLogs(quoteId)
    
    setAiUpdatePrompt('')
    toast.success('Quote updated with AI')
  } catch (error) {
    toast.error('Failed to update quote')
  } finally {
    setIsUpdatingWithAI(false)
  }
}
```

### Step 5: Add UI in the JSX

After the quote items display, add:

```tsx
{/* Update with AI */}
{savedQuoteId && (
  <Card>
    <CardHeader>
      <CardTitle>Update with AI</CardTitle>
      <CardDescription>
        Add more items or make changes using natural language
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Textarea
        placeholder='Examples: "add labor charges for 2 hours", "add equipment for HVAC system", "remove permit fee"'
        value={aiUpdatePrompt}
        onChange={(e) => setAiUpdatePrompt(e.target.value)}
        rows={3}
      />
      <Button
        onClick={handleUpdateWithAI}
        disabled={isUpdatingWithAI || !aiUpdatePrompt.trim()}
        className="bg-[#FF6200] hover:bg-[#FF6200]/90"
      >
        {isUpdatingWithAI ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          'Update Quote with AI'
        )}
      </Button>
    </CardContent>
  </Card>
)}

{/* Audit Trail */}
{savedQuoteId && (
  <AuditTrail quoteId={savedQuoteId} entries={auditLogs} />
)}
```

## Testing Instructions

1. **Test Audit Trail**:
   - Edit an existing draft quote
   - Audit trail should show when it was created
   - Add an item manually → should log "Manual Edit"
   
2. **Test AI Update**:
   - In an existing quote, type: "add labor charges for 3 hours"
   - Click "Update Quote with AI"
   - Should add labor items from your catalog
   - Audit trail should show "AI Updated" entry

3. **Test Change Details**:
   - Click the expand button (chevron) on an audit entry
   - Should show exactly what items were added/removed/modified

## Benefits

✅ **Full Transparency**: See exactly how a quote evolved over time
✅ **Iterative Quoting**: Start with AI, then refine with more prompts
✅ **Customer Conversations**: "Customer wants to add X" → type it → done
✅ **Audit Compliance**: Track who changed what and when
✅ **Better AI Context**: AI sees existing items and intelligently adds/modifies

## Files Modified/Created

- ✅ `/supabase/migrations/007_add_quote_audit_log.sql` (new)
- ✅ `/src/app/api/update-quote-with-ai/route.ts` (new)
- ✅ `/python-backend/main.py` (updated - added endpoint)
- ✅ `/src/components/audit-trail.tsx` (new)
- ⏳ `/src/app/quotes/new/page.tsx` (needs your updates)

## What to Tell Me

Once you've applied the migration and restarted the backend, I can help you integrate the components into the quote editor page. Let me know when you're ready!
