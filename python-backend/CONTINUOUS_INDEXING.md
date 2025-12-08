# Continuous Indexing Guide

## Overview
Keep your RAG (Retrieval-Augmented Generation) index fresh by automatically indexing work items when they're created or updated. This ensures the AI always has access to recent pricing and job patterns.

## 🎯 When to Index
Work items are indexed when their status is:
- ✅ `accepted` - Customer accepted the quote
- ✅ `scheduled` - Job is scheduled
- ✅ `completed` - Work is done

**Not indexed:**
- ❌ `draft` - Still being created
- ❌ `archived` - Historical data excluded

---

## 📋 Option 1: API Endpoint (Recommended for Your Setup)

### Implementation
Call the indexing endpoint after saving/updating work items in your frontend:

```typescript
// After creating or updating a work item
async function saveWorkItem(workItem) {
  // 1. Save work item to database
  const { data, error } = await supabase
    .from('work_items')
    .upsert(workItem);
  
  // 2. If status is accepted/scheduled/completed, auto-index
  if (['accepted', 'scheduled', 'completed'].includes(workItem.status)) {
    await fetch('http://localhost:8000/api/index-work-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_item_id: workItem.id,
        company_id: workItem.company_id
      })
    });
  }
  
  return data;
}
```

### API Endpoint
```bash
POST /api/index-work-item
Content-Type: application/json

{
  "work_item_id": "abc-123-def-456",
  "company_id": "company-789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully indexed work item: HVAC Repair",
  "work_item_id": "abc-123-def-456"
}
```

---

## 🤖 Option 2: Background Worker (Best for Production)

### Start the Auto-Indexer
The background worker polls for new work items every 30 seconds:

```bash
# Index for specific company
cd /Users/dipen/code/quotepro/python-backend
source venv/bin/activate
python auto_indexer.py --company-id 1698b6b2-97f4-42b8-bc4a-83534472c822

# Index for all companies
python auto_indexer.py --all
```

### Run as Service (Production)
Create a systemd service or use supervisor:

```ini
# /etc/supervisor/conf.d/quotepro-indexer.conf
[program:quotepro-indexer]
command=/Users/dipen/code/quotepro/python-backend/venv/bin/python auto_indexer.py --all
directory=/Users/dipen/code/quotepro/python-backend
autostart=true
autorestart=true
stderr_logfile=/var/log/quotepro-indexer.err.log
stdout_logfile=/var/log/quotepro-indexer.out.log
```

---

## 🗄️ Option 3: Database Trigger (Most Reliable)

### Setup
Apply the migration to enable automatic indexing:

```bash
# Apply the trigger migration
supabase db push
```

### How It Works
The database trigger sends notifications when work items change status. Your backend listens and indexes automatically.

**Trigger SQL:**
```sql
-- Already created in: supabase/migrations/20251207_auto_index_work_items.sql
-- Triggers on INSERT or UPDATE of work_items.status
-- Sends pg_notify when status changes to accepted/scheduled/completed
```

---

## 📊 Manual Re-indexing

### Full Re-index
When you need to rebuild the entire index:

```bash
cd /Users/dipen/code/quotepro/python-backend
source venv/bin/activate

# Re-index all work items for company
python quote_indexer.py --company-id 1698b6b2-97f4-42b8-bc4a-83534472c822

# Re-index all companies
python quote_indexer.py --all
```

### Catalog Re-indexing
When catalog items change:

```bash
# Re-index catalog
python catalog_indexer.py --company-id 1698b6b2-97f4-42b8-bc4a-83534472c822
```

---

## 🎯 Recommended Setup

For your current setup, I recommend:

1. **API Endpoint** - Call `/api/index-work-item` from your Next.js frontend after saving work items
2. **Background Worker** - Run `auto_indexer.py` in production for redundancy
3. **Manual Re-index** - Run `quote_indexer.py` weekly via cron to catch any missed items

### Cron Job (Weekly Re-index)
```bash
# Add to crontab
0 2 * * 0 cd /Users/dipen/code/quotepro/python-backend && source venv/bin/activate && python quote_indexer.py --all
```

This gives you:
- ✅ Real-time indexing via API calls
- ✅ Background safety net (auto_indexer)
- ✅ Weekly cleanup (cron job)

---

## 🔍 Monitoring

### Check Index Status
```bash
# Count indexed work items
python -c "
from config.database import get_supabase
db = get_supabase()
result = db.table('embeddings').select('id', count='exact').eq('entity_type', 'quote').execute()
print(f'Total indexed work items: {result.count}')
"
```

### Test RAG Retrieval
```bash
# Test if recent work items are searchable
python -c "
from app.agents.tools.rag_tools import retrieve_similar_quotes, set_company_id
set_company_id('1698b6b2-97f4-42b8-bc4a-83534472c822')
result = retrieve_similar_quotes('HVAC repair', limit=3)
print(result)
"
```

---

## 🚨 Troubleshooting

### Work items not appearing in RAG results
1. Check status: `SELECT status FROM work_items WHERE id = 'xxx'`
2. Verify index: `SELECT * FROM embeddings WHERE entity_id = 'xxx'`
3. Re-index manually: `python quote_indexer.py --company-id xxx`

### Background worker not running
1. Check logs: `tail -f /var/log/quotepro-indexer.out.log`
2. Restart: `supervisorctl restart quotepro-indexer`
3. Test manually: `python auto_indexer.py --company-id xxx`

---

## 📝 Next Steps

1. ✅ Add API call to your work item save function
2. ✅ Deploy auto_indexer.py as background service
3. ✅ Set up weekly cron job for re-indexing
4. ✅ Monitor index size and query performance
