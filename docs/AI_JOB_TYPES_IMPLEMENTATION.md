# AI-Powered Job Types System - Implementation Guide

**Created:** December 2, 2025  
**Status:** Ready for Implementation  
**Database Migration:** `027_add_job_types_system.sql`

---

## 🎯 VISION SUMMARY

**User's Workflow:**
1. Upload product CSV → AI extracts job types
2. AI creates smart job type catalog with embeddings
3. Customer calls: "My AC is blowing warm air"
4. System uses AI to match description → selects "HVAC Repair - Air Conditioning"
5. User can add/edit custom job types anytime
6. System learns from usage and improves over time

---

## 🗄️ DATABASE SCHEMA

### **New Tables**

#### 1. `job_types` - Company Job Type Catalog
```sql
Columns:
- id (UUID)
- company_id (FK)
- name (e.g., "HVAC Repair - Air Conditioning")
- category (e.g., "HVAC")
- subcategory (e.g., "Repair")
- description (detailed explanation)
- keywords (array: ["AC repair", "air conditioner fix"])
- embedding (vector for AI matching)
- source ('ai_generated' | 'user_defined' | 'csv_import')
- typical_products (array of product names)
- estimated_duration_hours
- estimated_value_range (JSON: {min, max})
- times_used (auto-incremented)
- last_used_at
- is_active

Indexes:
✅ company_id + is_active (fast filtering)
✅ HNSW vector index (semantic search)
✅ GIN index on keywords (text search)
✅ times_used DESC (popularity ranking)
```

#### 2. `job_type_match_log` - AI Accuracy Tracking
```sql
Columns:
- customer_description (what user typed)
- customer_description_embedding (vector)
- ai_suggestions (JSON array of top 5 matches)
- selected_job_type_id (what user actually picked)
- was_ai_correct (boolean)
- lead_id (context)

Purpose:
✅ Track AI accuracy over time
✅ Find similar past descriptions (vector search)
✅ Retrain/improve model
✅ Show "95% accuracy this month" dashboard
```

### **Updated Tables**

```sql
-- Links to job_types table
leads_new.job_type_id      (FK to job_types)
quotes_new.job_type_id     (FK to job_types)
jobs_new.job_type_id       (FK to job_types)

-- Catalog tracking (bonus feature)
quote_items_new.catalog_item_id (FK to catalog_items)
```

### **Auto-Increment Triggers**
When you assign a job_type to lead/quote/job:
```sql
→ job_types.times_used += 1
→ job_types.last_used_at = NOW()
```

---

## 🔄 IMPLEMENTATION WORKFLOW

### **Phase 1: CSV Upload → AI Job Type Generation**

#### Frontend: Upload Page
```tsx
// /settings/job-types/import

<FileUpload 
  accept=".csv"
  onUpload={handleCSVUpload}
/>

const handleCSVUpload = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/job-types/import-csv', {
    method: 'POST',
    body: formData
  })
  
  const { jobTypes, stats } = await response.json()
  // Show: "✅ Generated 47 job types from 312 products"
}
```

#### Backend: CSV Parser + AI Extractor
```python
# Python backend: api/routes/job_types.py

from google import genai
import pandas as pd
import numpy as np

@router.post("/import-csv")
async def import_csv(
    file: UploadFile,
    company_id: str,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    # 1. Parse CSV
    df = pd.read_csv(file.file)
    products = df.to_dict('records')
    
    # 2. Ask AI to generate job types
    prompt = f"""
    Analyze these products and generate a comprehensive job type taxonomy.
    
    Products:
    {json.dumps(products[:100], indent=2)}
    
    Return JSON array of job types:
    [
      {{
        "name": "HVAC Installation - Central Air",
        "category": "HVAC",
        "subcategory": "Installation",
        "description": "Full central air conditioning system installation",
        "keywords": ["AC install", "air conditioner installation", "new HVAC"],
        "typical_products": ["Condenser Unit 3-Ton", "Air Handler", "Thermostat"],
        "estimated_duration_hours": 8,
        "estimated_value_range": {{"min": 3500, "max": 7000}}
      }},
      ...
    ]
    
    Guidelines:
    - Cover all product categories
    - Include Installation, Repair, Maintenance, Inspection
    - Use contractor-friendly terminology
    - Be specific (not just "HVAC" but "HVAC Repair - Furnace")
    """
    
    response = gemini.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.3
        }
    )
    
    job_types = json.loads(response.text)
    
    # 3. Generate embeddings for each job type
    for jt in job_types:
        text_for_embedding = f"{jt['name']} {jt['description']} {' '.join(jt['keywords'])}"
        
        embedding_response = gemini.embed_content(
            model="models/text-embedding-004",
            content=text_for_embedding
        )
        jt['embedding'] = embedding_response['embedding']
    
    # 4. Insert into database
    inserted = []
    for jt in job_types:
        result = db.table('job_types').insert({
            'company_id': company_id,
            'name': jt['name'],
            'category': jt['category'],
            'subcategory': jt['subcategory'],
            'description': jt['description'],
            'keywords': jt['keywords'],
            'embedding': jt['embedding'],
            'source': 'csv_import',
            'typical_products': jt['typical_products'],
            'estimated_duration_hours': jt['estimated_duration_hours'],
            'estimated_value_range': jt['estimated_value_range'],
        }).execute()
        inserted.append(result.data[0])
    
    return {
        "success": True,
        "jobTypes": inserted,
        "stats": {
            "total_job_types": len(inserted),
            "categories": len(set(jt['category'] for jt in job_types))
        }
    }
```

---

### **Phase 2: AI Matching on Lead Creation**

#### Frontend: Lead Form with AI Matching
```tsx
// /leads/new or NewLeadDialog

const [description, setDescription] = useState('')
const [jobTypeSuggestions, setJobTypeSuggestions] = useState([])
const [selectedJobType, setSelectedJobType] = useState(null)

// Debounced AI matching
const handleDescriptionChange = useDebounce(async (text) => {
  if (text.length < 10) return
  
  const response = await fetch('/api/job-types/match', {
    method: 'POST',
    body: JSON.stringify({ description: text })
  })
  
  const { suggestions } = await response.json()
  setJobTypeSuggestions(suggestions)
  
  // Auto-select top match if confidence > 0.85
  if (suggestions[0]?.confidence > 0.85) {
    setSelectedJobType(suggestions[0])
  }
}, 500)

return (
  <div>
    <Textarea
      label="Customer Description"
      value={description}
      onChange={(e) => {
        setDescription(e.target.value)
        handleDescriptionChange(e.target.value)
      }}
      placeholder="Customer says: My AC is blowing warm air and making a loud noise..."
    />
    
    {jobTypeSuggestions.length > 0 && (
      <div className="mt-3">
        <Label>AI Suggestions:</Label>
        {jobTypeSuggestions.map((suggestion, idx) => (
          <button
            key={suggestion.id}
            onClick={() => setSelectedJobType(suggestion)}
            className={cn(
              "flex items-center justify-between p-3 border rounded",
              selectedJobType?.id === suggestion.id && "border-orange-500 bg-orange-50"
            )}
          >
            <div>
              <div className="font-semibold">{suggestion.name}</div>
              <div className="text-sm text-gray-600">{suggestion.category}</div>
            </div>
            <Badge variant={idx === 0 ? "default" : "secondary"}>
              {Math.round(suggestion.confidence * 100)}% match
            </Badge>
          </button>
        ))}
      </div>
    )}
    
    <Button onClick={() => setShowCustomJobTypeForm(true)}>
      + Add Custom Job Type
    </Button>
  </div>
)
```

#### Backend: AI Matching Endpoint
```python
# api/routes/job_types.py

@router.post("/match")
async def match_job_type(
    request: JobTypeMatchRequest,
    company_id: str,
    user_id: str,
    db: Client = Depends(get_db_session),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    description = request.description
    
    # 1. Generate embedding for customer description
    embedding_response = gemini.embed_content(
        model="models/text-embedding-004",
        content=description
    )
    query_embedding = embedding_response['embedding']
    
    # 2. Vector similarity search (cosine similarity)
    # PostgreSQL with pgvector: ORDER BY embedding <=> query_embedding
    result = db.rpc('match_job_types', {
        'query_embedding': query_embedding,
        'company_id': company_id,
        'match_threshold': 0.6,  # Minimum similarity
        'match_count': 5
    }).execute()
    
    suggestions = []
    for row in result.data:
        suggestions.append({
            'id': row['id'],
            'name': row['name'],
            'category': row['category'],
            'subcategory': row['subcategory'],
            'description': row['description'],
            'confidence': 1 - row['distance'],  # Convert distance to similarity
            'times_used': row['times_used']
        })
    
    # 3. Log the match for accuracy tracking
    log_id = db.table('job_type_match_log').insert({
        'company_id': company_id,
        'customer_description': description,
        'customer_description_embedding': query_embedding,
        'ai_suggestions': suggestions,
        'selected_job_type_id': None,  # Will update when user selects
        'user_id': user_id
    }).execute()
    
    return {
        'suggestions': suggestions,
        'log_id': log_id.data[0]['id']
    }

# PostgreSQL function for vector search
"""
CREATE OR REPLACE FUNCTION match_job_types(
  query_embedding vector(1536),
  company_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  subcategory text,
  description text,
  times_used int,
  distance float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jt.id,
    jt.name,
    jt.category,
    jt.subcategory,
    jt.description,
    jt.times_used,
    jt.embedding <=> query_embedding as distance
  FROM job_types jt
  WHERE jt.company_id = match_job_types.company_id
    AND jt.is_active = true
    AND jt.embedding <=> query_embedding < (1 - match_threshold)
  ORDER BY jt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
"""
```

---

### **Phase 3: Custom Job Type Creation**

#### Frontend: Add Custom Form
```tsx
<Dialog>
  <DialogContent>
    <h2>Add Custom Job Type</h2>
    <Input
      label="Name"
      value={name}
      onChange={setName}
      placeholder="e.g., Labor Only - General Handyman"
    />
    <Select label="Category" value={category} onChange={setCategory}>
      <option>HVAC</option>
      <option>Plumbing</option>
      <option>Electrical</option>
      <option>Other</option>
    </Select>
    <Textarea
      label="Description"
      value={description}
      onChange={setDescription}
      placeholder="Describe this type of job..."
    />
    <Input
      label="Keywords (comma-separated)"
      value={keywords}
      onChange={setKeywords}
      placeholder="handyman, odd jobs, miscellaneous"
    />
    <Button onClick={handleCreate}>Create Job Type</Button>
  </DialogContent>
</Dialog>

const handleCreate = async () => {
  await fetch('/api/job-types', {
    method: 'POST',
    body: JSON.stringify({
      name,
      category,
      description,
      keywords: keywords.split(',').map(k => k.trim()),
      source: 'user_defined'
    })
  })
}
```

#### Backend: Create Custom Job Type
```python
@router.post("/")
async def create_job_type(
    request: CreateJobTypeRequest,
    company_id: str,
    gemini: GeminiClient = Depends(get_gemini_client),
    db: Client = Depends(get_db_session)
):
    # Generate embedding
    text = f"{request.name} {request.description} {' '.join(request.keywords)}"
    embedding_response = gemini.embed_content(
        model="models/text-embedding-004",
        content=text
    )
    
    # Insert
    result = db.table('job_types').insert({
        'company_id': company_id,
        'name': request.name,
        'category': request.category,
        'subcategory': request.subcategory,
        'description': request.description,
        'keywords': request.keywords,
        'embedding': embedding_response['embedding'],
        'source': 'user_defined'
    }).execute()
    
    return result.data[0]
```

---

## 📊 ANALYTICS & INSIGHTS

### **Job Type Dashboard**
```tsx
// Show popular job types
const popularJobTypes = await supabase
  .from('job_types')
  .select('*, leads_new(count), quotes_new(count)')
  .eq('company_id', companyId)
  .order('times_used', { ascending: false })
  .limit(10)

// Revenue by job type
const revenueByType = await supabase
  .from('quotes_new')
  .select('job_type_id, job_types(name, category), total')
  .eq('status', 'accepted')
  .gte('created_at', last90Days)
```

### **AI Accuracy Report**
```sql
-- Weekly accuracy
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_matches,
  SUM(CASE WHEN was_ai_correct THEN 1 ELSE 0 END) as correct,
  ROUND(100.0 * SUM(CASE WHEN was_ai_correct THEN 1 ELSE 0 END) / COUNT(*), 2) as accuracy
FROM job_type_match_log
WHERE company_id = $1
GROUP BY week
ORDER BY week DESC;
```

---

## 🚀 DEPLOYMENT CHECKLIST

### **Step 1: Run Migration**
```bash
# In Supabase SQL Editor, run:
supabase/migrations/027_add_job_types_system.sql
```

### **Step 2: Python Backend Endpoints**
```bash
# Add to python-backend/api/routes/
- job_types.py (new file)
  - POST /api/job-types/import-csv
  - POST /api/job-types/match
  - POST /api/job-types
  - GET /api/job-types
  - PATCH /api/job-types/{id}
```

### **Step 3: Frontend Pages**
```bash
# Add pages:
- /settings/job-types (manage job types)
- /settings/job-types/import (CSV upload)

# Update components:
- NewLeadDialog (add AI matching)
- LeadForm (add job type selector)
```

### **Step 4: Test Workflow**
1. Upload sample CSV with products
2. Verify job types generated
3. Create lead with description
4. Check AI suggestions appear
5. Select job type
6. Verify times_used increments

---

## 💡 FUTURE ENHANCEMENTS

1. **Smart Defaults:**
   - "For 'Roof Repair', auto-add typical products"
   
2. **Pricing Intelligence:**
   - "HVAC installs average $4,200 in your area"
   
3. **Seasonal Trends:**
   - "HVAC repair requests increase 40% in summer"
   
4. **Lead Source Correlation:**
   - "Google Ads converts best for Emergency Plumbing"

---

**Status:** Database ready ✅  
**Next Step:** Implement CSV import endpoint (Python)
